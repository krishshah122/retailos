# AI Inventory — Overview

This document summarizes how the AI-driven inventory feature works in this repo, what components it uses, how speech-to-text and image processing are handled, and the key endpoints and environment variables to configure.

## What the feature does
- Accepts inventory updates via: text commands, invoice/photo uploads, voice recordings, and WhatsApp text messages.
- Extracts structured inventory actions (add, update, delete) with product name, quantity, price, and optional SKU.
- Optionally creates `InventoryTransaction` records and updates product inventory via Django ORM.

## High-level architecture

- Frontend: `frontend/src/pages/AIInventoryPage.tsx` — allows upload of photos, audio, or text commands.
- API endpoints (Django):
  - `POST /agent/run` — generic agent run (text).
  - `POST /agent/inventory/photo` — upload invoice/photo (see `agents.views.InventoryPhotoView`).
  - `POST /agent/inventory/voice` — upload voice file (see `agents.views.InventoryVoiceView`).
  - `WhatsApp webhook` — receives WhatsApp messages and dispatches to the same pipeline (`whatsapp.views.process_whatsapp_message`).
- Supervisor: `agents.ai.supervisor.run_supervisor` — builds initial AgentState and calls subgraphs.
- Inventory graph: `agents.ai.graphs.inventory_graph` — core pipeline nodes:
  - `process_voice_or_image` — pre-processing hook (currently noop for Gemini flow)
  - `extract_entities` — uses Google Gemini (via `langchain_google_genai.ChatGoogleGenerativeAI`) to extract structured `InventoryActionsList` from text/image/audio
  - `execute_changes` — applies changes to DB (`Product`, `Inventory`, `InventoryTransaction`)

---

## End-to-End Flows (How Each Input Mode Works)

### 📸 Photo/Invoice Flow (Fully Working)

This is the complete journey when a user uploads a supplier invoice or sales sheet photo:

```
User clicks "Upload document photo" on AI Inventory page
  │
  ▼
Frontend: AIInventoryPage.handlePhoto()
  → reads the selected file
  → creates FormData with the file
  → POST /agent/inventory/photo?store_id=<id>  (multipart/form-data)
  │
  ▼
Backend: InventoryPhotoView.post()  (agents/views.py)
  → reads file bytes from request.FILES
  → base64 encodes the image content
  → calls run_supervisor(store_id, user_id, input_type="image", payload={
      filename, content_type, size, file_b64
    })
  │
  ▼
Supervisor: run_supervisor()  (agents/ai/supervisor.py)
  → creates an AgentRun record (status=RUNNING)
  → builds AgentState dict
  → detects input_type="image" → calls run_inventory_pipeline(state)
  │
  ▼
Pipeline Step 1: process_voice_or_image()
  → Currently a no-op (Gemini handles raw media directly)
  │
  ▼
Pipeline Step 2: extract_entities()  (agents/ai/graphs/inventory_graph.py)
  → Initializes Gemini: ChatGoogleGenerativeAI(model="gemini-flash-latest")
  → Creates structured output extractor: llm.with_structured_output(InventoryActionsList)
  → Builds HumanMessage with:
      - System prompt explaining add vs sell logic
      - Image as base64 data URL: "data:<content_type>;base64,<file_b64>"
  → Gemini Vision reads the invoice/photo and returns structured JSON:
      [{ action_type: "add_product", product_name: "...", quantity: 10, price: 150.0 }, ...]
  │
  ▼
Pipeline Step 3: execute_changes()  (agents/ai/graphs/inventory_graph.py)
  → For each extracted action:
    • add_product → Product.objects.get_or_create() + Inventory += qty + InventoryTransaction
    • update_stock → find Product by name → Inventory += qty + InventoryTransaction
    • delete_product → Product.delete()
  → Returns: { executed_changes: ["Added 10 of Samsung Charger", ...], message: "Database updated successfully." }
  │
  ▼
Supervisor saves AgentRun (status=COMPLETED, output_payload=result)
  │
  ▼
Frontend displays the Agent Response JSON in the UI
```

**Key detail:** Gemini Vision directly reads invoice images — no separate OCR step needed. It extracts product names, quantities, and prices from printed or handwritten invoices. If the image is a "daily sales sheet" or "sold today" list, it sets negative quantities to decrease stock.

---

### 🎤 Voice Flow (Fully Working)

This is the complete journey when a user uploads a voice recording:

```
User clicks "Upload voice recording" on AI Inventory page
  │
  ▼
Frontend: AIInventoryPage.handleVoice()
  → reads the selected audio file
  → creates FormData with the file
  → POST /agent/inventory/voice?store_id=<id>  (multipart/form-data)
  │
  ▼
Backend: InventoryVoiceView.post()  (agents/views.py)
  → reads audio bytes from request.FILES
  → base64 encodes the audio content
  → calls run_supervisor(store_id, user_id, input_type="voice", payload={
      filename, size, file_b64
    })
  │
  ▼
Supervisor → run_inventory_pipeline(state)
  │
  ▼
Pipeline Step 1: process_voice_or_image()
  → No-op (Gemini handles audio natively)
  │
  ▼
Pipeline Step 2: extract_entities()
  → Builds HumanMessage with audio as inline media:
      { type: "media", mime_type: "audio/mp4", data: <base64_audio> }
  → Gemini listens to the audio, transcribes it internally, and extracts structured actions
  → Returns: [{ action_type: "update_stock", product_name: "Boat earphones", quantity: -2 }]
  │
  ▼
Pipeline Step 3: execute_changes()
  → Finds matching product by name (case-insensitive search)
  → Updates inventory quantity and creates transaction record
  │
  ▼
Result returned to frontend and displayed as JSON
```

**Key detail:** Gemini processes audio natively — no separate Whisper/STT step. The audio is sent as base64 inline media and Gemini handles both transcription and intent extraction in one call. Supported audio formats include mp4, m4a, wav, mp3, etc.

---

### ⌨️ Text Command Flow (Fully Working)

```
User types "Sold 2 Boat earphones" and clicks Send
  │
  ▼
Frontend: AIInventoryPage.handleTextSubmit()
  → POST /agent/run  (JSON body: { store_id, input_type: "text", payload: { text: "Sold 2 Boat earphones" } })
  │
  ▼
Backend: AgentRunView.post()  (agents/views.py)
  → validates with AgentRunRequestSerializer
  → calls run_supervisor(store_id, user_id, input_type="text", payload={ text: "..." })
  │
  ▼
Pipeline Step 2: extract_entities()
  → Sends text prompt to Gemini with the user's command
  → Gemini extracts: [{ action_type: "update_stock", product_name: "Boat earphones", quantity: -2 }]
  │
  ▼
Pipeline Step 3: execute_changes()
  → Finds "Boat earphones" in DB (case-insensitive)
  → Decreases inventory by 2, creates InventoryTransaction
  │
  ▼
Result returned to frontend
```

---

## How speech-to-text / media is handled
- The implementation supports two patterns:
  1. Native LLM media ingestion: For Google Gemini, the code formats audio or image bytes into the `HumanMessage` content as `media`/`image_url` and sends directly to the structured-output API. Gemini can accept media and produce structured JSON directly (see `inventory_graph.extract_entities`).
  2. Explicit STT step (alternative): The design docs and some notes mention using Whisper (OpenAI Whisper) or another STT model to transcribe audio first, then pass the transcript to the intent extractor. This is useful if your LLM provider does not support media input.

Notes:
- If using external STT, add a step that sends the uploaded audio to Whisper (or other provider), receives `transcript`, then set `input_type='text'` and `input_text=transcript` before calling `extract_entities`.
- The frontend currently uploads raw file bytes (base64) and backend forwards them to the LLM pipeline.

## Intent extraction and safety
- The pipeline constructs a strongly-typed Pydantic schema `InventoryActionsList` and asks the LLM to return structured output matching that schema. This reduces hallucination and parsing errors.
- The `extract_entities` node uses `ChatGoogleGenerativeAI(...).with_structured_output(InventoryActionsList)` to get typed actions.
- Risk mitigation: When an action would modify data, the supervisor may set `requires_confirmation` and the UI can present proposed changes for merchant approval. See `imp.md` for human-in-the-loop design notes.

## Key environment variables
- `GEMINI_API_KEY` — required for the Gemini structured extractor flow.
- `WHATSAPP_API_TOKEN` and `WHATSAPP_PHONE_ID` — used by `whatsapp.views` to send messages back via Meta Graph API.

## Libraries & tools referenced in code
- Backend Python packages used by the pipeline:
  - `langchain_core` / `langchain_google_genai` — Gemini integration & structured output helpers
  - `pydantic` — schema for structured outputs
  - `Django` ORM — applying inventory changes and `InventoryTransaction` audit log
  - `requests` — sending WhatsApp replies
  - (optional) `openai` / Whisper — referenced in design docs as alternative STT

- Frontend:
  - React + Vite + TypeScript
  - File uploads sent via `api.post('/agent/inventory/...')` from `AIInventoryPage.tsx`

## Endpoints & payloads (quick reference)
- `POST /agent/inventory/photo?store_id=<id>` — multipart form `file` (image)
  - backend: `InventoryPhotoView.post` → base64 the file and call `run_supervisor(..., input_type='image')`

- `POST /agent/inventory/voice?store_id=<id>` — multipart form `file` (audio)
  - backend: `InventoryVoiceView.post` → base64 file and call `run_supervisor(..., input_type='voice')`

- `POST /agent/run` — JSON body `{ store_id, input_type, payload }` for text or generic runs (used by frontend `runAgent`).

## How to verify it works locally
1. Ensure `GEMINI_API_KEY` is set in your `.env` file.
2. Start backend (`python backend/manage.py runserver`) and frontend dev server (`npm run dev`).
3. Use the `AI Inventory` page to:
   - **Photo test:** Upload a sample invoice image → should see extracted products and "Database updated successfully."
   - **Voice test:** Upload a voice recording saying something like "Add 20 Samsung chargers" → should see extracted action and DB update.
  - **Browser recording:** You can record directly in the AI Inventory page (Record Voice button). The frontend captures microphone audio via `MediaRecorder`, packages it as a `File` and uploads to the existing `/agent/inventory/voice` endpoint. The backend now includes `content_type` in the payload so Gemini or any STT/LLM receives the correct MIME type.
   - **Text test:** Type "Sold 2 Boat earphones" → should see stock decrease.
4. Check `AgentRun` records in the admin or database; inspect `node_trace` and `output_payload` for extracted `proposed_changes` and `executed_changes`.

## Status: All 3 modes are fully working ✅
- ✅ **Photo/Invoice** — Frontend uploads image → Backend base64 encodes → Gemini Vision reads → Structured extraction → DB write
- ✅ **Voice** — Frontend uploads audio → Backend base64 encodes → Gemini processes audio natively → Structured extraction → DB write
- ✅ **Text** — Frontend sends text → Gemini extracts intent → DB write
- ✅ **Gemini API Key** is configured in `.env`
- ⚠️ **Note:** The `update_stock` action requires the product to already exist in the database. If the product is not found, it returns "Product not found" instead of creating it.

## Notes & next steps
- If your provider does not accept media in structured prompts, add an STT step (Whisper) before `extract_entities`.
- Consider adding automatic confirmation UI to avoid unintended DB writes.
- Add unit tests for the `extract_entities` node with mocked LLM responses (see `agents/eval/` for evaluation helpers).

## Browser recording / implementation notes

- Frontend approach (implemented in `frontend/src/pages/AIInventoryPage.tsx`):
  - Uses `navigator.mediaDevices.getUserMedia({ audio: true })` and `MediaRecorder` to capture the microphone.
  - On `stop`, the recorded `Blob` is converted to a `File` and uploaded via multipart form to `/agent/inventory/voice?store_id=<id>`.

- Backend change (implemented):
  - `InventoryVoiceView.post` now includes `content_type` in the payload so downstream extractors (Gemini or STT services) receive the correct MIME type.

### Minimal recording snippet (browser)
```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mr = new MediaRecorder(stream);
const chunks = [];
mr.ondataavailable = (e) => chunks.push(e.data);
mr.onstop = async () => {
  const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
  const file = new File([blob], 'rec.webm', { type: blob.type });
  const fd = new FormData();
  fd.append('file', file);
  await fetch(`/agent/inventory/voice?store_id=${storeId}`, { method: 'POST', body: fd });
};
mr.start();
// call mr.stop() to finish
```

---
Document created from repository code (inventory_graph, supervisor, views) and DESIGN notes.

