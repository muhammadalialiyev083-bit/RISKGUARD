# AGENTS.md — BCMS Designer

Modular monolith: `backend/` (Django 3.12 + DRF, Python 3.12) + `frontend/` (React 18 + TS + Vite). DB is SQLite at `backend/db.sqlite3` (`settings.py`); no Postgres needed locally. No git repo, no CI, no lint/typecheck config.

## Entrypoints

- Backend wiring: `backend/bcms_backend/settings.py`, `backend/bcms_backend/urls.py`. One DRF `DefaultRouter` under `api/v1/` + explicit paths for auth, analyses, dashboard.
- Domain apps: `backend/apps/{authentication,organizations,processes,bia,risks,engine,plans,simulation,reports,core}`. `core` owns immutable `AuditLog` + `seed_demo_data` command.
- Frontend is effectively a monolith: `frontend/src/App.tsx` (all tabs), `frontend/src/api/client.ts` (all endpoints), `frontend/src/types/`. Django serves built UI: `TEMPLATES.DIRS` → `frontend/dist`, static → `frontend/dist/assets`.

## Commands (run from indicated dir)

```powershell
cd backend
python manage.py runserver 127.0.0.1:8000
python -m pytest                                   # full suite, 19 tests
python -m pytest tests/test_auth_rbac.py::TestAuthenticationAndAudit::test_login_invalid_credentials_fails -q  # single test
python manage.py seed_demo_data                    # pilot org + demo users (password: Admin123!)
python manage.py migrate                           # after model changes; no custom migration workflow

cd ../frontend
npm run dev     # Vite :5173, proxies /api -> 127.0.0.1:8000
npm run build   # REQUIRED after any frontend change — Django serves frontend/dist
```

Frontend has no test/lint scripts (`dev|build|preview` only). `pytest.ini` sets `DJANGO_SETTINGS_MODULE=bcms_backend.settings`; always run pytest from `backend/`.

## Gotchas agents miss

- **Trailing-slash split:** auth (`api/v1/auth/login|logout|me`), analyses (`api/v1/analyses/priority|evaluate-risk|evaluate-strategy`), dashboard (`api/v1/reports/organization`) have **no** trailing slash; all router resources (`processes/`, `bia/`, `risks/`, `plans/`, …) **require** it. Custom actions: `bia/{id}/approve/`, `plans/{id}/publish/`, `plans/{id}/export_pdf/`, `scenarios/{id}/simulate/` (all POST except PDF export GET).
- **Auth is Session + Basic** (`credentials: 'include'` in `api/client.ts`), not token — despite `rest_framework.authtoken` in `INSTALLED_APPS`. Demo logins: `admin` / `bcms_manager` / `director`, password `Admin123!`.
- **List responses are paginated** (`PAGE_SIZE: 50`): read `response.results`, not the raw array.
- **Multi-tenant isolation by org-filtered querysets:** cross-org access returns **404**, not 403 — this is correct behavior (see `test_tenant_data_isolation_*`). Never "fix" it to 403 or broaden querysets.
- **AuditLog is immutable:** `apps/core/models.py:54-60` raises `PermissionDenied` on update/delete; `AuditLogViewSet` is `ReadOnlyModelViewSet`. Tests assert this — do not add update/delete paths.
- **Enforced domain invariants:** BIA rejects `RTO > MTPD` with 400; risk score = `likelihood × impact` (1–25, thresholds ≤6/7–14/≥15); priority = `0.40·Impact + 0.25·Urgency + 0.20·Risk + 0.15·Dependency`; RPO gap when `backup_interval > rpo_minutes`. Keep these formulas exact.
- `TIME_ZONE = Asia/Tashkent`, `DEBUG = True`, `ALLOWED_HOSTS = ['*']`, `CORS_ALLOW_ALL_ORIGINS = True` — dev-only posture, do not "harden" without being asked.
