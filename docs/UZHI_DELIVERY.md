# Uzluksiz Himoya (UzHi): topshirish va joylashtirish qaydi

Bu hujjat RISKGUARD loyihasidagi UzHi o‘zgarishlarini, tekshirish chegaralarini va mavjud hostingga chiqarish tartibini qayd etadi. `docs/recovery/` tarixiy dalillari o‘zgartirilmagan. Ushbu qayd production yangilangani yoki barcha qabul mezonlari bajarilganini anglatmaydi.

## Qamrov va dalillar

- Asosiy ishlab chiqish tizimi — `backend/` ichidagi Django + Django REST Framework; React/TypeScript/Vite frontend `frontend/` ichida. `backend_fastapi/` bu o‘zgarishlarda rivojlantirilmadi.
- Django API, Session Authentication, CSRF, tashkilot izolatsiyasi va mavjud ilmiy hisoblash qoidalari saqlangan. `backend/bcms_backend/urls.py` amaldagi mahalliy endpointlar manbasidir.
- Ish boshlangan checkout: `4560eebef30a7a402caf24da3e526791177f97a7`; ish boshlangan branch `work`; topshirish branchi `feat/uzhi-platform`. Yakuniy commit/PR va deploy qilingan commit tekshiruv natijasi bilan alohida qayd etilishi kerak.
- `frontend/public/_redirects` ichida `/api/*` avval `https://adolat-99us.onrender.com/api/:splat` ga proksilanadi; undan keyin SPA fallback keladi. `netlify.toml`: base `frontend`, build `npm run build`, publish `dist`.
- Mavjud hosting manzillari: `https://uzhi.netlify.app` va `https://adolat-99us.onrender.com`. Bu havolalar yangi kod o‘sha manzillarga chiqarilganining isboti emas.
- Cloud tarmoq siyosatida Fusion va production domenlariga ruxsat yo‘q: Fusion rasmiy sahifalari, Netlify frontend va Render backend so‘rovlari 403 bilan bloklangan. Shu sababli Fusion sahifalarining joriy matni, jonli login muammosi, production API va deploy holati bu muhitdan tasdiqlanmadi. GitHub API/PR va deployment boshqaruviga kirish ham mavjud emas; PR yoki muvaffaqiyatli deploy havolasi o‘ylab topilmaydi.
- Mahalliy test natijasi production PostgreSQL migratsiya tarixi bilan teng emas. Production baza ko‘rilmagan, ko‘chirilmagan, qayta yaratilmagan; mavjud parollar yoki ma’lumotlar reset qilinmagan.

## Funksional bajarilish jadvali

Quyidagi jadval koddagi amaliy imkoniyatlar inventaridir. «Mavjud» yoki «qo‘shildi» degani production’da tekshirilgan degani emas. Butun to‘plamning yakuniy test natijasi keyingi bo‘limda qayd etiladi.

| Menyu / imkoniyat | API yoki tayanch | Amalga oshirilgan oqim va tekshirish chegarasi |
|---|---|---|
| Kirish va sessiya | `/api/v1/auth/csrf`, `/auth/login`, `/auth/me`, `/auth/logout` | Haqiqiy sessiya, CSRF aylanishi, logout/qayta login; parolsiz hisob almashtirish yoki avtomatik demo login yo‘q. |
| Hisob xavfsizligi | `/auth/config`, `/auth/password/change`, `/auth/me` | Profil va afzalliklar, parolni tasdiqlash, xavfsizlik formalarining API integratsiyasi. |
| Parolni tiklash | `/auth/password/reset`, `/auth/password/reset/confirm` | Hisob mavjudligini yashiradigan javob, rate limit, bir martalik muddatli token, parol validatsiyasi; haqiqiy SMTP yetkazilishi tashqi sozlama va tekshiruvni kutadi. |
| Google kirish | `/auth/google/start`, `/auth/google/link`, `/auth/google/callback` | Serverdagi Authlib OIDC oqimi, state/nonce/PKCE, lokal hisobni parol bilan qayta tasdiqlab bog‘lash. Yangi Google emailiga ADMIN yoki begona tashkilot a’zoligi berilmaydi. Haqiqiy provider oqimi sozlangan muhitda tekshirilishi kerak. |
| Dashboard | `/api/v1/reports/organization` | Real yozuvlardan KPI va taqsimotlar, xizmat va sana filtrlari, muammoli yozuvlar identifikatorlari, CSV/PDF eksport; tarixiy KPI snapshot/trend modeli qo‘shilmagan. Sana filtri tanlangan davrda yaratilgan jarayonlar kohortasini ko‘rsatadi, o‘tgan kunlardagi umumiy tayyorgarlik tarixini emas. |
| Tashkilot va resurslar | `/organizations/`, `/departments/`, `/services/` | Tashkilot profili, bo‘limlar va xizmatlar. Alohida filial modeli yo‘q; bo‘limni filial deb noto‘g‘ri ko‘rsatmaslik kerak. |
| Foydalanuvchilar va a’zolik | `/users/`, `/users/invite/`, `/auth/invitation/accept` | Administrator orqali foydalanuvchi boshqaruvi, email taklifnoma va bir martalik qabul qilish; taklif emaili production’da tekshirilmagan. |
| Jarayonlar | `/processes/` | Xizmat, mas’ul, kritiklik va holat bilan yaratish/tahrirlash; tenantga tegishli bog‘lanishlar tekshiriladi. |
| Aktivlar va bog‘liqliklar | `/assets/`, `/dependencies/` | Server, tizim, xodim, infratuzilma/provayder turidagi aktivlar va jarayon/aktiv aloqalari; real ma’lumotlar uchun graf va jadval. |
| BIA | `/bia/`, `/bia/{id}/submit/`, `/bia/{id}/approve/` | Ta’sir nuqtalari, tekshiruv, yuborish va rolga mos tasdiqlash; `RTO ≤ MTPD` va backup/RPO qoidalari saqlangan. |
| Risklar va nazoratlar | `/risks/`, `/controls/` | Risk, nazorat choralari, qoldiq risk; 5×5 matritsa real API yozuvlariga bog‘langan. |
| Hisoblash yadrosi | `/analyses/priority`, `/analyses/evaluate-risk`, `/analyses/evaluate-strategy` | Mavjud formulalar bo‘yicha reyting va strategiyalarni taqqoslash; kirish ma’lumotlari validatsiyasi. |
| Tiklash strategiyalari | `/strategies/` | Jarayon uchun RTO, RPO, xarajat va tanlash holati bilan strategiya variantlari. |
| BCP/DRP | `/plans/`, `/plans/{id}/submit/`, `/plans/{id}/publish/`, `/plans/{id}/export_pdf/` | Reja qadamlari/mas’ullari, versiya, rasmiy e’lon qilish va Unicode shriftli PDF; eksport auditga tushadi. |
| Simulyatsiya va saqlangan natijalar | `/scenarios/`, `/scenarios/{id}/simulate/`, `/simulation-runs/` | Aktiv uzilishi → kaskad ta’siri/RTO/MTPD/rejasiz jarayonlar; har bir natija alohida snapshot sifatida saqlanadi. Eski simulate javobiga `simulation_run_id` qo‘shilgan. |
| Provayderlar | `/providers/`, `/providers/{id}/disruption/` | Xizmat va aktiv bog‘lanishlari, risk darajasi, qayta baholash sanasi; bog‘langan aktivlar uzilishidan ssenariy va saqlangan natija yaratiladi. |
| Hodisalar markazi | `/incidents/`, `/incidents/{id}/timeline/`, `/incidents/{id}/escalate/` | Hodisa darajasi, mas’ul, aktiv/provayder/reja bilan bog‘lanish; holat, sababli daraja eskalatsiyasi, izohlar va timeline. Yopish uchun xulosa va bajarilgan vazifalar kerak. |
| Yaxshilash vazifalari | `/improvement-tasks/`, `/simulation-runs/{id}/improvements/` | Simulyatsiya yoki hodisa xulosasi → mas’ul/muddatli vazifa → bajarilish holati. Jarayon egasi faqat o‘z vazifasining holati/izohini yangilaydi. |
| Hisobotlar | `/reports/organization?export=csv`, reja PDF endpointi | Ochiladigan CSV/PDF, eksport auditi. CSV’da o‘zbekcha matn uchun UTF-8 BOM va formula injection himoyasi bor. |
| Audit | `/audit-logs/` | Kim/qachon/nima, filtrlar va tashkilot doirasi. Model va API jurnalni o‘zgartirish/o‘chirishga ruxsat bermaydi. |
| App shell va dizayn | `frontend/src/components/`, `auth/`, `pages/` | UzHi/Uzluksiz Himoya nomi, alohida bo‘sh logo joyi, dark/light, guruhlangan navigatsiya, modulli sahifalar. Yakuniy desktop/mobil/klaviatura brauzer tekshiruvi alohida dalil bilan qayd etiladi. |

Jadvaldagi auth endpointlari `/api/v1` prefiksi ostida. DRF reestr endpointlari oxirida `/` talab qiladi; explicit auth, analyses va dashboard endpointlari oxirida `/` ishlatilmaydi.

## Muhim siyosatlar

- `AUDITOR` o‘qish huquqi bilan cheklanadi. Tasdiqlash rolga mos; foydalanuvchi boshqaruvi administratorga tegishli. Yangi operations yozish amallari ADMIN/BCMS_MANAGER va ayrim risk amallari uchun RISK_ANALYST bilan cheklangan.
- Begona tashkilot obyektlari tenant queryset orqali yashiriladi va 404 qaytaradi. Yozishda foreign key va M2M bog‘lanishlari ham shu tashkilot doirasida tekshiriladi.
- Formulalar o‘zgartirilmagan: risk = likelihood × impact; ball 1–25; chegaralar ≤6 / 7–14 / ≥15; priority og‘irliklari 0.40/0.25/0.20/0.15; backup interval > RPO bo‘lsa gap.
- OAuth tokenlari brauzer `localStorage`iga yozilmaydi. Parol, reset tokeni, SMTP/OAuth siri auditga chiqarilmaydi. OIDC emailiga qarab mavjud lokal hisob avtomatik bog‘lanmaydi.
- API xatosi yozuvlar yo‘qligi sifatida yashirilmasligi kerak; bo‘sh holat birinchi yozuvni yaratishga yo‘naltiradi. Real tarix bo‘lmasa sun’iy trend yoki foiz ishlab chiqarilmaydi.

## Tekshiruv natijalari

Mahalliy muhit: Python 3.12, Django, alohida `/workspace/.riskguard` virtual muhiti/SQLite bazasi. Tracked `backend/db.sqlite3` saqlangan. Frontendning tracked Windows `node_modules` fayllarini buzmaslik uchun Linux build/test tashqi mirror orqali bajariladi.

| Tekshiruv | Dalillangan holat |
|---|---|
| Avvalgi onboarding bazaviy tekshiruvi | O‘zgarishlardan oldin 39 backend, 10 frontend testi, build va login/API smoke o‘tgan; bu yangi o‘zgarishlarning yakuniy natijasi emas. |
| Yangi operations oqimlari | `python -m pytest tests/test_operations.py -q`: 7 passed. Provayder → simulyatsiya → vazifa; hodisa → vazifa → yopish; snapshot saqlanishi; eskalatsiya; RBAC va tenant salbiy testlari. |
| To‘liq Django backend | `cd backend && python -m pytest -q`: **72 passed**, 83 warnings (Django email sozlamalari deprecation va ReportLab deprecation). Yangi auth 17, domen 9 va operations 7 testni o‘z ichiga oladi. |
| Frontend | Toza `npm ci`, `npm test`: **12 passed**. `npm run build` ichidagi TypeScript va Vite production build o‘tdi. Yangilangan `frontend/dist` Django tomonidan ham tekshirildi. |
| Playwright / Chromium | Auth, 13 domen oqimi va 12 operations tekshiruv guruhi alohida o‘tdi. Desktop va 390 px mobil, PDF/CSV fayllari, real API yozuvlari, reload, RBAC xatolari, qidiruv va keyboard tekshirildi. Kutilgan anonim 403, noto‘g‘ri login/reset 400 va ochiq vazifali hodisani yopish 400 alohida hisobga olingan; kutilmagan 5xx yoki brauzer exception topilmadi. |
| Migratsiya va static | Mahalliy qo‘shimcha migratsiyalar qo‘llandi; `makemigrations --check --dry-run`: No changes detected; `manage.py check`: no issues; `collectstatic`: 159 fayl. Production PostgreSQL tarixiga kirish yo‘q. |
| Google va email production yetkazilishi | Kalitlar/provider va SMTP yo‘q; haqiqiy OAuth, reset/taklif emaili yetib borishi tasdiqlanmagan. |
| Production/deploy preview | Tarmoq va deploy boshqaruvi bloklangan. Deploy terminal holati hamda jonli commit tasdiqlanmagan. |

## Hostingda kerakli sozlamalar

Qiymatlarni chatga yoki Git’ga yozmang; Render’ning xavfsiz environment sozlamalariga kiriting. Mavjud production `DATABASE_URL` va `SECRET_KEY` qiymatlarini saqlang.

| Nom | Vazifa / kutilgan qiymat |
|---|---|
| `DEBUG` | Production’da `False`. |
| `DATABASE_URL` | Mavjud Render PostgreSQL `bcms_db` ulanishi, faqat backendda. `DEBUG=False` bo‘lsa PostgreSQL URL majburiy; yashirin SQLite fallback bloklanadi. |
| `SECRET_KEY` | Mavjud doimiy Django siri; production’da majburiy. Uni almashtirish sessiya va imzolangan havolalarga ta’sir qiladi. |
| `FRONTEND_URL` | `https://uzhi.netlify.app` — reset, taklif va OAuth natijasi manzillari asosi. |
| `CSRF_TRUSTED_ORIGINS` | `https://uzhi.netlify.app,https://safeguardity.netlify.app,https://adolat-99us.onrender.com` kabi faqat haqiqiy ishlatiladigan originlar. |
| `CORS_ALLOWED_ORIGINS` | Ishlatiladigan frontend originlari; credentials bilan wildcard ishlatmang. |
| `GOOGLE_CLIENT_ID` | Google OAuth Web Application client ID. |
| `GOOGLE_CLIENT_SECRET` | Google client siri, faqat backendda. |
| `GOOGLE_REDIRECT_URI` | `https://uzhi.netlify.app/api/v1/auth/google/callback`. Google Console Authorized redirect URIs ro‘yxatiga aynan shu manzilni kiriting. |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend`. |
| `EMAIL_HOST`, `EMAIL_PORT` | Haqiqiy SMTP server va port, odatda STARTTLS uchun 587. |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP hisob/sir; provider talab qiladigan tekshirilgan yuboruvchi. |
| `EMAIL_USE_TLS`, `EMAIL_USE_SSL` | Providerga mos bittasini tanlang; ikkalasini birga yoqmang. |
| `DEFAULT_FROM_EMAIL` | Provider tasdiqlagan jo‘natuvchi manzili. |

Google scope’lari `openid email profile`. Login backendda tekshirilgan, oldindan bog‘langan Google identity uchun ochiladi. Yangi odam avval administrator taklifini qabul qilib yoki admin tomonidan tasdiqlangan lokal hisob olishi va profil xavfsizligidan mavjud parolini tasdiqlab Google hisobini bog‘lashi kerak. Begona email uchun avtomatik tashkilot yoki ADMIN yaratilmaydi.

Google callbackni Netlify domeni orqali berish OAuth holati va sessiya cookielarini frontend proksi originida ushlab turadi. Google Console callback satri, `GOOGLE_REDIRECT_URI` va Netlify proksi aynan mos bo‘lishi kerak. Frontend sahifalari: `/auth/google/result`, `/auth/forgot`, `/auth/reset`, `/auth/invitation` (reset/taklif tokenlari URL fragmentida yuboriladi). Tashqi xizmatlar sozlanmaganda UI buning holatini ochiq ko‘rsatadi; ularni ishlayapti deb baholamaydi.

## Ma’lumotlarni saqlagan holda deploy tartibi

1. Mavjud Render service va Netlify site ishlatilsin. Boshqa hosting yoki yangi bo‘sh baza ochilmang. Avval Render backup/snapshot mavjudligi, xizmatning branch/commit identifikatori va `DATABASE_URL` mavjud **shu** production bazaga tegishli ekanini hosting boshqaruvida tasdiqlang. Sir qiymatini terminalga chiqarmang.
2. Production Django migratsiya tarixini faqat o‘qish buyrug‘i bilan oling: `python manage.py showmigrations --plan`. Uni checkoutdagi migratsiyalar bilan solishtiring. Kutilmagan historical farq bo‘lsa, deployni shu nuqtada to‘xtatib, bazani biladigan administrator bilan tekshiring. `--fake`, `flush`, `reset` yoki migratsiya tarixini o‘chirishni qo‘llamang.
3. Yangi qo‘shimchalar: `authentication/0003_authratelimit_user_preferences_googleidentity.py` rate limit, user preferences va Google identity uchun; `operations/0001_initial.py` yangi provayder/hodisa/vazifa/snapshot/timeline jadvallari uchun. Ular mavjud user parollarini va tashkilot ma’lumotlarini qayta yozish uchun tuzilmagan. `python manage.py migrate --plan` natijasida aynan kutilgan qo‘shimchalar borligini tekshiring.
4. Tasdiqlangan commitdan build qiling. Backend root `backend`: `pip install -r requirements.txt`, keyin `python manage.py check` va `python manage.py collectstatic --noinput`. Test muhitida `requirements-dev.txt` va `python -m pytest` ishlatilsin. Frontend root `frontend`: Linux’da toza dependency install va `npm run build`; Netlify base/build/publish qiymatlari yuqoridagi konfiguratsiyaga mos.
5. Mavjud production DB ga `python manage.py migrate --noinput` faqat taqqoslangan reja va backupdan keyin bajarilsin; startup `gunicorn bcms_backend.wsgi:application`. Bir nechta worker parallel migratsiya bajarmasligi uchun uni deployning yagona migration/release bosqichida bajaring.
6. **Production’da `seed_demo_data`, avtomatik parol reseti, `createsuperuser` yoki mavjud userlarni qayta yaratish ishlatilmaydi.** Lokal demo bazadagi credentiallar production kirishi sifatida qabul qilinmaydi. Mavjud login/parollar saqlanadi.
7. Netlify deploy terminal natijasi va Render deploy terminal natijasi muvaffaqiyatli bo‘lganini ko‘ring; har ikkisi tasdiqlangan commit/buildga tegishli bo‘lsin. Faqat deploy so‘rovi qabul bo‘lishi tayyorlik isboti emas.
8. Jonli `/api/v1/auth/csrf` JSON va `csrfToken` qaytarsin; SPA HTML bo‘lmasin. Sessiyasiz login sahifasi, noto‘g‘ri parol, login → refresh → logout → qayta login, cookie/CSRF, tashkilot izolatsiyasi va AUDITOR yozish blokini tekshiring. Yozuv yaratish → reload → yangi deploydan keyin saqlanishini alohida sinang; production test yozuvlarini administrator bilan belgilang.
9. Google consent/cancel/invalid-repeat callback, profilga bog‘lash, reset emaili yetib borishi, havolaning bir marta ishlashi/muddati, eski sessiyaning rad etilishi va taklif emailini haqiqiy provider muhitida tekshiring. Delivery loglarini provider panelida tekshiring, token yoki parolni logga yozmang.
10. PDF faylni oching, CSV’ni o‘zbekcha belgilar bilan import qiling; desktop/mobil, klaviatura, console va Network tekshiruvlarini bajaring. Nosozlik bo‘lsa DB ni reset qilish o‘rniga sababini aniqlang. Yangi yozuvlar yaratilganidan keyin migratsiyani ko‘r-ko‘rona orqaga qaytarmang; backup va mos keluvchi oldingi app versiyasi bilan rollback rejasini administrator tuzsin.

## Hali tasdiqlanmagan yoki cheklangan qismlar

- Ishlayotgan production commit, deploy preview, PR va deployment yakuniy natijasi tashqi kirishsiz tekshirilmagan.
- Google OAuth va SMTP kodi mavjud; haqiqiy provider credentiallari, Google consent konfiguratsiyasi, SMTP sender/DNS talablari va email yetkazilishi tashqarida sozlanishi/tekshirilishi kerak.
- Production PostgreSQL tarixini tekshirish mahalliy SQLite testlari bilan almashtirilmaydi. Productionga moslik yangi deploy oldidan tasdiqlanadi.
- Tarixiy KPI/trend saqlash tizimi va mustaqil filial modeli kiritilmagan. Mavjud bo‘limlar, real KPI/taqsimot va hodisa/simulyatsiya tarixlari ularning o‘rnida tarixiy trend deb ko‘rsatilmaydi.
- Fusion rasmiy sahifalari bu muhitdan ochilmagan; foydalanilgan tamoyillar foydalanuvchi topshirig‘idagi tavsifga asoslangan. Fusion brendi yoki marketing raqamlari UzHi nomidan ko‘chirilmagan.

## Mahalliy tekshiruvni takrorlash

Har bir cloud task alohida muhitda ishlaydi; mavjud checkoutdan foydalaning. Foydalanuvchi so‘ramasa Git worktree yaratmang. `backend_fastapi` testlarini Django suite bilan aralashtirmang.

```bash
# Faol virtual muhit va alohida mahalliy database bilan, backend/ katalogidan:
export PYTHONDONTWRITEBYTECODE=1
export DATABASE_URL=sqlite:////workspace/.riskguard/dev.sqlite3
python manage.py migrate --noinput
python manage.py check
python manage.py makemigrations --check --dry-run
python -m pytest -q
python manage.py runserver 127.0.0.1:8000 --noreload

# Alohida terminalda frontend yoki tayyor Linux mirror katalogidan:
npm ci
npm test
npm run build
npm run dev -- --host 127.0.0.1 --strictPort

# E2E_USERNAME va E2E_PASSWORD faqat ajratilgan mahalliy test hisobi uchun
# xavfsiz shell/muhit orqali beriladi; ularni source yoki logga yozmang.
# Chromium: tizimdagi /usr/bin/chromium yoki CHROMIUM_PATH.
npm run test:e2e
```

E2E testlar ajratilgan test bazasida noyob QA yozuvlarini yaratadi. Ularni production bazaga yo‘naltirmang. Tracked Windows `frontend/node_modules` sababli ushbu cloud mashinada `/workspace/.riskguard/frontend` mirroridan foydalanildi; source asosiy checkoutda tahrirlandi va mirror yangilandi. Production build fayllari `frontend/dist`ga yangilandi, `node_modules` va tracked SQLite o‘zgartirilmadi.

Ko‘p takroriy QA loginlari rate limitga tushishi mumkin. Production limitlarini o‘chirmang; ushbu ishda faqat alohida mahalliy test bazasidagi vaqtinchalik auth rate-counterlar qayta tekshiruv oldidan tozalandi.

## PostgreSQL uchun himoyalangan release

`backend/release.py` shu versiyadagi ikkita qo‘shimcha migratsiya uchun qat’iy tekshiruv beradi:

- Build vaqtida `python release.py --check` faqat o‘qish tranzaksiyasida haqiqiy PostgreSQL migratsiya tarixi va mavjud jadval/ustunlarni tekshiradi. Tarixiy migratsiyalar yo‘q yoki noma’lum bo‘lsa bo‘sh bazani avtomatik yaratish bloklanadi.
- Start vaqtida `python release.py` advisory/table lock ostida aynan ko‘rib chiqilgan migratsiyalarni bitta tranzaksiyada qo‘llaydi. Har bir mavjud yozuvning eski ustunlari va parol xeshlari jarayon ichidagi HMAC bilan oldin/keyin solishtiriladi; qiymatlar yoki fingerprintlar chiqarilmaydi. Kutilmagan o‘zgarishda DDL va ma’lumotlar rollback qilinadi.
- Django contenttype/permission yozuvlariga faqat yettita yangi model uchun kerakli qo‘shimchalar ruxsat etiladi. Seed, reset, `--fake` yoki eski migratsiyalarni qayta yaratish ishlatilmaydi.
- Mavjud migratsiyalar qo‘llangan bo‘lsa qayta start xavfsiz. Kelajakda yangi migratsiya kiritilganda shu guardning ruxsat etilgan ro‘yxati alohida tekshirilib yangilanishi kerak.

Render build: `pip install -r requirements.txt && python manage.py check && python release.py --check && python manage.py collectstatic --noinput`.

Render start: `python release.py && gunicorn bcms_backend.wsgi:application --bind 0.0.0.0:$PORT`.

Bu himoya durable backup mavjudligini isbotlamaydi. Render backup/recovery API ushbu muhitdan Cloudflare 403 qaytardi; backup holati tasdiqlanmadi. Mahalliy 33 test izolatsiyalangan SQLite tranzaksiyalarida rollback invariantlarini va PostgreSQL lock buyruqlarining chaqirilishini tekshiradi; ular mahalliy PostgreSQL integratsiya testi sifatida taqdim etilmaydi.

Render build diagnostikasi: install/check/static xatolari mos ravishda41/42/44, release guard xatolari51–62 exit kodlari bilan ajratiladi. Kodlar ma’lumot yoki credential qiymatini o‘z ichiga olmaydi.

Netlify Git build tuzatishi: tracked Windows node_modules sabab tsc executable ruxsati xatosi toza npm ci bilan bartaraf etiladi. netlify.toml build command: npm ci --no-audit --no-fund && npm run build. Alohida Git archive ichidagi Windows dependency daraxtida aynan shu buyruq tekshirildi; lockfile va asl node_modules o‘zgartirilmadi.

### Saqlanadigan tarixiy qayd

Tiklash dalillarida nomi mavjud `authentication.0003_bootstrap_initial_admin` migratsiyasining to‘liq manbasi tiklanmagan. Agar uning qaydi bazada avvaldan mavjud bo‘lsa, release guard faqat shu qaydni o‘zgarmas tarix sifatida saqlashga ruxsat beradi. Uning kodi qayta tuzilmaydi, bajarilmaydi, fake qilinmaydi yoki qaydi o‘chirilmaydi. Boshqa manbasi yo‘q migratsiyalar hanuz bloklanadi. Barcha eski yozuvlar, shu tarixiy qaydning id/vaqti va parol xeshlari oldin/keyin tekshiriladi. Yangi DB avtomatik initialize qilinmaydi; faqat ikki ko‘rib chiqilgan yangi migratsiya qo‘llanishi mumkin. Bu eski migratsiyaning asl implementatsiyasi isbotlandi degani emas.
