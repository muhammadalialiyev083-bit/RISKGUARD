# Dashboard hisobotini yuklab olish

**Boshqaruv paneli** va **Hisobotlar** sahifalaridagi **Dashboard hisoboti** bo'limi joriy tashkilotning KPI ko'rsatkichlarini **Markdown (.md)** yoki **JSON (.json)** fayliga yuklaydi. Mavjud PDF va CSV eksportlari ham saqlanadi.

Har bir yuklab olish mavjud sessiya orqali `GET /api/v1/reports/organization` so'rovini tanlangan `from`, `to` va `service` filtrlari bilan qayta bajaradi. Backendning mavjud tashkilot bo'yicha ruxsatlari amal qiladi. Hisobot jami 10 ta KPI, tashkilot nomi, API manbasi, filtrlar va ma'lumot olingan UTC vaqtini saqlaydi. Sahifalangan jarayonlar ro'yxatidan umumiy sonlar hisoblanmaydi. Manba URL'ida faqat shu uchta filtr qoldiriladi, sessiya parametrlari va fragmentlar chiqarib tashlanadi.

Bu joriy holat hisoboti: sana filtri jarayonning yaratilgan sanasiga tegishli, tarixiy trend yoki oldingi davrga nisbatan o'zgarishlar hisoblanmaydi. Backenddagi mavjud hisoblashga muvofiq jami aktivlar tashkilot bo'yicha, qolgan KPI tanlangan jarayonlar bo'yicha olinadi. Server qaytarmagan ko'rsatkichlar `null` / `Mavjud emas` deb belgilanadi. Dashboard yuklanmagan yoki xato bo'lsa eksport mavjud emas; yuklab olish paytidagi sessiya yoki server xatosida fayl yaratilmaydi. Hisob yoki sahifa almashganda eski so'rov fayl yaratishi bloklanadi.

## Skill bilan bog'liqligi

`firecrawl-dashboard-reporting` loyihaga `.agents/skills/firecrawl-dashboard-reporting/SKILL.md` sifatida o'rnatilgan; manba `skills-lock.json` da qayd etilgan. Hisobot uning `reportedAt`, `dateRange`, `dashboards`, `metrics`, `tables`, `exports`, `summary` tuzilmasi va ma'lumot sifati ko'rsatmalariga moslashtirilgan.

Saytning yuklab olish funksiyasi mavjud autentifikatsiyalangan API javobidan foydalanadi (`collectionMethod: authenticated-dashboard-api`). Firecrawl orqali brauzerdan ma'lumot yig'ish ishga tushirilmagan. Ushbu funksiya Firecrawl kalitini talab qilmaydi va brauzerga API kaliti qo'shilmaydi. Firecrawl'ning o'zida tashqi dashboardlarni o'qitish alohida ulanish va `FIRECRAWL_API_KEY` talab qiladi.

## Tekshirish va chiqarish

`frontend/` ichida:

```sh
npm ci
npm test
npm run build
# Alohida terminalda: npm run preview -- --port 5176
npm run test:reports
```

Tizimga kirib, Dashboard'da har ikkala formatni yuklang. JSON/Markdown qiymatlarini dashboard bilan solishtiring. Backend javob bermaganda yoki sessiya tugaganda yangi fayl yaratilmasligini tekshiring.

Ushbu o'zgarish uchun `npm test` (19 ta test) va `npm run build` muvaffaqiyatli bajarildi. Build qilingan interfeys Chromium'da alohida API test javoblari bilan tekshirildi: JSON va Markdown fayllari yuklandi, qiymatlar yangidan olindi, sana/xizmat filtrlari saqlandi, 503 xatosida fayl yaratilmadi, PDF/CSV tugmalari saqlandi va 390 px ekranda tugmalar sig'di. Bu eksport tekshiruvlari ishlab turgan saytdagi ma'lumotlar bilan o'tkazilmagan. Production frontend va backendning anonim CSRF endpointlari JSON qaytarishi alohida tekshirildi.

Hisobot funksiyasi frontendda bajarilgan; unga backend yoki baza migratsiyasi qo'shilmagan. GitHub `main` manbasi jonli saytda ishlayotgan `5cd71fd` versiyasi bilan birlashtirilib, hisobot shu interfeysga kiritiladi. Netlify build toza `npm ci --no-audit --no-fund && npm run build` buyrug'idan foydalanadi; bu repozitoriyda saqlangan Windows dependency fayllari Linux buildiga xalaqit berishini oldini oladi. Netlify'da base `frontend`, publish `dist`.
