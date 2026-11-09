**RiskGuard / BCMS tiklash hisoboti — 2026-11-09**

Boshlang‘ich manba: `muhammadalialiyev083-bit/RISKGUARD`, commit `a3c2b22885b30b9ad4cddb4f910eb6d718977dc2`. Ushbu recovery commit shu commitning davomidir. Mavjud tarix, fayllar, SQLite bazasi va eski build assetlari saqlandi.

**ZIP bo‘yicha cheklov.** `RISKGUARD.zip` ijro muhitiga yuklab olishning 32 MiB chegarasidan katta. Arxiv ochilmadi, uning ichidagi fayllar tekshirildi yoki GitHub’ga aynan shu ZIP ko‘chirildi degan da’vo qilinmaydi. Ish GitHub’da allaqachon mavjud nusxadan bajarildi. ZIP va repo aynan bir xil ekanligi tasdiqlanmagan.

**Manbalar va ishonch darajasi.**

- [S1 — Set up adolat](https://chatgpt.com/s/cx_6af198dd25848191bfb31733765d3c74): Django/React asosiy oqimi, ixtiyoriy FastAPI backend, ilmiy hardening va logo manbalari.
- [S2 — Login muammosi](https://chatgpt.com/s/cx_6af198a97d0c81918f414f2e8fb2220e): login/CSRF, sessiya, paroldagi bo‘sh joylar, initial-admin va test diff yozuvlari.
- [Joylashtirilgan frontend](https://safeguardity.netlify.app): tayyor HTML/JS/CSS nusxasi o‘qildi. `result.csrfToken` orqali login/logout tokenini yangilash minifikatsiyalangan JS’da ham tasdiqlandi. Asl TS/TSX source map topilmadi.
- `evidence/` ichida 14 tarixiy yo‘lga tegishli 18 ta original diff, 7 ta ajratilgan snapshot va ularning SHA-256 qiymatlari saqlangan. Bu to‘liq eski repo zaxirasi emas.

**Repo va Git tekshiruvi.**

Boshlang‘ich commitda 7 450 ta kuzatiladigan fayl mavjud; 6 787 tasi `frontend/node_modules` ichida. Git tarixida bitta import commit bor. `git fsck --full --no-reflogs --unreachable` qo‘shimcha tiklanadigan obyekt ko‘rsatmadi. Bu yangi reponing holatini bildiradi; kompyuterdagi yoki ZIP ichidagi ehtimoliy boshqa tarixni tekshirish o‘rnini bosmaydi.

Suhbatlarda `e681f56a4ad797ed4645f4996dd5663c13319f07` (login), `6d3b0b8` (initial-admin), `edb3458` (ilmiy kod/testlar) va `9a7e3fe` (hujjatlar) qayd etilgan. `fix/bcms-scientific-hardening` o‘sha suhbat yakunida `main`ga merge qilinmagan. Mazkur eski commitlar yangi repo tarixida yo‘q; ularning tarixiy obyektlari qayta yaratilmagan.

**Mavjud modullar bilan solishtirish.**

| Qism | Tekshirilgan holat |
|---|---|
| Django/DRF | Modular monolith, Session + Basic auth, tenant querysetlar, immutable audit mavjud. Django 6.1.2 migration headerlarida va tiklash sinovida tasdiqlandi; eski AGENTS’dagi “Django 3.12” versiya yozuvi aniq emas. |
| React/TypeScript/Vite | Mavjud manba va lockfile saqlangan. TypeScript tekshiruvi va Vite build o‘tdi. Yangilangan JS asset qo‘shildi, eski assetlar o‘chirilmagan. |
| PostgreSQL | FastAPI’da SQLAlchemy/Alembic va PostgreSQL URL konfiguratsiyasi mavjud. Django hali SQLite bilan sozlangan. Sinovlar SQLite bilan bajarildi; haqiqiy PostgreSQL ulanishi yoki Render integratsiyasi tekshirilmadi. |
| BIA | RTO/MTPD validatsiyasi, RPO gap va approval oqimi mavjud; mavjud backend testlari o‘tdi. |
| Risklar | Risk × impact, residual risk va tegishli API mavjud; mavjud testlar o‘tdi. |
| Uzluksizlik rejalari | Rejalar, qadamlar, publish va PDF endpointlari mavjud; mavjud testlar o‘tdi. |
| Simulyatsiya | Dependency graph va cascade kodi saqlangan. Keyingi hardening branchidagi umumiy hisoblash qatlami mavjud emas. |
| Hisobotlar | Django dashboard va PDF mavjud. Frontenddagi Excel havolalari FastAPI’da mavjud, Django’da tegishli Excel endpointlari yo‘q. Bu bo‘shliq yangi Excel kodi bilan taxminan to‘ldirilmagan. |
| Ikki backend mosligi | Django va FastAPI alohida testdan o‘tdi. Bir xil BIA/risk/dependency kirishlaridan bir xil natija chiqarishi bu bosqichda tasdiqlanmadi. |

**Manbaga tayangan holda tiklangan o‘zgarishlar.**

- `backend/apps/authentication/serializers.py`: parol maydonlariga `trim_whitespace=False`. Redaktlangan eski callable joyi mavjud fayldagi o‘zgarmagan `serializers.CharField` bilan qiyoslandi.
- `backend/apps/authentication/views.py`: S2 diffidagi login uchun CSRF tekshiruvi, login/logout javobidagi yangi token va cache cheklovlari ulab chiqildi.
- `frontend/src/api/client.ts`: S2’dagi CSRF bootstrap, birgalikdagi token so‘rovi, token rotation, faqat CSRF 403 uchun bir martalik retry, `ApiError` va javob tekshiruvlari tiklandi. Mavjud domain API metodlari saqlandi. Redaktlangan `result.csrfToken` ifodalari saqlangan live JS bilan tasdiqlandi.
- `frontend/tests/client.test.mjs`: 10 ta tarixiy test tiklandi. Bitta `<SECRET>` accessor shu faylning boshqa testlaridagi aynan bir xil `options.headers.get` ifodasiga asoslanib to‘ldirildi.
- `frontend/package.json`: S2’dagi `node --test tests/*.test.mjs` testi qo‘shildi.
- `frontend/dist`: yangi client bilan build qayta yig‘ildi; index yangi JS’ga yo‘naltirildi. Eski JS va CSS fayllari saqlandi.

**TAXMINIY / QAYTA TUZILGAN ULASH VA YANGI YORDAMCHI FAYLLAR.**

Quyidagilar aynan eski fayl matni deb taqdim etilmaydi. Ularning vazifasi manbada tasdiqlangan, to‘liq tarixiy implementatsiyasi esa saqlanmagan:

1. `CSRFTokenView.get` tanasi va `backend/bcms_backend/urls.py` dagi `/api/v1/auth/csrf` ulanishi — S2’dagi view nomi, `get_token`, `csrfToken` kontrakti va frontend chaqiruvidan qayta tuzildi.
2. `backend/bcms_backend/settings.py` dagi CSRF origin ulanishi — S2’da ko‘rsatilgan ikki lokal Vite origini joriy eski konfiguratsiyaga ulandi. To‘liq yo‘qolgan production sozlamalari qayta yaratilmagan.
3. `backend/requirements.txt` va `requirements-dev.txt` — importlar, migration headerlari va muvaffaqiyatli tekshirilgan muhitdan tuzilgan yangi manifestlar; yo‘qolgan lockfile yoki asl requirements deb da’vo qilinmaydi.
4. `TestRecoveredCSRFSession` dagi 6 ta test — yangi yozilgan regressiya testlari. Eski tarixiy test sifatida ko‘rsatilmaydi.
5. Root `.gitignore` va ushbu hisobot — tiklash davomida qo‘shilgan yordamchi fayllar. Oldindan kuzatilgan `node_modules` fayllari tarix va manbani saqlash uchun o‘chirilmagan.

**Sinov natijalari.**

| Tekshiruv | Boshlang‘ich | Tiklashdan keyin |
|---|---:|---:|
| Django | 33 passed | 39 passed |
| FastAPI | 24 passed | API kodi o‘zgarmadi; shu 24 ta baseline testi dalil sifatida saqlandi |
| Frontend client | Test script yo‘q | 10 passed |
| TypeScript + Vite build | Passed | Passed |
| Django system check | — | 0 issues |
| Brauzer | — | Alohida demo bazasida CSRF bootstrap, login, dashboard, processes, BIA, risks, plans, scenarios GET javoblari 200; JS xatosi yo‘q |

Django regressiyalarida token yo‘q login rad etilishi, token rotation, logout/relogin, bo‘sh joyli parollar, noto‘g‘ri parol, begona origin va no-cache tekshirildi. Sinovlar yangi alohida test/smoke bazalarida bajarildi. Repo ichidagi `backend/db.sqlite3` o‘zgartirilmagan. `seed_demo_data` faqat yangi smoke bazasida ishlatildi; uni mavjud hisoblar bor bazada bajarish tavsiya etilmaydi, chunki mavjud seeder demo parollarni qayta o‘rnatadi.

**Qolgan aniq cheklovlar va tiklash rejasi.**

- Ushbu frontend recovery buildi Django uchun tekshirildi. FastAPI’da `/auth/csrf` yo‘q; yangi frontendning FastAPI bilan login integratsiyasi tiklangan deb da’vo qilinmaydi. FastAPI’ning o‘z API testlari alohida o‘tdi.
- Mavjud `App.tsx` eski demo interfeys bo‘lib, demo hisobga avtomatik kiradi va demo hisoblar orasida almashtiradi. Keyingi jonli saytdagi to‘liq login interfeysining TSX manbasi suhbatlarda saqlanmagan; u yangi dizayn bilan almashtirilmagan.
- `bcms_domain`, keyingi cross-backend formulalar, strategy selection va Kendall tau-b implementatsiyasining to‘liq manbasi yo‘q. Mavjud ilmiy formulalar va biznes modellari o‘zgartirilmagan. Avval shu branchning eski obyektlari yoki to‘liq kod nusxasi topilishi kerak.
- Initial-admin migratsiyasi va test snapshotlarida `<SECRET>` joylari bor; ular runnable migratsiya sifatida qo‘shilmadi. Hisoblar yaratilmadi yoki almashtirilmadi.
- Eski to‘rtta nomi ma’lum hujjat: `PULL_REQUEST.md`, `TEST_RESULTS.md`, `SECURITY_HARDENING.md`, `DISSERTATION_TECHNICAL_SUMMARY_UZ.md` mavjud nusxada yo‘q. Mazmuni taxminan yozilib eski hujjat deb ko‘rsatilmagan.
- `LOGIN_TUZATISH.md`ning dastlabki 72 satri tarixiy snapshot sifatida saqlandi. Keyingi diff headerida old=4/new=22, body’da old=3/new=21 satr bor; u avtomatik qo‘llanmadi.
- Uchta logo original PNG ko‘rinishida ishchi muhitga olindi; yuklash manbalari va hashlar `LOGO_SOURCES.json`da. Asl repo ichidagi joylashuvi noma’lum bo‘lgani uchun interfeysga taxminiy ulanmagan.
- To‘liq ZIP tekshiruvi uchun arxivni `node_modules` va virtual muhitlarsiz 32 MiB’dan kichik ko‘rinishda qayta olish yoki shu chegaradan kichik mustaqil arxivlarga bo‘lish kerak. ZIP ichidagi ma’lumotlar bazasi yoki Git metadata tekshirilgani da’vo qilinmaydi.
- Production Django/PostgreSQL konfiguratsiyasi, Django Excel endpointlari va ikki backendning umumiy hisoblash qatlami alohida qolgan tiklash ishlari hisoblanadi. Mavjud local smoke natijasi productionga tayyorlikni bildirmaydi.

**Qayta tekshirish (alohida ishchi nusxada).**

Django uchun `python -m pip install -r backend/requirements-dev.txt`, so‘ng `backend/` ichida `python -B -m pytest`. FastAPI uchun mavjud `backend_fastapi/requirements.txt`ni ham o‘rnating, so‘ng o‘sha papkada `python -B -m pytest tests -q`. Frontend uchun `frontend/` ichida `npm ci`, `npm test`, `npm run build`. Mavjud bazaning zaxirasini saqlang; smoke seedingni faqat alohida yangi bazada bajaring.

Bu hisobot tiklashning tekshirilgan, qisman natijasini qayd etadi. Butun yo‘qolgan loyiha yoki Git tarixi to‘liq tiklangani da’vo qilinmaydi.
