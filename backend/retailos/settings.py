import environ
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
    APP_ENV=(str, "development"),
    APP_NAME=(str, "RetailOS"),
)
try:
    environ.Env.read_env(os.path.join(BASE_DIR, ".env"))
except Exception:
    pass

# ── Core ──────────────────────────────────────────────
APP_NAME = env("APP_NAME", default="RetailOS")
APP_ENV = env("APP_ENV", default="development")
DEBUG = env.bool("DEBUG", default=True)

SECRET_KEY = env("SECRET_KEY", default="change-me-in-production")

ALLOWED_HOSTS = ["*"]

# ── Apps ──────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Project apps
    "core",
    "inventory",
    "credit",
    "analytics",
    "agents",
    "whatsapp",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "retailos.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "retailos.wsgi.application"
ASGI_APPLICATION = "retailos.asgi.application"

# ── Database ──────────────────────────────────────────
DATABASES = {
    "default": env.db("DATABASE_URL", default="postgresql://retailos:retailos@127.0.0.1:5432/retailos")
}

# ── Auth ──────────────────────────────────────────────
AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = []

# ── JWT ───────────────────────────────────────────────
JWT_SECRET_KEY = env("SECRET_KEY", default="change-me-in-production")
JWT_ALGORITHM = env("ALGORITHM", default="HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = env.int("ACCESS_TOKEN_EXPIRE_MINUTES", default=15)
JWT_REFRESH_TOKEN_EXPIRE_DAYS = env.int("REFRESH_TOKEN_EXPIRE_DAYS", default=7)

# ── Google OAuth ──────────────────────────────────────
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")

# ── AI ────────────────────────────────────────────────
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
GROQ_API_KEY = env("GROQ_API_KEY", default="")
LANGSMITH_API_KEY = env("LANGSMITH_API_KEY", default="")
LANGSMITH_PROJECT = env("LANGSMITH_PROJECT", default="retailos")

# ── Storage ───────────────────────────────────────────
SUPABASE_URL = env("SUPABASE_URL", default="")
SUPABASE_KEY = env("SUPABASE_KEY", default="")
STORAGE_BUCKET = env("STORAGE_BUCKET", default="retailos-uploads")

# ── Redis / Celery ────────────────────────────────────
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

# ── CORS ──────────────────────────────────────────────
import json
from corsheaders.defaults import default_headers, default_methods

CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL", default=True)

cors_env = os.getenv("CORS_ORIGINS", "")
if cors_env:
    try:
        parsed = json.loads(cors_env)
        if isinstance(parsed, list):
            CORS_ALLOWED_ORIGINS = parsed
        else:
            CORS_ALLOWED_ORIGINS = [str(parsed)]
    except Exception:
        CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://retailos-iota.vercel.app",
    ]

if "https://retailos-iota.vercel.app" not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append("https://retailos-iota.vercel.app")

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers) + [
    "authorization",
    "content-type",
    "x-csrftoken",
]

CORS_ALLOW_METHODS = list(default_methods)

# ── DRF ───────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "core.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "UNAUTHENTICATED_USER": None,
}

# ── i18n ──────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Static ────────────────────────────────────────────
STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
