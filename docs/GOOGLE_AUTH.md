# Google Sign-In Setup (RetailOS)

You need a **Google OAuth 2.0 Client ID** (Web). This is free.

It is **not** a Google AI / Gemini API key.

---

## 1. Open Google Cloud Console

Go to: [https://console.cloud.google.com/](https://console.cloud.google.com/)

Sign in with your Google account.

---

## 2. Create a project

1. Click the project dropdown (top bar)
2. **New Project**
3. Name: `RetailOS`
4. Click **Create**

---

## 3. Configure OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen**
2. Choose **External** → **Create**
3. Fill:
   - App name: `RetailOS`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. Scopes → **Save and Continue** (defaults are fine)
6. Test users (while in Testing mode):
   - Add **your Gmail** so you can sign in during development
7. **Save and Continue** → **Back to Dashboard**

---

## 4. Create OAuth Client ID

1. **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `RetailOS Web`
5. **Authorized JavaScript origins** (add both):
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
6. **Authorized redirect URIs** (optional for GIS button, but safe to add):
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
7. Click **Create**

Copy the **Client ID**  
It looks like:

```
123456789-abcdefg.apps.googleusercontent.com
```

You do **not** need the Client Secret for this Sign-In flow.

Direct link: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

---

## 5. Put Client ID in env files

### Backend — `backend/.env`

```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

Use the **same** Client ID in both.

---

## 6. Restart apps

```powershell
# Backend
cd backend
.venv\Scripts\activate
pip install google-auth
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm run dev
```

Open http://localhost:5173/login → **Sign in with Google**

---

## Common errors

| Error | Fix |
|-------|-----|
| `origin_mismatch` | Add `http://localhost:5173` under Authorized JavaScript origins |
| `GOOGLE_CLIENT_ID is not configured` | Set it in `backend/.env` and restart uvicorn |
| Button missing / "Configure Google Client ID" | Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` and restart Vite |
| Access blocked (Testing) | Add your Gmail under OAuth consent → Test users |
| DB column errors after schema change | Reset DB: `docker compose down -v` then `docker compose up -d` |

---

## Security note

- Client ID is OK to put in the frontend (public).
- Never put Client Secret in the frontend.
- For production, add your real domain (e.g. `https://app.yourdomain.com`) to Authorized JavaScript origins.
