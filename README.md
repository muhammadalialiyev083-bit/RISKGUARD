# BCMS Designer — Biznes Uzluksizligini Boshqarish Tizimi (Full-Stack FastAPI)

Farg‘ona davlat texnika universiteti magistrlik dissertatsiyasi doirasidagi dasturiy platforma.  
**Mavzu:** Tashkilotlarda biznes uzluksizligini boshqarish tizimini loyihalash dasturini ishlab chiqish  
**Magistrant:** Aliyev Muhammadali G‘ulomjon o‘g‘li  
**Ilmiy rahbar:** Turdimatov Mamirjon Mirzayevich  
**Mutaxassislik:** 70610302 – Axborot xavfsizligi  

---

## 1. 🏗️ Texnologik Stek va Arxitektura

- **Arxitektura:** Modular RESTful Full-Stack Platform
- **Backend:** Python 3.12 + **FastAPI** (yuqori tezlikdagi asinxron API)
- **Database:** **PostgreSQL** (ishlab chiqarish) / SQLite (portativ testlar)
- **ORM:** **SQLAlchemy 2.0** (Mapped Declarative modellari)
- **Migratsiyalar:** **Alembic** (versiyalangan sxema o'zgarishlari)
- **API Hujjatlashuvi:** **Swagger UI** (`/api/docs`) va **ReDoc** (`/api/redoc`)
- **Autentifikatsiya:** Xavfsiz sessiyalar + Httponly Cookie + RBAC ruxsatlar modeli
- **Frontend:** React 18 + TypeScript + Vite + Lucide Icons (Dark/Light Enterprise UI)
- **Graf tahlili:** NetworkX (Directed Dependency Graph & Cascade Disruption)
- **Hisobotlar va Eksport:**
  - **PDF Eksport:** ReportLab (BCP/DRP rejalari formati)
  - **Excel Eksport:** OpenPyXL (BCP qadamlari va ko'p varaqli Tashkilot Konsolidatsiyalangan Hisoboti)

---

## 2. 📋 Tizim Modullari (12 ta asosiy modul)

1. **FR-01: Kirish va Rollar (RBAC)** — 6 ta rol (`ADMIN`, `BCMS_MANAGER`, `PROCESS_OWNER`, `RISK_ANALYST`, `APPROVER`, `AUDITOR`).
2. **FR-02: Tashkilot Profili** — Bo'limlar, filiallar, xizmatlar, maksimal ruxsat etilgan yo'qotish ($L_{\max}$) va vaqt mintaqasi.
3. **FR-03: Jarayonlar Reestri** — Kritiklik (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), xizmatlar, holati va mas'ul egalari.
4. **FR-04: Aktivlar va Bog'liqliklar** — Server, Tizim, Xodim, Provayder va $G=(V, E)$ yo'naltirilgan bog'liqlik graflari.
5. **FR-05: BIA So'rovnomasi** — $RTO \le MTPD$ qat'iy mantiqiy tekshiruvi (buzilsa 400 xatolik), $RPO$ va zaxiralash oraliqlari, Rahbariyat tasdiqlash oqimi (`/approve/`).
6. **FR-06: Risk Reestri & 5x5 Matritsa** — $\text{Likelihood} \times \text{Impact} = \text{RiskScore}$ (1..25), qoldiq risk va risk kamayishi $\Delta R$.
7. **FR-07: Hisoblash Yadrosi** — Dissertatsiya tadqiqot gipotezasi formulasi:  
   $$\text{Priority} = 0.40 \cdot \text{Impact\_norm} + 0.25 \cdot \text{Urgency\_norm} + 0.20 \cdot \text{Risk\_norm} + 0.15 \cdot \text{Dependency\_norm}$$  
   Hujjat 10.1 algoritmi: $\text{rpo\_gap}$ aniqlash va xulosalar generatsiyasi.
8. **FR-08: Tiklash Strategiyalari** — RTO/RPO shartlariga muvofiq zaxiralash va tiklash variantlarini baholash.
9. **FR-09: BCP/DRP Rejalari** — Versiyalangan rejalar, qadamlar ketma-ketligi, rasmiy e'lon qilish, **1-klikli PDF va Excel eksport**.
10. **FR-10: Ssenariy Simulyatsiyasi** — Nosoz aktivlar bo'yicha zanjirsimon ta'sir tahlili (NetworkX graf tahlili, RTO buzilishlari va rejasiz jarayonlarni aniqlash).
11. **FR-11: Dashboard** — Tashkilot bo'yicha kritik jarayonlar, yuqori xavflar, rejasi yo'q jarayonlar va RPO buzilishlari statistikasi + **Tashkilot Excel Hisoboti**.
12. **FR-12: Audit Jurnali** — O'zgartirib yoki o'chirib bo'lmaydigan (**Immutable Ledger**) xavfsizlik jurnali: actor, role, action, entity, timestamp, IP.

---

## 3. 🧪 Qabul Sinovlari Natijalari (24 ta test, 100% PASSED)

Pytest testlar to'plami barcha domain invariantlari va xavfsizlik qoidalarini avtomatik tekshiradi:

```powershell
cd c:\dissertatsiya\backend_fastapi
python -m pytest tests/ -v
```

| Modul | Sinovlar | Natija |
|---|---|---|
| **Auth (FR-01)** | To'g'ri/noto'g'ri login, getMe, sessiya tozalash va logout | **6 PASSED** |
| **BIA (FR-05)** | Ro'yxat, RTO <= MTPD tekshiruvi (buzilsa 400), APPROVER ruxsati | **4 PASSED** |
| **Engine (FR-07, 08)** | 10.1 algoritmi, RPO gap, 4 mezonli Priority formula | **3 PASSED** |
| **Plans & Simulation** | Rejalarni e'lon qilish, PDF eksport, Excel eksport, Simulyatsiya, Dashboard | **4 PASSED** |
| **Processes (FR-03, 04)** | Jarayonlar reestri, yangi jarayon, aktivlar, bog'liqliklar | **4 PASSED** |
| **Risks (FR-06)** | 1..25 risk balli, 1..5 chegara tekshiruvi, xavf reestri | **3 PASSED** |
| **JAMI** | **24 ta to'liq avtotest** | **100% PASSED** |

---

## 4. 🚀 Windows 11 Uchun Ishga Tushirish Yo'riqnomasi

### 4.1. PostgreSQL 16 O'rnatish va Bazani Sozlash

1. **PostgreSQL o'rnatish:**
   - [PostgreSQL rasmiy saytidan](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) Windows uchun PostgreSQL 16 (yoki undan yuqori) o'rnating.
   - O'rnatish vaqtida portni `5432` va parolni kiriting (masalan: `bcms_secret_2026`).

2. **Bazani va foydalanuvchini yaratish:**
   PowerShell yoki SQL Shell (psql) orqali:
   ```powershell
   # psql orqali postgres foydalanuvchisi sifatida kirish:
   psql -U postgres
   ```
   Quyidagi SQL buyruqlarini bajaring:
   ```sql
   CREATE DATABASE bcms_db;
   CREATE USER bcms_user WITH PASSWORD 'bcms_secret_2026';
   GRANT ALL PRIVILEGES ON DATABASE bcms_db TO bcms_user;
   ALTER DATABASE bcms_db OWNER TO bcms_user;
   \q
   ```

3. **Konfiguratsiyani tekshirish (`.env`):**
   `c:\dissertatsiya\backend_fastapi\.env` faylida quyidagi qator mavjudligini tasdiqlang:
   ```env
   DATABASE_URL=postgresql://bcms_user:bcms_secret_2026@localhost:5432/bcms_db
   SECRET_KEY=bcms-designer-dev-secret-key-2026-fstu-dissertatsiya
   SESSION_SECRET=bcms-session-secret-key-2026-dev-only
   DEBUG=true
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000
   PAGE_SIZE=50
   TIMEZONE=Asia/Tashkent
   ```
   > ⚠️ **Muhim:** `.env` fayli maxfiy kalitlarni saqlaydi va `.gitignore` ga kiritilgan.

---

### 4.2. Alembic Migratsiyalari va Demo Ma'lumotlarni Yuklash

1. **Alembic orqali PostgreSQL jadvallarini yaratish:**
   ```powershell
   cd c:\dissertatsiya\backend_fastapi
   alembic upgrade head
   ```

2. **Demo tashkilot, jarayonlar, xavflar va foydalanuvchilarni yuklash:**
   ```powershell
   python seed_data.py
   ```
   *Natijada pilot "Farg'ona Davlat Texnika Universiteti", 6 ta biznes jarayon, 7 ta aktiv, BIA baholashlari, risklar, strategiyalar va BCP rejalari bazaga yoziladi.*

---

### 4.3. FastAPI Backendni Ishga Tushirish

```powershell
cd c:\dissertatsiya\backend_fastapi
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **API Asosiy Manzil:** `http://127.0.0.1:8000`
- **Interaktiv Swagger UI:** `http://127.0.0.1:8000/api/docs`
- **ReDoc Hujjatlari:** `http://127.0.0.1:8000/api/redoc`

---

### 4.4. Frontendni Ishga Tushirish

Alohida PowerShell oynasida:
```powershell
cd c:\dissertatsiya\frontend
cmd /c "npm run dev"
```
- **Vite Web Ilova:** `http://localhost:5173`
- Barcha `/api/*` so'rovlari avtomatik ravishda `127.0.0.1:8000` FastAPI backendiga yo'naltiriladi.

---

## 5. 🔑 Namunaviy Demo Foydalanuvchilar

Barcha hisoblar uchun standart parol: **`Admin123!`**

| Foydalanuvchi nomi | Roli | Ism-familiya | Imkoniyatlari |
|---|---|---|---|
| `admin` | **ADMIN** | Muhammadali Aliyev | Tizimning to'liq boshqaruvi, barcha CRUD va audit |
| `bcms_manager` | **BCMS_MANAGER** | BCMS Menejeri | Jarayonlar, BIA so'rovnomasi, xavflar tahlili |
| `director` | **APPROVER** | Mamirjon Turdimatov | Rahbariyat tasdiqlashi (BIA tasdiqlash, BCP rejasini rasmiy e'lon qilish) |

---

## 6. 📊 Swagger UI va Hisobotlar

1. **Swagger UI:** `http://127.0.0.1:8000/api/docs` manzilida barcha REST endpointlarni interaktiv sinash mumkin.
2. **PDF Eksport:** BCP rejalari kartochkasidagi **"PDF Eksport"** tugmasi orqali ReportLab yordamida rasmiy PDF hujjat shakllantiriladi.
3. **Excel Eksport:**
   - Har bir BCP rejasi uchun **"Excel Eksport"** tugmasi.
   - Dashboard sahifasida **"Tashkilot Excel Hisoboti"** tugmasi orqali butun tashkilot ma'lumotlari ko'p varaqli Excel jadvali sifatida yuklab olinadi.
