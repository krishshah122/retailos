import json
import os
import threading
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from core.models import Store, User
from agents.ai.state import AgentState
from agents.ai.graphs.inventory_graph import run_inventory_pipeline

# Meta Verification Token (Set this in your Meta App Dashboard or WHATSAPP_VERIFY_TOKEN env var)
VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "retailos_whatsapp_secret_token_123")

def process_whatsapp_message(store_id, text_message, phone_number):
    """
    Runs the AI inventory graph in a background thread and sends the reply via WhatsApp.
    """
    # 1. Run the existing LangGraph pipeline
    state = AgentState(
        store_id=str(store_id),
        input_type="text",
        input_text=text_message,
        input_payload={},
        proposed_changes=[],
        node_trace=[],
    )
    
    # Check for simple greetings/help requests
    clean_text = text_message.strip().lower()
    greetings = ["hi", "hello", "hey", "help", "menu", "start", "info", "who are you", "hi!", "hello!"]
    
    if clean_text in greetings:
        store_obj = Store.objects.filter(id=store_id).first()
        store_name = store_obj.name if store_obj else "your store"
        output_msg = (
            f"Hello! 👋 I am your RetailOS AI Assistant for *{store_name}*.\n\n"
            "Here is what you can ask me directly on WhatsApp:\n\n"
            "📦 *Add Stock*: `Add 10 Rice bags 5kg @ 250`\n"
            "📊 *Check Stock*: `Check stock for Rice`\n"
            "🛍️ *Record Sales*: `Sold 3 Amul Butter`\n"
            "❌ *Delete Product*: `Delete product Amul Butter`\n\n"
            "Try sending one of these commands!"
        )
    else:
        try:
            final_state = run_inventory_pipeline(state)
            executed = final_state.get("output", {}).get("executed_changes", [])
            if executed:
                output_msg = "✅ *Action Completed:*\n- " + "\n- ".join(executed)
            elif final_state.get("error"):
                output_msg = f"⚠️ *Note*: {final_state['error']}"
            else:
                store_obj = Store.objects.filter(id=store_id).first()
                store_name = store_obj.name if store_obj else "your store"
                output_msg = (
                    f"Got your message for *{store_name}*!\n\n"
                    "💡 *Try these commands:*\n"
                    "• `Add 20 Amul Butter @ 55`\n"
                    "• `Check stock for Amul Butter`\n"
                    "• `Sold 5 Amul Butter`\n"
                    "• `Delete product Amul Butter`"
                )
        except Exception as e:
            output_msg = f"Sorry, an error occurred while processing: {str(e)}"
        
    # 2. Send the outbound message back to WhatsApp via Meta API
    import requests
    from django.conf import settings
    import os

    WHATSAPP_TOKEN = os.environ.get("WHATSAPP_API_TOKEN")
    PHONE_ID = os.environ.get("WHATSAPP_PHONE_ID")

    if not WHATSAPP_TOKEN or not PHONE_ID:
        print("MISSING WHATSAPP CREDENTIALS in .env!")
        print(f"Would have sent: {output_msg} to {phone_number}")
        return

    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "text",
        "text": {"body": output_msg},
    }

    try:
        response = requests.post(
            f"https://graph.facebook.com/v19.0/{PHONE_ID}/messages",
            headers=headers,
            json=payload,
            timeout=10
        )
        if response.status_code != 200:
            print(f"Failed to send WhatsApp msg: {response.text}")
        else:
            print(f"Successfully sent WhatsApp msg to {phone_number}")
    except Exception as e:
        print(f"Error sending WhatsApp message: {str(e)}")


@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    def get(self, request, *args, **kwargs):
        """Meta Webhook Verification"""
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")

        if mode and token:
            if mode == "subscribe" and token == VERIFY_TOKEN:
                return HttpResponse(challenge, status=200)
            return HttpResponse("Forbidden", status=403)
        return HttpResponse("Bad Request", status=400)

    def post(self, request, *args, **kwargs):
        """Receives incoming messages from WhatsApp"""
        try:
            body = json.loads(request.body)
            print(f"[WHATSAPP WEBHOOK RECEIVED]: {json.dumps(body)}")
            
            # Parse WhatsApp payload
            if body.get("object") == "whatsapp_business_account":
                for entry in body.get("entry", []):
                    for change in entry.get("changes", []):
                        value = change.get("value", {})
                        if "messages" in value:
                            for msg in value["messages"]:
                                phone_number = msg.get("from") # The sender's phone number
                                
                                # Only process text for this initial implementation
                                if msg.get("type") == "text":
                                    text = msg.get("text", {}).get("body", "")
                                    
                                    # Smart Store Identification: Match sender phone number against store whatsapp_number or phone
                                    clean_phone = ''.join(filter(str.isdigit, str(phone_number)))
                                    last_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
                                    
                                    store = None
                                    if last_10:
                                        store = Store.objects.filter(whatsapp_number__icontains=last_10).first()
                                        if not store:
                                            store = Store.objects.filter(phone__icontains=last_10).first()
                                    
                                    # Fallback for single-store setups / testing
                                    if not store:
                                        store = Store.objects.first()

                                    # Auto-create fallback store if database is empty so WhatsApp AI always works!
                                    if not store:
                                        owner_user = User.objects.first()
                                        if not owner_user:
                                            owner_user = User.objects.create(
                                                email="aniltelecom@retailos.app",
                                                full_name="Anil Telecom Admin"
                                            )
                                        store = Store.objects.create(
                                            owner=owner_user,
                                            name="Anil Telecom",
                                            phone=str(phone_number),
                                            whatsapp_number=str(phone_number)
                                        )

                                    if store:
                                        # Spawn a background thread to process the AI request 
                                        # so we can return 200 OK immediately to Meta
                                        thread = threading.Thread(
                                            target=process_whatsapp_message, 
                                            args=(store.id, text, phone_number)
                                        )
                                        thread.start()
                                    else:
                                        print(f"No store found for incoming message from {phone_number}: {text}")
                                        
            # We MUST return 200 OK immediately so Meta doesn't retry
            return HttpResponse("EVENT_RECEIVED", status=200)
            
        except Exception as e:
            print(f"WhatsApp Webhook Error: {e}")
            return HttpResponse("ERROR", status=500)
