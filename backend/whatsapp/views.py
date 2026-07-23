import json
import threading
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from core.models import Store
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
    
    # We call the synchronous wrapper
    try:
        final_state = run_inventory_pipeline(state)
        output_msg = final_state.get("output", {}).get("message", "Processed successfully.")
        executed = final_state.get("output", {}).get("executed_changes", [])
        if executed:
            output_msg += "\n\nChanges made:\n- " + "\n- ".join(executed)
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
