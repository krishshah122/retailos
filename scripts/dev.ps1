@echo off
echo Starting RetailOS infrastructure...
docker compose up -d
echo.
echo Backend: cd backend ^&^& .venv\Scripts\activate ^&^& uvicorn app.main:app --reload
echo Frontend: cd frontend ^&^& npm run dev
