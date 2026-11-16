# Dashboard hisobotini yuklab olish

Dashboard tepasidagi **Dashboard hisoboti** bo'limi joriy tashkilotning KPI ko'rsatkichlarini **Markdown (.md)** yoki **JSON (.json)** fayliga yuklaydi.

Har bir yuklab olish mavjud sessiya orqali `GET /api/v1/reports/organization` so'rovini qayta bajaradi. Backendning mavjud tashkilot bo'yicha ruxsatlari amal qiladi. Hisobot jami 10 ta KPI, tashkilot nomi, API manbasi va ma'lumot olingan UTC vaqtini saqlaydi. Sahifalangan jarayonlar ro'yxatidan umumiy sonlar hisoblanmaydi.

Bu joriy holat hisoboti: tarixiy davr filtri yoki oldingi davrga nisbatan o'zgarishlar mavjud emas. Server qaytarmagan ko'rsatkichlar `null` / `Mavjud emas` deb belgilanadi. Dashboard yuklanmagan bo'lsa tugmalar o'chiriladi; yuklab olish paytidagi sessiya yoki server xatosi foydalanuvchiga ko'rsatiladi va fayl yaratilmaydi.

## Skill bilan bog'liqligi

`firecrawl-dashboard-reporting` loyihaga `.agents/skills/firecrawl-dashboard-reporting/SKILL.md` sifatida o'rnatilgan; manba `skills-lock.json` da qayd etilgan. Hisobot uning `reportedAt`, `dateRange`, `dashboards`, `metrics`, `tables`, `exports`, `summary` tuzilmasi va ma'lumot sifati ko'rsatmalariga moslashtirilgan.

Saytning yuklab olish funksiyasi mavjud autentifikatsiyalangan API javobidan foydalanadi (`collectionMethod: authenticated-dashboard-api`). Firecrawl orqali brauzerdan ma'lumot yig'ish ishga tushirilmagan. Ushbu funksiya Firecrawl kalitini talab qilmaydi va brauzerga API kaliti qo'shilmaydi. Firecrawl'ning o'zida tashqi dashboardlarni o'qitish alohida ulanish va `FIRECRAWL_API_KEY` talab qiladi.

## Tekshirish va chiqarish

`frontend/` ichida:

```sh
npm ci
npm test
npm run build
```

Tizimga kirib, Dashboard'da har ikkala formatni yuklang. JSON/Markdown qiymatlarini dashboard bilan solishtiring. Backend javob bermaganda yoki sessiya tugaganda yangi fayl yaratilmasligini tekshiring.

Ushbu o'zgarish uchun `npm test` (16 ta test) va `npm run build` muvaffaqiyatli bajarildi. Build qilingan interfeys Chromium'da alohida API test javoblari bilan tekshirildi: ikkala fayl yuklandi, qiymatlar yangidan olindi, 503/403 xatolarida fayl yaratilmadi, dashboard yuklanmaganda tugmalar o'chirildi va 390 px ekranda tugmalar sig'di. Bu tekshiruv ishlab turgan saytdagi ma'lumotlar bilan o'tkazilmagan.

O'zgarish frontendda bajarilgan; baza sxemasi va migratsiyalar o'zgarmaydi. Jonli saytga chiqarish uchun tekshirilgan frontend buildini odatdagi Netlify/Render jarayoni orqali deploy qilish kerak. Muddati tugagan PostgreSQL bazasi alohida tiklanishi yoki almashtirilishi kerak.
