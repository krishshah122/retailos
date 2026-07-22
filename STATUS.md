# RetailOS Project Status

## 🟢 Implemented Features (What's working right now)

### 1. Core Platform & Authentication
- **Framework Migration**: Successfully migrated the entire backend from FastAPI to Django & Django REST Framework (DRF) while keeping the exact same API contract for the React frontend.
- **Google OAuth**: Users can sign in using their Google Accounts. The backend automatically provisions a user profile and returns a JWT Bearer token.
- **Store Management**: Users can create new retail stores, search for existing stores, and join stores as staff members. Role-based access control (Owner vs Staff) is scaffolded in the database.

### 2. Inventory Management
- **Product Catalog**: Create, read, update, and delete products. Includes tracking SKU, barcodes, pricing, and supplier info.
- **Stock Tracking**: Maintain real-time quantity levels for every product.
- **Manual Adjustments**: Users can manually adjust inventory quantities (e.g., adding stock, marking damaged goods), which automatically logs an `InventoryTransaction` for audit purposes.

### 3. Credit / "Khata" Ledger
- **Customer Profiles**: Track customers who buy on credit.
- **Credit Entries**: Record unpaid or partially paid transactions against a customer.
- **Payments & Status**: Record payments against credit balances. The system automatically updates the credit status to `Pending`, `Partial`, `Paid`, or `Overdue`.

### 4. Analytics & Dashboard
- **Dashboard Aggregations**: A `/api/v1/analytics/dashboard` endpoint calculates high-level metrics in real-time, including:
  - Total active products
  - Number of low stock items (below reorder level)
  - Total pending credit balance across all customers
  - Today's revenue based on sales transactions

### 5. AI Infrastructure
- **Agent Models**: Database tables (`AgentRun`, `MerchantMemory`, `AuditLog`) are fully set up to track AI interactions, confidence scores, and token usage.
- **LangGraph Scaffold**: The AI routing logic (`supervisor.py`) is wired up to Django synchronously, ready to dispatch requests to specific AI subgraphs (e.g., Inventory Graph).
- **Background Tasks**: Celery is fully configured with Redis to run long-running AI tasks asynchronously (like Invoice processing and notifications).

---

## 🟡 Remaining Features (What needs to be built next)

### 1. Deep AI Integration
- **Voice Commands**: Connect the `/inventory/voice` endpoint to an Audio-to-Text model (like OpenAI Whisper) to parse spoken commands like *"Add 5 packets of milk"*.
- **Invoice OCR Parsing**: Connect the `/inventory/photo` endpoint to a Vision LLM (like GPT-4o or PaddleOCR) to automatically extract line items, prices, and GST from uploaded vendor invoices.
- **Smart Search/Chat**: Implement the `/analytics/query` endpoint so merchants can ask natural language questions (e.g., *"Which products are selling the most this week?"*) and have the LLM generate SQL/Insights via LangChain.

### 2. Automated Workflows (Celery)
- **WhatsApp/SMS Reminders**: Implement the `send_credit_reminder` Celery task to automatically notify customers when their credit is overdue.
- **Demand Forecasting**: Implement the `generate_forecast` task to predict which products will run out of stock based on historical sales velocity.

### 3. Advanced Frontend Features
- **Voice/Camera UI**: Finalize the microphone and camera capture components in the React frontend and stream the payloads to the new Django AI endpoints.
- **Agent Confirmation UI**: Since AI can make mistakes, build a UI where the AI proposes a change (Status: `Awaiting Confirmation`), and the merchant can click "Approve" before the database is actually modified.
