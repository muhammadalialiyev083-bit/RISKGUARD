FARG‘ONA DAVLAT TEXNIKA UNIVERSITETI

MAGISTRLIK DISSERTATSIYASI DOIRASIDAGI DASTURIY MAHSULOT

## BCMS DESIGNER

Biznes uzluksizligini boshqarish tizimini loyihalash va tahlil qilish veb-platformasi

TEXNIK TOPSHIRIQ VA DASTURIY SPETSIFIKATSIYAIshchi loyiha • versiya 1.0 • 2026-yil 8-oktabr


| Loyiha parametri | Qiymati |
| --- | --- |
| Dissertatsiya mavzusi | Tashkilotlarda biznes uzluksizligini boshqarish tizimini loyihalash dasturini ishlab chiqish |
| Magistrant | Aliyev Muhammadali G‘ulomjon o‘g‘li |
| Mutaxassislik | 70610302 – Axborot xavfsizligi (kalendar reja va ITI/IPI bo‘yicha) |
| Ilmiy rahbar | Turdimatov Mamirjon Mirzayevich |
| Mahsulot turi | Brauzer orqali ishlovchi ko‘p foydalanuvchili axborot-tahliliy tizim |
| Holati | Taklif etilayotgan loyiha; ishlab chiqilgan yoki sinovdan o‘tgan deb e’lon qilinmaydi |

Mazkur hujjatda “manbadan olingan” ma’lumotlar, “rasmiy mahsulot tavsifi” va “muallif taklifi” ajratildi. Talab va algoritmlar dastur ishlab chiqishdan oldin ilmiy rahbar hamda pilot tashkilot bilan kelishilishi lozim.

## 1. Hujjat maqsadi va tadqiqot chegarasi

Ushbu texnik topshiriqning maqsadi – tashkilot faoliyati uzilishlariga tayyorgarlikni boshqaruvchi, kritik jarayonlarni aniqlovchi, risk va biznesga ta’sir tahlilini (BIA) amalga oshiruvchi, tiklash strategiyalarini tanlashga yordam beruvchi va reja-hisobotlarni shakllantiruvchi veb-platformani loyihalash. Dastur avtomatik avariyaviy tiklash infratuzilmasi emas; u qarorlarni qo‘llab-quvvatlaydigan BCMS boshqaruv vositasidir.

## 1.1. Tadqiqotning mavjud asoslari

Asosnoma: tadqiqot obyekti — tashkilotning biznes jarayonlari; predmeti — BCMS ni loyihalash va dasturiy amalga oshirish; usullar — kuzatish, risk bahosi, tizimli tahlil, prototiplash.

2025-yil BuxDU ilmiy maqolasi: BCM hayot sikli, ehtimollik–ta’sir reytingi, BIA, RTO/RPO, tiklash mexanizmlari va xavfsizlik baholash matritsasi.

Kalendar ish reja: tajriba-sinovlar 2026-yil noyabr–dekabr, asosiy boblar 2027-yil yanvar, yakuniy himoya 2027-yil may–iyun.

## 1.2. Ilmiy matndagi tekshirilishi zarur joylar

2025-yilgi maqoladagi misolda 28 + 15 + 35 = 78, xususiy risklar soni 3; o‘rtacha qiymat 78/3 = 26. Formulada ko‘rsatilgan 78/7 = 26 tengligi matematik jihatdan noto‘g‘ri; dasturda n aniq sanalishi kerak.

RTO – rejalashtirilgan tiklash muddati; MTPD/MAO – qabul qilib bo‘lmaydigan ta’sirgacha bo‘lgan maksimal uzilish muddati. RTO ni aynan “maksimal ruxsat etilgan” vaqt sifatida izohlashdan saqlanish lozim.

Kalendar reja mutaxassislik shifrini 70610302 ko‘rsatadi; asosnomada 70720401 ham uchraydi. Titul va yakuniy ishga shifr rasmiy tasdiqqa muvofiq kiritiladi.

Asosnomadagi “70% tashkilot uzilishlarga duch kelgan”, “zararlar 50% kamayishi mumkin” kabi raqamlar aniq bibliografik manba bilan tasdiqlanmasa, ilmiy dalil sifatida qo‘llanmaydi.

## 2. Mavjud yechimlar va qiyosiy tahlil


| Mahsulot | Rasmiy tavsifga ko‘ra ustun jihat | O‘rganiladigan g‘oya |
| --- | --- | --- |
| ServiceNow BCM | BIA, RTO/RPO, continuity / disaster recovery plans, exercise va incident workflows | BIA natijasini rejalarga bog‘lash |
| Fusion Risk Management | Odamlar, jarayonlar, joylar, tizimlar va uchinchi tomonlar bog‘liqliklarini xaritalash | Bog‘liqliklar grafigi va zanjirsimon uzilish |
| Continuity2 Meridian | BIA wizard, risk, reja shablonlari, testlar, corrective action, audit | Bosqichma-bosqich ma’lumot kiritish |
| Quantivate BCM | Risk assessment, BIA, strategies, plan, exercises, incident and notification | Hujjatlarni markazlashtirish va ish jarayoni |
| eramba (GRC) | Biznes uzluksizlik rejalarini yuritish va risklarga bog‘lashga doir modul | Bepul/GRC yondashuvini o‘rganish |

Baholash chegarasi: tijoriy tizimlarning ichki algoritmlari, kod bazasi, litsenziya narxi yoki real ishlash tezligi mustaqil sinovsiz solishtirilmaydi. Yuqoridagi funksiyalar ularning ommaviy mahsulot tavsiflariga asoslangan.

## 2.1. Taklif qilinayotgan differensiatorlar

O‘zbek tilida birlamchi interfeys va mahalliy tashkilotlarga moslashtirilgan BIA savolnomasi.

Qaror natijasini izohlaydigan, parametrlar va vaznlar ko‘rinadigan baholash modeli.

BIA–risk–resurs bog‘liqligi–tiklash rejasi yagona hisoblash oqimiga bog‘lanadi.

Ssenariylar bo‘yicha RTO/RPO cheklovlarini avtomatik tekshirish va kamchiliklar ro‘yxatini chiqarish.

Excel/kundalik qo‘lda yondashuv bilan ilmiy taqqoslash uchun bir xil kirish ma’lumotida qayta hisoblash.

## 3. Normativ-metodik tayanch


| Standart/yo‘riqnoma | Tizimga bog‘lanishi |
| --- | --- |
| ISO 22301:2019 + Amd 1:2024 | BCMS ni tashkil etish, ishlatish, monitoring va doimiy yaxshilash; tizim standartga mos ishlashga yordam beradi, biroq sertifikat bermaydi. |
| ISO/TS 22317:2021 | BIA ma’lumotlarini yig‘ish, ustuvor faoliyatlarni aniqlash, resurs va bog‘liqliklarni qayd qilish. |
| ISO/IEC 27031:2025 | Axborot-kommunikatsiya texnologiyalari tayyorgarligi, RTO, RPO va tiklash rejalari. |
| NIST SP 800-34 Rev.1 | Contingency planning, BIA, recovery strategies va sinov rejalari. |
| OWASP ASVS v5.0.0 | Dasturiy mahsulot uchun autentifikatsiya, avtorizatsiya, ma’lumotlarni himoya qilish va xavfsizlik sinovlari. |

## 4. Mahsulot konsepsiyasi va faoliyat oqimi

Foydalanuvchi tashkilot profilini yaratadi → tarkibiy bo‘linma va xizmatlarni kiritadi → kritik biznes jarayonlarini ro‘yxatlaydi → aktiv va bog‘liqliklarni belgilaydi → BIA savolnomasini to‘ldiradi → risklarni baholaydi → tiklash ustuvorligini hisoblaydi → uzluksizlik/avariyaviy tiklash rejalarini yaratadi → ssenariy sinovlari o‘tkazadi → kamchiliklar, mas’ullar va hisobotlarni oladi.

## 4.1. Tizim doirasiga kirmaydigan imkoniyatlar

Birinchi versiyada serverlarni avtomatik qayta ishga tushirish, bulut infratuzilmasini boshqarish yoki DNS failover bajarish rejalashtirilmaydi.

Sun’iy intellekt “falokatni aniq bashorat qilish” funksiyasi sifatida da’vo qilinmaydi; kelgusida ma’lumotlar yetarli bo‘lsa tavsiya moduli qo‘shilishi mumkin.

ISO 22301 sertifikatini dastur tomonidan mustaqil berish yoki to‘liq muvofiqlikni kafolatlash mumkin emas.

## 5. Rollar va kirish huquqlari


| Rol | Vakolat |
| --- | --- |
| Administrator | Tashkilot foydalanuvchilari, rollar, baholash shkalasi, umumiy parametrlar va audit. |
| BCMS menejeri | Biznes jarayonlar, BIA, risk, strategiya, reja va ssenariylarni boshqarish. |
| Jarayon egasi | Biriktirilgan jarayonni tasvirlash, BIA ma’lumotlari va rejalar bo‘yicha fikr kiritish. |
| Risk tahlilchisi | Xavf reestri, ehtimollik/ta’sir baholari, nazorat choralari, hisobotlar. |
| Rahbariyat/tasdiqlovchi | Baholash natijalarini ko‘rish va rejalarga tasdiq berish. |
| Auditor/kuzatuvchi | Faqat ko‘rish, versiyalar va izlarning tekshiruvi. |

## 6. Funktsional talablar: MVP


| ID | Modul | Talab | Ustuvorlik |
| --- | --- | --- | --- |
| FR-01 | Kirish va rollar | Login, parolni xeshlash, kirishni roli va tashkilot bo‘yicha cheklash | MUST |
| FR-02 | Tashkilot profili | Bo‘limlar, filiallar, mas’ul shaxslar, xizmatlar | MUST |
| FR-03 | Jarayonlar reestri | Jarayon nomi, egasi, xizmat, kritikligi, holati | MUST |
| FR-04 | Aktivlar va qaramliklar | Jarayon→tizim/server/odam/provayder bog‘liqliklarini saqlash | MUST |
| FR-05 | BIA so‘rovnomasi | Ta’sir vaqt oralig‘i, zarar toifalari, MTPD, RTO, RPO | MUST |
| FR-06 | Risk reestri | Tahdid, aktiv, sabab, ehtimollik, ta’sir, choralar, qoldiq risk | MUST |
| FR-07 | Hisoblash yadrosi | Risk indeksi, BIA natija, priority score, cheklovlar | MUST |
| FR-08 | Tiklash strategiyasi | Variant, baholangan xarajat, RTO/RPO imkoniyati, tanlash | MUST |
| FR-09 | BCP/DRP rejalari | Versiyalangan reja, qadamlar, mas’ul, tasdiq, PDF eksport | MUST |
| FR-10 | Ssenariy simulyatsiyasi | Tahdid, ishdan chiqqan aktivlar, ta’sirlangan jarayonlar | MUST |
| FR-11 | Dashboard | Kritik jarayon, yuqori xavf, rejasi yo‘q jarayon, RTO/RPO gap | MUST |
| FR-12 | Audit jurnali | Kim/qachon/nimani o‘zgartirganini qayd qilish | MUST |
| FR-13 | Testlar va mashqlar | Mashq sanasi, natija, real tiklash vaqti, kamchilik | SHOULD |
| FR-14 | Eksport/Import | Excel/CSV kirishi, PDF hisobotlar | SHOULD |
| FR-15 | Bildirishnoma | Muddat, reja tasdiqlash, qayta ko‘rib chiqish eslatmalari | SHOULD |
| FR-16 | Grafik tahlil | Zanjirsimon ta’sir va tiklash tartibini ko‘rsatish | SHOULD |

MUST — birinchi ishga yaroqli versiya (MVP), SHOULD — dastlabki kengaytma.

## 7. Kirish ma’lumotlari va biznes qoidalari

## 7.1. Har bir biznes jarayoni uchun BIA kartochkasi


| Atribut | Tur/cheklov | Izoh |
| --- | --- | --- |
| process_name | matn, 3–150 belgi | Majburiy |
| owner_id | users.id | Mas’ul shaxs |
| service_id | services.id | Taqdim etiladigan xizmat |
| impact_points | 0,1,2,4,8,24,48 soat va boshqalar | Konfiguratsiya qilinadi |
| financial_impact | UZS yoki boshqa valyutada | Davr bo‘yicha yo‘qotish |
| operational_impact | 1–5 | Operatsion zarar ekspert bahosi |
| legal_impact | 1–5 | Huquqiy/me’yoriy ta’sir |
| reputational_impact | 1–5 | Obro‘ga zarar |
| mtpd_hours | 0 dan katta son | Qabul qilib bo‘lmaydigan uzilish boshlanishiga doir baho |
| rto_hours | 0 dan katta son | Rejalashtirilgan tiklash maqsadi |
| rpo_minutes | 0 yoki musbat son | Yo‘l qo‘yilgan vaqtga oid ma’lumot yo‘qotilishi |
| dependencies | aloqa jadvali | Jarayon, aktiv va uchinchi tomonlar |

Tizim validatsiyasi: RTO ≤ MTPD (agar ikkalasi berilgan bo‘lsa); RPO ≥ 0; vaqt birliklari bir xil formatga keltiriladi; mavjud zaxira nusxa intervali RPO ga mosligi avtomatik tekshiriladi.

## 7.2. BIA va risk modelining taklif etilayotgan algoritmi

A. Soddalashtirilgan risk indeksi: RiskScore = Likelihood × Impact. Har biri 1–5 ordinal shkala; natija 1–25 oralig‘idagi saralash ko‘rsatkichi, real hodisa ehtimoli yoki puldagi kutilgan zarar emas.

B. Qoldiq risk: nazorat chorasidan keyin ekspert bahosi bilan qayta belgilangan Likelihood_after × Impact_after. R0 − Rafter kamayishi qayd qilinadi; cheklovlar bilan kalibrlash zarur.

C. BIA: tanlangan t vaqt nuqtalari uchun moliyaviy zarar miqdori va operatsion, huquqiy, reputatsion ta’sir qiymatlari alohida qayd qilinadi. Ular birlashganda har bir ko‘rsatkich normallashtiriladi; vaznlar rahbariyat tasdig‘i bilan belgilanadi.

D. Ustuvorlik indeksi (tadqiqot gipotezasi): Priority = 0,40×Impact_norm + 0,25×Urgency_norm + 0,20×Risk_norm + 0,15×Dependency_norm. Barcha operandlar 0–1 oralig‘ida. Bu vaznlar ilmiy asos talab qiladigan boshlang‘ich taklif; ekspertlar bilan sezgirlik tahlili o‘tkazilgach o‘zgartirilishi mumkin.

E. Resurs bog‘liqligi: biznes jarayoni tugunlari va ularni ta’minlovchi resurslar yo‘naltirilgan graf G=(V,E) sifatida saqlanadi. Aktiv ishlamay qolsa, unga bog‘liq jarayonlar aniqlanadi. Qayta tiklash ketma-ketligi oddiy ball reytingi bilan emas, oldingi shartlarni (dependency prerequisites) hisobga olgan reja bilan belgilanadi.

F. Strategiya tanlash: variantlar orasidan RTO_actual_est ≤ RTO_target va RPO_actual_est ≤ RPO_target shartlarini qanoatlantiradigan, baholangan xarajati kichikroq yechim tavsiya qilinadi. “Mos variant yo‘q” holati alohida qaytariladi. Bashoratlar ekspert farazlari sifatida ko‘rsatiladi.

## 7.3. Hisoblashga doir ko‘rgazmali misol (sun’iy ma’lumot)


| Ko‘rsatkich | Kiritilgan qiymat | Tizim xulosasi |
| --- | --- | --- |
| Jarayon | Universitet elektron ta’lim xizmati | Kritik jarayon |
| RTO / MTPD | 4 soat / 12 soat | 4 ≤ 12 — mantiqiy mos |
| RPO | 60 daqiqa | Oxirgi qayta tiklash nuqtasi 1 soat ichida |
| Joriy zaxiralash intervali | 6 soat | RPO qondirilmasligi mumkin; RPO ≤ 1 soat talab etiladi |
| Risk: server ishlamay qolishi | P=4, I=5 | Risk indeksi 20/25 |
| Variant A | Tiklash 8 soat; ma’lumot yo‘qotish 6 soat | RTO va RPO ga mos emas |
| Variant B | Tiklash 2 soat; ma’lumot yo‘qotish 30 daqiqa | RTO/RPO ga mos (ekspert bahosi) |

Bu qiymatlar faqat matematik va funksional misol; haqiqiy tashkilot statistikasi yoki sinovdan o‘tgan natija emas.

## 8. Arxitektura va tavsiya etilgan texnologiyalar

Tanlangan arxitektura: modulga bo‘lingan yagona backend (modular monolith), veb-frontend va PostgreSQL. Boshlang‘ich bosqichda mikroservislar kerak emas; ular ilmiy ish hajmini ortiqcha murakkablashtiradi.


| Qatlam | Texnologiya | Vazifa |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Dashboard, BIA wizard, risk matrix, reja muharriri |
| Backend | Python + Django + Django REST Framework | Biznes qoidalar, API, autentifikatsiya va ruxsatlar |
| Ma’lumotlar ombori | PostgreSQL | Tashkilot, jarayon, risk, BIA, reja, audit jadvallari |
| Fon vazifalari | Celery + Redis (ixtiyoriy) | Hujjat eksporti va bildirishnomalar |
| Grafik/tahlil | NetworkX yoki maxsus graph query | Bog‘liqlik va tiklash ustuvorligini tahlil qilish |
| Vizualizatsiya | Recharts yoki Chart.js | Trend, risk matrisa, dashboard |
| Hujjatlar | DOCX/PDF shablon eksporti | BCP/DRP va BIA hisobotlar |
| Joylashtirish | Docker Compose + Nginx | Demo yoki tashkilot ichki serveri |

## 8.1. Asosiy komponentlar va chegaralari

UI (React) — faqat foydalanuvchiga ko‘rinadigan qism; hisoblash formulalarini backendga yuboradi.

API (Django REST Framework) — kirish va tashkilot doirasini tekshiradi; barcha muhim validatsiya serverda amalga oshadi.

Core Domain — Organization, BusinessProcess, Asset, Dependency, BIA, Risk, Strategy, Plan, Exercise.

Analysis Engine — RiskCalculator, BIAEvaluator, DependencyAnalyzer, StrategyEvaluator.

Report Service — tasdiqlangan BIA va reja versiyalaridan auditga yaroqli hujjatlar hosil qiladi.

Persistence — PostgreSQL, versiyalar va audit izlari; muhim hodisalar tranzaksiya doirasida saqlanadi.

## 9. Ma’lumotlar bazasi: dastlabki ER spetsifikatsiya


| Jadval | Muhim maydonlar | Bog‘lanish |
| --- | --- | --- |
| organizations | id, name, sector, timezone | 1:N departments, users |
| departments | id, organization_id, name | 1:N processes |
| users | id, organization_id, role, email, password_hash | 1:N assignments |
| services | id, organization_id, name, owner_id | 1:N processes |
| business_processes | id, service_id, owner_id, status, criticality | 1:N BIA, risks |
| assets | id, organization_id, type, name, owner_id | N:M processes |
| dependencies | id, from_type, from_id, to_type, to_id | graph E |
| bia_assessments | id, process_id, revision, mtpd_h, rto_h, rpo_min, approved_by | 1:N impacts |
| bia_impacts | id, bia_id, horizon_h, fin_loss, op_score, legal_score, reput_score | N:1 bia |
| risks | id, process_id, threat, likelihood, impact, residual, owner | 1:N controls |
| controls | id, risk_id, title, status, effectiveness_evidence | N:1 risk |
| strategies | id, process_id, estimated_rto_h, estimated_rpo_min, cost, status | N:1 process |
| continuity_plans | id, organization_id, process_id, version, status, approver | 1:N plan_steps |
| plan_steps | id, plan_id, sequence, owner_id, description, dependency_id | N:1 plan |
| scenarios | id, organization_id, title, disrupted_assets, duration | 1:N evaluations |
| exercises | id, plan_id, scenario_id, actual_recovery_h, outcome | 1:N findings |
| audit_logs | id, actor_id, organization_id, action, entity, before, after, ts | N:1 organization |

Muhim: barcha tashkilotga tegishli yozuvlar uchun organization_id orqali qat’iy ma’lumotlar chegarasi; foreign key, unikal indeks, audit yozuvi, soft delete/arxiv va versiyalar ko‘zda tutilsin.

## 10. API kontrakti (1-versiya)


| Metod | Endpoint | Vazifa |
| --- | --- | --- |
| POST | /api/v1/auth/login | Autentifikatsiya |
| GET/POST | /api/v1/processes | Jarayonlar ro‘yxati/kiritish |
| GET/POST | /api/v1/assets | Resurs va aktivlar |
| POST | /api/v1/dependencies | Bog‘liqlik yaratish |
| POST | /api/v1/bia | BIA baholashini boshlash |
| POST | /api/v1/bia/{id}/approve | BIA tasdiqlash |
| GET/POST | /api/v1/risks | Risklar reestri |
| POST | /api/v1/analyses/priority | Ustuvorlikni hisoblash |
| POST | /api/v1/scenarios/{id}/simulate | Zanjirsimon ta’sirni hisoblash |
| GET/POST | /api/v1/plans | BCP/DRP rejalar |
| POST | /api/v1/plans/{id}/publish | Rejani tasdiqlangan versiyaga chiqarish |
| GET | /api/v1/reports/organization | Dashboard uchun konsolidatsiya |
| GET | /api/v1/plans/{id}/export.pdf | PDF hujjat |

## 10.1. Algoritm API namunasi

So‘rov: {"process_id": 12, "likelihood": 4, "impact": 5, "rto_hours": 4, "rpo_minutes": 60, "backup_interval_minutes": 360}. Javob: {"risk_score": 20, "risk_class": "high", "rpo_gap": true, "observations": ["Zaxiralash intervali RPO talabidan katta"]}. Risk klassining chegaralari sozlanadigan bo‘lishi lozim.

## 11. Nofunksional talablar va axborot xavfsizligi


| ID | Talab | Qabul qilish mezoni |
| --- | --- | --- |
| NFR-01 | Kirish nazorati | Rol va organization_id cheklovi orqali ruxsatsiz obyektdan ma’lumot o‘qib bo‘lmasin. |
| NFR-02 | Auditability | Reja, baholash va tasdiqlash o‘zgarishlari foydalanuvchi/vaqt bilan qayd qilinsin. |
| NFR-03 | Ma’lumotlarning butunligi | RTO/RPO, ehtimollik, ta’sir va qarindosh foreign key qiymatlari validatsiyadan o‘tsin. |
| NFR-04 | Zaxiralash | DB zaxirasi va testli qayta tiklash ishlashi tekshirilsin. |
| NFR-05 | Xavfsizlik | HTTPS, secure cookie/session, CSRF va XSS nazorati, parametrli query, parol xesh. |
| NFR-06 | Mahsuldorlik | Demo hajmida 100 jarayon/500 risk bilan priority calculation < 3 soniya (maqsad, o‘lchash kerak). |
| NFR-07 | Eksport | BIA/BCP PDF fayli taqdim etilgan namunaga mos bo‘lsin. |
| NFR-08 | Tushuntiriluvchanlik | Har bir score uchun qiymatlar, vaznlar, formula versiyasi qayta ko‘rinsin. |
| NFR-09 | Lokalizatsiya | Asosiy interfeys o‘zbekcha; raqam/valyuta/vaqt birliklari aniq. |
| NFR-10 | Testlanuvchanlik | Barcha kritik hisoblashlar avtomatik unit-test va API-test bilan qoplansin. |

Bular talab etiladigan maqsad ko‘rsatkichlari; “erishilgan natijalar” emas. Xavfsizlik bahosi OWASP ASVS 5.0.0 mezonlari bilan o‘tkaziladi.

## 12. Foydalanuvchi ssenariylari va qabul sinovlari


| Test ID | Qisqa ssenariy | Kutilgan natija |
| --- | --- | --- |
| T-01 | Jarayon, egasi va kritik resurslar kiritiladi | Jarayon va aktivlar reestrida bog‘langan |
| T-02 | RTO=4 h, MTPD=12 h kiritiladi | BIA qabul qilinadi |
| T-03 | RTO=18 h, MTPD=12 h kiritiladi | Validatsiya xatosi |
| T-04 | P=4, I=5 kiritiladi | Risk score=20 |
| T-05 | RPO=60 min, backup=360 min | RPO gap ogohlantirishi |
| T-06 | Yagona server 3 ta xizmatni ta’minlaydi | Ssenariyda 3 ta xizmat ta’sirlangan deb belgilanadi |
| T-07 | Reja o‘zgartirilib tasdiqlanadi | Yangi versiya, eski versiya va audit saqlanadi |
| T-08 | Boshqa tashkilot foydalanuvchisi process_id ni so‘raydi | 403 yoki 404; ma’lumot qaytmasligi kerak |
| T-09 | Risk nazorati kiritilib qayta baholanadi | Risk oldin/keyin alohida saqlanadi |
| T-10 | Reja PDF eksport qilinadi | Mundarija, versiya, mas’ullar, qadamlar aniq ko‘rinadi |

## 12.1. Demo ssenariy

Pilot model: universitetning “elektron ta’lim”, “talabalar hisoboti”, “to‘lovlar”, “kutubxona” jarayonlari va ularga bog‘langan server, ma’lumotlar bazasi, elektr ta’minoti, internet provayder. Uzilish: asosiy ma’lumotlar bazasi ishlamay qoladi. Dastur qaram jarayonlarni ko‘rsatadi, ularning RTO/RPO talablari buzilishini tekshiradi va tasdiqlangan tiklash rejasini chiqaradi. Real tashkilot ma’lumotlari mavjud bo‘lmasa, sintetik deb belgilanadi.

## 13. Ilmiy yangilik gipotezasi va tadqiqot dizayni

## 13.1. Ilmiy yangilik sifatida SINOVDAN O‘TKAZILADIGAN taklif

Risk darajasi, BIA zarar profili, RTO bilan ifodalangan shoshilinchlik va resurs bog‘liqliklarini birlashtirgan tushuntiriluvchi ustuvorlik modeli hamda ushbu model asosida tiklash rejalarini muvofiqlashtiruvchi algoritm taklif etiladi. Bu “mutlaqo birinchi yangi model” degan da’vo emas; yangilik darajasi avvalgi adabiyotlar va amaliy natijalar bilan tekshiriladi.

## 13.2. Tajriba-sinov rejasi

Kamida 10–20 biznes jarayon, 20–40 risk, 10–20 aktiv va 3–5 uzilish ssenariysidan iborat pilot ma’lumotlar to‘plamini shakllantirish (miqdor pilot imkoniyatiga qarab aniqlanadi).

Nazorat guruhi/etalon: Excel va qo‘lda to‘ldiriladigan BIA/BCP; tadqiqot guruhi: ishlab chiqilgan BCMS Designer.

Har ikki yondashuvda bir xil kirish ma’lumotlari va ssenariylar bilan ish bajarish.

O‘lchovlar: BIA to‘ldirish vaqti, risk ustuvorligini hisoblash vaqti, rejadagi yetishmayotgan bandlar, RTO/RPO kamchiliklarini aniqlash, hisoblarning qayta tiklanishi, foydalanuvchi xatolari.

Domen ekspertlari ko‘rigi: 3–5 nafar baholovchi orqali ustuvorlik va tiklash ketma-ketligining asoslanganligini tekshirish; ekspert kelishuvini qayd etish.

Natijalarni statistika bilan bayon qilish; kuzatilmagan foyda, kamaygan downtime yoki “aniqlik foizi”ni keltirmaslik.

## 13.3. Bosqichlar


| Davr | Natija |
| --- | --- |
| 2026-yil oktabr | Tahlil, talablar, maket, BIA savolnomasi, DB sxemasi |
| 2026-yil noyabr | Asosiy modullar va hisoblash yadrosi prototipi |
| 2026-yil dekabr | BCP, risk, scenario, eksport va funksional sinov |
| 2027-yil yanvar | Tajriba va natijalar tahlili, dissertatsiyaning asosiy boblari |
| 2027-yil fevral–mart | Ilmiy rahbar bilan tahrir, zaif joylarni tuzatish, ilmiy xulosalar |
| 2027-yil aprel–iyun | Rasmiylashtirish, taqdimot, dastlabki va rasmiy himoya |

## 14. Magistrlik dissertatsiyasi tuzilishi

## KIRISH

Dolzarblik; maqsad-vazifalar; ob’ekt va predmet; o‘rganilganlik darajasi; metodlar; sinov bilan asoslanadigan ilmiy yangilik; amaliy ahamiyat; ish tuzilishi.

## I BOB. BCM/BCMS nazariy asoslari va mavjud axborot tizimlari tahlili

1.1. Biznes uzluksizligi, BCP, DRP, RTO, RPO va MTPD. 1.2. ISO 22301, ISO/TS 22317 va ISO/IEC 27031 talablari. 1.3. ServiceNow, Fusion, Meridian, Quantivate, eramba va tadqiqot bo‘shlig‘i.

## II BOB. Tashkilot biznes uzluksizligini modellashtirish usullari

2.1. Biznes jarayonlari, aktivlar va ularning bog‘liqliklari modeli. 2.2. Risk va BIA baholash modeli. 2.3. Tiklash ustuvorligi va strategiya tanlash algoritmi, formula tanlash asoslari, sezgirlik tahlili.

## III BOB. BCMS Designer dasturini ishlab chiqish va sinovdan o‘tkazish

3.1. Arxitektura, texnologiyalar, ER modeli va API. 3.2. Funksional modullar va foydalanuvchi ssenariylari. 3.3. Tajriba-sinov, benchmark, xavfsizlik sinovi va natijalarning statistik tahlili.

## YAKUNIY QISMLAR

Xulosa; tavsiyalar; foydalanilgan manbalar; ilovalar (diagrammalar, dastur ekranlari, kod fragmentlari, savolnoma, test protokollari va foydalanish yo‘riqnomasi).

## 15. Tayyor mahsulotning qabul qilinishi uchun natijalar to‘plami

Versiyalangan kod va o‘rnatish bo‘yicha README (git repozitoriy).

Ma’lumotlar bazasi migratsiyalari va sintetik demo data.

Tizimning oddiy o‘zbekcha veb-interfeysi va ma’muriy paneli.

BIA, risk, scenario va BCP/DRP modullarining ishlashi.

API spetsifikatsiyasi (OpenAPI), ER diagramma, UML/use-case tasvirlari.

Avtomatik testlar protokoli, xavfsizlik tekshiruvi va funksional akt.

Pilot bo‘yicha Excel va BCMS Designer usullarining o‘lchangan qiyosi.

Foydalanuvchi va administrator yo‘riqnomalari, PDF hisobot namunalari.

Magistrlik dissertatsiyasi uchun nazariy, algoritmik va tajriba natijalari.

## 16. Foydalanilgan asosiy manbalar

Foydalanuvchi yuklagan: M_ASOSNOMA.docx, ITI-IPI_ALIYEV-f.docx, kalenadar_reja_Aliyev.docx, “12-son IA (Aniq fanlar) personal.pdf”, taqdimot.

ISO 22301:2019. Security and resilience — Business continuity management systems — Requirements. 2024 Amendment 1. https://www.iso.org/standard/75106.html

ISO/TS 22317:2021. Guidelines for business impact analysis. https://www.iso.org/standard/79000.html

ISO/IEC 27031:2025. ICT readiness for business continuity. https://www.iso.org/standard/27031

NIST SP 800-34 Rev. 1. Contingency Planning Guide for Federal Information Systems. https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final

OWASP ASVS 5.0.0. https://owasp.org/projects/asvs

ServiceNow Business Continuity Management. https://www.servicenow.com/products/business-continuity-management.html

Fusion Risk Management, BCM. https://www.fusionrm.com/solutions/business-continuity-management/

Continuity2 Meridian BCMS. https://continuity2.com/business-continuity-management-software

Quantivate Business Continuity. https://quantivate.com/business-continuity-software/

eramba, Business Continuity Plans module. https://www.eramba.org/learning/courses/69/episodes/436


