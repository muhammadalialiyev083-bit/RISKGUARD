# UzHi / RISKGUARD

Biznes uzluksizligi, BIA, risk, BCP/DRP, simulyatsiya va immutable audit uchun ko‘p tenantli platforma.

## Amaldagi arxitektura

- `backend/` — production backend: Django + Django REST Framework, Session/CSRF, PostgreSQL.
- `frontend/` — React 18 + TypeScript + Vite; Netlify statik frontend `/api/*` so‘rovlarini Django serveriga yo‘naltiradi.
- `backend_fastapi/` — faqat legacy/reference. Production deploy va yangi funksiyalar uchun ishlatilmaydi.

Tenant querylari tashkilot bilan cheklanadi, audit yozuvlari o‘zgarmas. Domain formulalari:

- `RTO ≤ MTPD`
- `risk = likelihood × impact`
- `priority = 0.40·impact + 0.25·urgency + 0.20·risk + 0.15·dependency`
- `backup_interval > RPO` bo‘lsa RPO tafovuti mavjud.

## Lokal ishga tushirish

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
export DEBUG=True
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Boshqa terminalda:

```bash
cd frontend
npm ci
npm run dev
```

## Tekshiruv

```bash
cd frontend
npm test
npx tsc --noEmit
npm run build
npm audit

cd ../backend
DEBUG=True python manage.py check
DEBUG=True python -m pytest --cov=apps --cov=bcms_backend
python -m pip_audit -r requirements.txt
```

CI frontend unit/type/build/audit va isolated Playwright oqimlarini, backend esa Django check/migration/pytest/coverage/pip auditni bajaradi. E2E fixture bazasi production ma’lumotlariga yozmaydi.

## Production environment

Majburiy bazaviy sozlamalar:

```text
DEBUG=False
SECRET_KEY
DATABASE_URL
ALLOWED_HOSTS
CSRF_TRUSTED_ORIGINS
CORS_ALLOWED_ORIGINS
FRONTEND_URL
```

Email reset uchun:

```text
EMAIL_BACKEND
EMAIL_HOST
EMAIL_PORT
EMAIL_HOST_USER
EMAIL_HOST_PASSWORD
EMAIL_USE_TLS
EMAIL_USE_SSL
DEFAULT_FROM_EMAIL
```

Google OIDC Authorization Code + PKCE uchun:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

`GOOGLE_REDIRECT_URI` `/api/v1/auth/google/callback` bilan tugashi va productionda HTTPS bo‘lishi shart. Sirlarni repositoryga kiritmang.

Monitoring:

- liveness: `/api/v1/health`
- readiness: `/api/v1/readiness`
