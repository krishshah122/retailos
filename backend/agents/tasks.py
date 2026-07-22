from celery import shared_task


@shared_task(name="retailos.send_credit_reminder")
def send_credit_reminder(credit_id: str, store_id: str) -> dict:
    # TODO: integrate WhatsApp / push notification via MCP
    return {"status": "scheduled", "credit_id": credit_id}


@shared_task(name="retailos.generate_forecast")
def generate_forecast(store_id: str) -> dict:
    # TODO: demand forecasting job
    return {"status": "completed", "store_id": store_id}


@shared_task(name="retailos.process_invoice")
def process_invoice(invoice_id: str) -> dict:
    # TODO: OCR + LLM invoice parsing
    return {"status": "processing", "invoice_id": invoice_id}
