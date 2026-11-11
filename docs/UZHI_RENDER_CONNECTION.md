# Connect uzhi to the existing Render backend and database

The Netlify frontend calls /api/v1. The redirects file proxies /api/* to the existing adolat backend before the SPA fallback. The backend reads DATABASE_URL when provided and retains SQLite for local development.

## Verification required before production
The managed execution environment is unavailable (repository_access_denied). Dependency installation, backend tests and the required frontend build have not been run for this change. Validate the reconstructed Django dependency manifest before changing the live backend source.

Run:
- cd backend
- python -m pip install -r requirements.txt
- python manage.py check
- python -m pytest
- python manage.py migrate --plan
- cd ../frontend
- npm ci
- npm run build

Compare migration history with the existing production database before deploying this recovered source. Do not reset the database, run seed_demo_data, or reset existing passwords.

## Render settings after validation
Existing service: adolat (srv-db8cntqvcj2c7390v560)
Repository: https://github.com/muhammadalialiyev083-bit/RISKGUARD
Branch: main after the reviewed changes are merged
Root Directory: backend
Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput
Start Command: python manage.py migrate --noinput && gunicorn bcms_backend.wsgi:application

Preserve DATABASE_URL and SECRET_KEY already stored in Render. Set DEBUG=False.
CSRF_TRUSTED_ORIGINS=https://uzhi.netlify.app,https://safeguardity.netlify.app,https://adolat-99us.onrender.com
CORS_ALLOWED_ORIGINS=https://uzhi.netlify.app,https://safeguardity.netlify.app

Changing this existing service's repository is not exposed by the connected Render MCP tools. Use the existing service's Settings page, keeping its URL and existing environment variables.

## Netlify
Base directory: frontend
Build command: npm run build
Publish directory: dist

After deployment, /api/v1/auth/csrf must return JSON with csrfToken, not index.html. Verify login, an authenticated request, logout, and login again.
