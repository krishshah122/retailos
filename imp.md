# RetailOS Interview Preparation Guide

This guide contains 30 important interview questions and answers based on your RetailOS project, focusing on the tech stack, architecture, and scenario-based problem-solving.

## System Architecture & Design

**1. Can you describe the overall architecture of RetailOS?**
*Answer:* RetailOS is an AI-powered operating system for small retail businesses. It uses a modern client-server architecture. The frontend is built with React, TypeScript, and Tailwind, communicating via RESTful APIs to a backend built in Django and Django REST Framework. PostgreSQL is the primary database. We use Celery and Redis for asynchronous background tasks, and integrate LangGraph and LangChain for AI pipelines (like voice inventory and invoice parsing). 

**2. Why did you choose to migrate the backend from FastAPI to Django?**
*Answer:* While FastAPI is great for high-performance, asynchronous endpoints (especially for AI), Django provides a more robust, "batteries-included" ecosystem. Django's ORM, built-in admin panel, and authentication system accelerated development for our core CRUD features like inventory management, user roles, and the credit ledger. We integrated LangGraph into Django to handle the AI orchestration while benefiting from Django's stability.

**3. How do you handle Role-Based Access Control (RBAC) in your application?**
*Answer:* We handle RBAC at the backend using Django's permission classes. We have roles like `Owner` and `Staff` for a store. The backend validates the JWT token provided by Google OAuth, identifies the user, and checks their role against the store they are trying to access. If a Staff member tries to access an Owner-only endpoint (like deleting a store), the API returns a 403 Forbidden response.

**4. How does the system handle real-time inventory updates and avoid race conditions?**
*Answer:* We use database transactions and row-level locking (e.g., `select_for_update` in Django ORM) when updating stock quantities. This ensures that if two staff members try to update the stock of the same item simultaneously, the database locks the row for the first request, processes it, and then allows the second request to proceed, preventing data inconsistency.

**5. How did you design the database schema for the Credit/Khata ledger?**
*Answer:* The ledger relies on a `Customer` table linked to a `CreditEntry` table. Each entry records the transaction amount, amount paid, and status (Pending, Partial, Paid, Overdue). There is also a `Payment` table to track individual installments. The current balance is a calculated field aggregating total entries minus total payments for a specific customer.

## Backend (Django, Celery, PostgreSQL, Redis)

**6. What is the role of Celery and Redis in your stack?**
*Answer:* Celery is our distributed task queue, and Redis acts as its message broker and state backend. We use them to offload long-running or computationally expensive tasks from the main Django request-response cycle. For example, processing large invoices via OCR, generating demand forecasts, or sending bulk WhatsApp reminders are handled asynchronously by Celery workers.

**7. How do you secure your Django REST Framework APIs?**
*Answer:* We use JWT (JSON Web Tokens) for authentication. When a user logs in via Google OAuth, the backend issues an access token and a refresh token. The frontend includes the access token in the `Authorization` header of API requests. We also implement CORS policies, rate limiting, and use environment variables for secrets.

**8. Explain the difference between `makemigrations` and `migrate` in Django.**
*Answer:* `makemigrations` scans the Django `models.py` files and generates migration scripts (Python files) that represent the changes made to the database schema. `migrate` actually executes those scripts against the database, applying the changes to the SQL tables.

**9. How would you optimize a slow database query in Django?**
*Answer:* First, I would use Django Debug Toolbar or logging to identify the slow query. Common optimizations include using `select_related()` (for foreign keys) or `prefetch_related()` (for many-to-many/reverse foreign keys) to solve the N+1 query problem. I would also ensure appropriate database indexes exist for columns frequently used in `filter()` or `order_by()`.

**10. What happens if the Redis server goes down?**
*Answer:* If Redis goes down, Celery workers won't be able to receive new tasks, and asynchronous jobs (like notifications or heavy AI processing) will fail to queue. The main Django application would still function for synchronous requests (like basic CRUD operations), assuming caching isn't strictly dependent on Redis, but any feature relying on background processing would degrade or fail until Redis is restored.

**11. How do you track inventory history for auditing?**
*Answer:* We implemented an `InventoryTransaction` model. Instead of just updating the quantity field on the `Product` model, every stock addition, deduction, or adjustment creates an immutable `InventoryTransaction` record. This provides a complete audit trail of who changed the stock, when, and by how much.

## Frontend (React, TypeScript, React Query)

**12. Why did you choose React Query for data fetching instead of standard `useEffect`?**
*Answer:* React Query provides powerful features out-of-the-box that are difficult to build from scratch with `useEffect`, such as caching, background data synchronization, automatic retries on failure, pagination, and optimistic updates. It significantly reduces boilerplate code and improves the user experience by keeping the UI fast and consistent.

**13. What is the benefit of using TypeScript in your React application?**
*Answer:* TypeScript adds static typing to JavaScript. It catches type errors at compile time rather than runtime, which is crucial for a complex app like RetailOS. It provides better autocompletion in the IDE, makes the codebase self-documenting, and ensures that the frontend correctly interfaces with the backend API contracts.

**14. How do you manage global state in your React app?**
*Answer:* We try to keep state as close to where it's needed as possible. Server state (data from the backend) is entirely managed by React Query. For UI state (like dark mode, sidebar toggles, or authenticated user info), we use React Context or a lightweight state management library like Zustand. 

**15. Explain how you would implement "Optimistic Updates" when a user marks a credit as paid.**
*Answer:* With React Query's `useMutation`, before the API call finishes, we instantly update the cached ledger data to reflect the "paid" status so the UI updates immediately. If the API call fails, we roll back the cache to its previous state and show an error notification to the user.

**16. How do you optimize the performance of a large list of inventory items in React?**
*Answer:* If the list is extremely large, I would implement virtual scrolling (e.g., using `react-window` or `react-virtuoso`), which only renders the DOM nodes currently visible on the screen. Additionally, I would ensure pagination or infinite scrolling is implemented at the API level so we don't load the entire database into the browser.

## AI & Machine Learning (LangGraph, Whisper, OCR)

**17. What is LangGraph, and how does it differ from standard LangChain?**
*Answer:* LangChain is great for building linear or simple chains of LLM calls. LangGraph allows us to build cyclical, stateful, multi-actor AI agent workflows using a graph structure. In RetailOS, we use LangGraph's `supervisor.py` to intelligently route user requests (e.g., routing an image to the Vision node or a voice command to the Inventory node) while maintaining memory across the interaction.

**18. How do you handle errors or hallucinations in your AI agents?**
*Answer:* We mitigate this by keeping a "human in the loop." When the AI proposes a destructive action (like updating stock or changing a price), the backend creates a pending action with status `Awaiting Confirmation`. The UI presents this to the merchant, who must explicitly click "Approve" before the database is modified.

**19. Can you explain the workflow for the Voice Inventory feature?**
*Answer:* The user records audio in the React frontend. The audio blob is sent to the Django backend, which forwards it to an Audio-to-Text model like OpenAI Whisper. The resulting transcript is passed to our LangGraph Inventory Agent. The agent extracts intents (e.g., "Add", "Remove"), quantities, and product names, maps them to database SKUs, and generates a pending `InventoryTransaction`.

**20. How will the Invoice OCR Parsing work?**
*Answer:* A user uploads an invoice image. Celery picks up the task and sends the image to a Vision LLM (like GPT-4o or a specialized OCR model). The model extracts tabular data (items, quantities, prices, GST). The agent then structures this as JSON, matches items to the existing catalog, and queues inventory additions.

**21. How do you prevent the Smart Search agent from executing malicious SQL queries?**
*Answer:* We do not allow the LLM to execute raw SQL directly on the primary database. We provide the LLM with a read-only database user credential. Additionally, we use LangChain's SQL toolkit to validate queries, and we restrict the schema visibility so the LLM only knows about safe tables (like sales and inventory), not sensitive tables (like users and passwords).

## Scenario & Behavioral Questions

**22. Scenario: A merchant complains that stock levels are mismatching. They claim they added 10 items, but the system shows only 5. How do you debug this?**
*Answer:* First, I would check the `InventoryTransaction` audit log for that specific SKU. This would show every addition, sale, or manual adjustment, including timestamps and user IDs. If the log shows they only added 5, it's a user error. If it shows 10, but the current state is 5, I'd look for an intermediate deduction (e.g., a sale or another staff member adjusting it). If data is truly corrupted, I would investigate potential race conditions in the database update logic.

**23. Scenario: The Celery queue is backing up, and invoice processing is taking hours instead of minutes. What do you do?**
*Answer:* I would monitor the queue via a tool like Flower. If tasks are taking too long, I'd check the logs of the Vision LLM API to see if the bottleneck is network latency or rate limits. Solutions include adding more Celery worker nodes, optimizing the OCR payload, upgrading the third-party API tier, or splitting the invoice processing into smaller, parallel sub-tasks.

**24. Scenario: A new developer joins the team and accidentally runs `migrate` on production with untested migration files. How do you handle it?**
*Answer:* Immediate mitigation involves stopping the application to prevent data corruption. If the migration dropped or altered columns destructively, I would restore the database from the most recent continuous backup (e.g., Supabase point-in-time recovery). Post-incident, I would enforce CI/CD pipelines so migrations are applied automatically via scripts only after peer review, removing direct database access from individual developers.

**25. Scenario: The React dashboard is taking too long to load on older mobile phones. How would you optimize it?**
*Answer:* I would implement code splitting and lazy loading (using `React.lazy`) so we only load the JavaScript necessary for the initial view. I would optimize image assets, ensure we are using gzip/brotli compression on the server, and utilize React Query to aggressively cache data so subsequent visits don't require network calls.

**26. How do you ensure the privacy of customer data in the Khata ledger?**
*Answer:* Data is isolated by the `Store` context. All queries are filtered by `store_id` based on the authenticated user's store. We use HTTPS to encrypt data in transit, and the database handles encryption at rest. 

**27. What was the most challenging technical hurdle in building RetailOS?**
*Answer:* *(Tailor this to your experience. Example:)* Orchestrating the LangGraph AI workflows within a synchronous Django environment was challenging. We had to ensure that the Django request didn't timeout while the LLM was "thinking." We solved this by pushing heavy AI tasks to Celery and using WebSockets or polling on the frontend to get the final agent response.

**28. How does your system handle a scenario where a user goes offline while making a sale?**
*Answer:* Currently, RetailOS is heavily dependent on a network connection. However, we are looking into PWA (Progressive Web App) features and using Service Workers combined with React Query's offline mutations to cache actions locally, syncing them to the server once the connection is restored.

**29. Why did you choose Supabase over setting up your own PostgreSQL instance?**
*Answer:* Supabase gives us a fully managed PostgreSQL database with connection pooling (PgBouncer) out-of-the-box, which is crucial for scaling serverless functions or multiple Celery workers. It also provides integrated blob storage for our invoice and photo uploads, reducing the number of external services we have to manage.

**30. Where do you see the architecture of RetailOS evolving as the user base grows?**
*Answer:* As we scale, we might break down the monolithic Django backend into microservices, perhaps isolating the AI Agents into their own FastAPI cluster optimized for GPU workloads. We would implement robust caching with Redis for read-heavy endpoints, and potentially move to a read-replica database setup for the analytics dashboard to prevent heavy BI queries from slowing down the primary transactional database.
