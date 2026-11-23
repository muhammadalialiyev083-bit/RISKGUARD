# AGENTS.md — UzHi / RISKGUARD

Production tizim `backend/` dagi Django/DRF va `frontend/` dagi React/Vite ilovasidir. `backend_fastapi/` legacy reference; undan production deploy yoki yangi implementatsiya uchun foydalanmang.

## O‘zgarmas qoidalar

- Session authentication + CSRF oqimini saqlang; productionda BasicAuthentication yo‘q.
- Barcha tenant querylari joriy foydalanuvchi tashkilotiga cheklansin. Cross-tenant obyekt 404 qaytarishi kutiladi.
- `AuditLog` immutable va API read-only bo‘lib qoladi.
- Formulalarni o‘zgartirmang: `RTO ≤ MTPD`; risk `likelihood × impact`; priority `0.40/0.25/0.20/0.15`; RPO gap `backup_interval > rpo_minutes`.
- Production bazaga E2E yozmang. Fixture yoki alohida test bazasidan foydalaning.
- Sirlarni kod, test logi yoki hujjatga yozmang.

## Buyruqlar

```bash
cd backend
DEBUG=True python manage.py check
DEBUG=True python -m pytest
DEBUG=True python -m pytest --cov=apps --cov=bcms_backend

cd ../frontend
npm ci
npm test
npx tsc --noEmit
npm run build
```

`pytest.ini` test uchun `bcms_backend.settings_test` ni ishlatadi. Router resurslari trailing slash talab qiladi; auth, analyses va report explicit endpointlari talab qilmaydi. Paginated listlarda `results` maydonini o‘qing.

CI `.github/workflows/verify-deployment.yml` orqali frontend unit/type/build/audit/isolated E2E va backend check/migration/coverage/auditni tekshiradi.
