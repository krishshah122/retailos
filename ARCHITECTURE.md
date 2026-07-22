# System Architecture & Tech Stack

RetailOS is a modern, AI-first web application designed to help small and medium merchants manage their store inventory, credit ledgers, and analytics.

---

## 🏗️ Overall System Flow

1. **Client Request**: The React Frontend sends a REST API request (secured via JWT Bearer Token) to the Django Backend.
2. **Synchronous CRUD**: If the request is a standard operation (like fetching products or creating a store), Django directly queries the PostgreSQL database via its ORM and returns the JSON response via DRF Serializers.
3. **AI Agent Invocation**: If the request is an AI operation (like uploading a photo of an invoice or sending a voice command), the Django view calls the LangGraph `supervisor`.
4. **Agent Orchestration**: The `supervisor` determines the intent of the input and routes it to the appropriate sub-graph (e.g., Inventory Graph).
5. **Background Processing**: If the AI task takes too long, or if it's a scheduled job (like Demand Forecasting or sending WhatsApp reminders), the task is pushed to a Redis message queue where a Celery Worker processes it entirely in the background.

---

## 🛠️ Technology Stack Breakdown

### Frontend (Client-Side)
*The frontend is completely decoupled from the backend and communicates strictly via REST APIs.*
- **React 18**: Core UI library.
- **TypeScript**: Used for strict type-checking and catching bugs at compile time.
- **TailwindCSS**: Utility-first CSS framework for rapid and responsive UI styling.
- **ShadCN / Radix UI**: Accessible, unstyled UI components built on top of Tailwind.
- **React Query (TanStack Query)**: Used for data fetching, caching, and state management of backend API responses.

### Backend (Server-Side)
*The backend provides the API, business logic, and database management.*
- **Django 5.1**: The core web framework. Chosen for its robust ORM and rapid development capabilities.
- **Django REST Framework (DRF)**: Builds on top of Django to easily expose JSON endpoints and serialize database models.
- **PyJWT**: Handles encoding and decoding of JSON Web Tokens used for user authentication.
- **google-auth**: Validates the OAuth2 tokens sent by the frontend during the "Sign In with Google" flow.

### Database & Caching
- **PostgreSQL 16**: The primary relational database. Stores all critical business data (Users, Stores, Products, Transactions).
- **Redis 7**: An in-memory data store. Used for two distinct purposes:
  1. Caching heavy Django queries (like dashboard aggregations).
  2. Acting as the Message Broker for Celery.

### Background Workers
- **Celery**: An asynchronous task queue. Used to offload heavy workloads from the main Django web server (e.g., PDF generation, AI processing, sending emails/SMS).

### Artificial Intelligence
- **LangGraph**: Orchestrates complex AI workflows. It allows us to define agents as "nodes" in a graph, making it easy to route user intents (e.g., routing a voice command to the Inventory agent vs the Credit agent).
- **LangChain**: A toolkit used alongside LangGraph to easily communicate with LLM APIs (like OpenAI or Groq) and format prompts.

### Deployment / Infrastructure
- **Docker & Docker Compose**: Used to containerize Postgres and Redis for a seamless local development experience across any operating system.
