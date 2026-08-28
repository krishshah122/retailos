"""LangGraph subgraph: inventory operations (photo, voice, manual)."""

import base64
from pydantic import BaseModel, Field
from typing import Literal, List, Optional
from django.conf import settings
from langchain_core.messages import HumanMessage

from agents.ai.state import AgentState
from inventory.models import Product, Inventory, InventoryTransaction

# --- LangChain Schemas ---

class InventoryAction(BaseModel):
    action_type: Literal["add_product", "update_stock", "delete_product", "unknown"] = Field(
        description="The type of action to perform. 'add_product' for new inventory/invoices, 'update_stock' for selling or adding to existing products, 'delete_product' for removing products."
    )
    product_name: str = Field(description="The name of the product")
    quantity: int = Field(default=0, description="The quantity to add or subtract. Positive for adding stock, negative for selling stock.")
    price: float = Field(default=0.0, description="The unit price of the product, if applicable.")
    category: Optional[str] = Field(default=None, description="The category of the product (e.g., mobile, electronics, accessories).")
    sku: Optional[str] = Field(default=None, description="SKU or Barcode if visible.")

class InventoryActionsList(BaseModel):
    actions: List[InventoryAction] = Field(description="A list of inventory actions extracted from the input.")

# --- Nodes ---

def process_voice_or_image(state: AgentState) -> AgentState:
    """Pre-process audio/image to text before extraction."""
    return state


def _get_llm(input_type: str):
    """Get the appropriate LLM based on input type.
    - Text: Use Groq (llama-3.3-70b) — ultra-fast, generous free tier
    - Image: Use Gemini — supports vision/image input
    """
    if input_type == "image" and settings.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0, api_key=settings.GEMINI_API_KEY)
    
    if settings.GROQ_API_KEY:
        from langchain_groq import ChatGroq
        return ChatGroq(model="openai/gpt-oss-20b", temperature=0, api_key=settings.GROQ_API_KEY)
    
    if settings.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0, api_key=settings.GEMINI_API_KEY)
    
    return None


def extract_entities(state: AgentState) -> AgentState:
    """Extract structured intents from text or images using Groq (text) or Gemini (images)."""
    if state.get("error"):
        return state
        
    input_type = state.get("input_type")
    payload = state.get("input_payload", {})
    trace = state.get("node_trace", [])
    
    llm = _get_llm(input_type)
    if not llm:
        return {**state, "error": "No API key configured. Add GROQ_API_KEY or GEMINI_API_KEY to .env"}
        
    structured_llm = llm.with_structured_output(InventoryActionsList)

    
    prompt_text = (
        "You are an AI assistant for a retail store managing inventory. "
        "Extract the inventory actions from the following input. If the input is an audio file or an invoice image, "
        "analyze it carefully to determine the product names, quantities, and prices. "
        "CRITICAL INSTRUCTION: If the input is a daily sales sheet, a handwritten note of things 'sold today', or any list of sales, "
        "you MUST set action_type to 'update_stock' and the quantity MUST be negative (e.g. -5) to decrease the stock. "
        "If it is a purchase invoice or 'received' items, set action_type to 'add_product' or 'update_stock' with a positive quantity."
    )
    
    content = [{"type": "text", "text": prompt_text}]
    
    if input_type == "text":
        content.append({"type": "text", "text": f"Input: {state.get('input_text')}"})
    elif input_type == "image":
        file_b64 = payload.get("file_b64")
        if file_b64:
            content.append({
                "type": "image_url", 
                "image_url": f"data:{payload.get('content_type', 'image/jpeg')};base64,{file_b64}"
            })
    elif input_type == "voice":
        file_b64 = payload.get("file_b64")
        if file_b64:
            # Note: For strict langchain-google-genai audio support, we format it properly
            # The mime_type will default to audio/m4a which is common for web recordings
            content.append({
                "type": "media",
                "mime_type": payload.get("content_type", "audio/mp4"),
                "data": file_b64
            })
            
    try:
        message = HumanMessage(content=content)
        print(f"[extract_entities] Sending to Gemini: input_type={input_type}, content_parts={len(content)}")
        result = structured_llm.invoke([message])
        actions = [a.dict() for a in result.actions]
        print(f"[extract_entities] Gemini returned {len(actions)} actions: {actions}")
    except Exception as e:
        actions = []
        state["error"] = f"LLM Extraction failed: {str(e)}"
        print(f"[extract_entities] ERROR: {str(e)}")
        
    trace.append({"node": "extract_entities", "actions": actions})
    return {**state, "proposed_changes": actions, "node_trace": trace}


def execute_changes(state: AgentState) -> AgentState:
    """Directly modify the database via Django ORM."""
    if state.get("error"):
        return {**state, "output": {"message": state["error"]}, "node_trace": state.get("node_trace", [])}
        
    store_id = state.get("store_id")
    actions = state.get("proposed_changes", [])
    trace = state.get("node_trace", [])
    
    executed_changes = []
    
    for action in actions:
        action_type = action.get("action_type")
        product_name = action.get("product_name")
        qty = action.get("quantity", 0)
        price = action.get("price", 0.0)
        
        category = action.get("category")
        
        if not product_name:
            continue
            
        try:
            if action_type == "add_product":
                product, created = Product.objects.get_or_create(
                    store_id=store_id, 
                    name__iexact=product_name,
                    defaults={
                        "name": product_name,
                        "sell_price": price,
                        "cost_price": price,
                        "category": category,
                    }
                )
                if not created and category:
                    product.category = category
                    product.save(update_fields=['category'])
                inventory_obj, _ = Inventory.objects.get_or_create(product=product)
                inventory_obj.quantity += qty
                inventory_obj.save()
                    
                InventoryTransaction.objects.create(
                    store_id=store_id,
                    product=product,
                    delta=qty,
                    quantity_after=inventory_obj.quantity,
                    source="voice" if state.get("input_type") == "voice" else "text",
                    note="AI Auto-Update"
                )
                executed_changes.append(f"Added {qty} of {product_name}")
                
            elif action_type == "update_stock":
                product = Product.objects.filter(store_id=store_id, name__icontains=product_name).first()
                if product:
                    if category:
                        product.category = category
                        product.save(update_fields=['category'])
                    inventory_obj, _ = Inventory.objects.get_or_create(product=product)
                    inventory_obj.quantity += qty
                    inventory_obj.save()
                    
                    InventoryTransaction.objects.create(
                        store_id=store_id,
                        product=product,
                        delta=qty,
                        quantity_after=inventory_obj.quantity,
                        source="voice" if state.get("input_type") == "voice" else "text",
                        note="AI Auto-Update"
                    )
                    executed_changes.append(f"Updated stock for {product_name} by {qty}")
                else:
                    executed_changes.append(f"Product '{product_name}' not found in database to update.")
                    
            elif action_type == "delete_product":
                product = Product.objects.filter(store_id=store_id, name__icontains=product_name).first()
                if product:
                    product.delete()
                    executed_changes.append(f"Deleted product {product_name}")
                    
        except Exception as e:
            executed_changes.append(f"Error on {product_name}: {str(e)}")

    trace.append({"node": "execute_changes", "executed": executed_changes})
    return {**state, "output": {"executed_changes": executed_changes, "message": "Database updated successfully."}, "node_trace": trace}


def run_inventory_pipeline(state: AgentState) -> AgentState:
    """Simple synchronous wrapper for the pipeline."""
    state = process_voice_or_image(state)
    state = extract_entities(state)
    state = execute_changes(state)
    return state
