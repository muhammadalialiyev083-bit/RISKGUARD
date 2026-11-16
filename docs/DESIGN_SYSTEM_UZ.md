# UzHi dizayn tizimi

## Maqsad va dizayn rejasi

UzHi tashkilot rahbarlari va biznes uzluksizligi mutaxassislari uchun ishchi platforma. Dizayn jarayon, risk va tiklanish orasidagi bog'lanishni tushunarli ko'rsatishi, ma'lumot kiritish va qaror qabul qilishni yengillashtirishi kerak.

Asosiy palitra: Ink `#102433`, Panel `#162F40`, Teal `#52CAB4`, Slate `#AAC0CA`, Mist `#EDF3F3`, Paper `#FFFFFF`. Xato va ogohlantirish ranglari alohida semantik vazifani bajaradi. Yorug' rejimda tealning to'q varianti matn va tugma kontrastini saqlaydi.

Shrift: mahalliy joylashtirilgan **IBM Plex Sans**, 100–700 variable. Matn 14 px, maydon yorliqlari 13 px, sarlavhalar 22–36 px, kirish sahifasidagi asosiy jumla moslashuvchan katta o'lchamda. Raqamlar tabular ko'rinishdan foydalanadi.

Kirish sahifasi chapga tekislangan, uzluksizlikni tushuntiradigan ish oqimi va o'ngda alohida kirish formasidan iborat:

```text
UzHi                         Hisobingizga kirish
Uzilishlardan oldin           Login
tayyor bo'ling.               Parol
                             [Tizimga kirish]
Jarayon → Risk → Tiklanish    Kirish usullari va xavfsizlik
```

Dashboard: barqaror navigatsiya, aniq sarlavha, sana/xizmat filtrlari, eksport va haqiqiy KPI. Mobil ekranda menyu ochiladigan panelga, forma va tugmalar bir ustunga moslashadi.

## Rejani qayta ko'rib chiqish

Umumiy SaaS ko'rinishiga olib keladigan dekorativ orbitlar, tarqoq porlashlar va takroriy katta harfli yorliqlar chiqariladi. Asosiy vizual urg'u UzHi'ning o'z ish oqimiga beriladi: jarayonni aniqlash, riskni baholash, tiklanishni rejalash. Ranglar mavjud brenddan rivojlantiriladi. Animatsiya foydalanuvchi amaliga javob beradi; reduced-motion sozlamasi hisobga olinadi.

## Token arxitekturasi

`frontend/design-tokens.json` yagona manba: primitive → semantic → component. `frontend/src/styles/tokens.css` skillning generatori orqali yaratiladi. Komponentlar `var()` havolalaridan foydalanadi; yorug'/qorong'i rejim semantik qatlamda almashtiriladi. Mavjud modullar `--bg`, `--panel`, `--text` kabi moslik aliaslari orqali tizimdan foydalanadi.

```sh
cd frontend
npm run design:tokens
```

Tugma, input, karta, fokus va matn o'lchamlari nomlangan komponent tokenlariga bog'langan. Hover, active, focus, disabled va loading holatlari saqlanadi. Muhim amallar uchun rangdan tashqari matn/ikonka ham ishlatiladi.

## Skill va shrift manbalari

- `design-system`: nextlevelbuilder/ui-ux-pro-max-skill; paket `.agents/skills/design-system` ichida.
- `frontend-design`: anthropics/skills; paket `.agents/skills/frontend-design` ichida.
- Avvalgi `firecrawl-dashboard-reporting` saqlanadi; manbalar `skills-lock.json` da qayd etiladi.
- IBM Plex Sans: `@fontsource-variable/ibm-plex-sans` 5.3.0, SIL Open Font License. Latin variable fayli va litsenziya `frontend/public/fonts` ichida; tashqi font serveriga so'rov yuborilmaydi.

Bu o'zgarishlar frontend taqdimoti va dizayn vositalariga tegishli. Autentifikatsiya, tashkilot izolatsiyasi, hisoblash formulalari va baza migratsiyalari o'zgartirilmaydi.

## Tekshirish

- `npm test`: 19 ta mavjud test o'tdi; `npm run build` o'tdi.
- Skillning `validate-tokens.cjs --dir frontend/src/styles` tekshiruvi token qatlamida buzilish topmadi. Mavjud modullarning qolgan CSS qoidalari bosqichma-bosqich aliaslar orqali moslashtiriladi; butun eski kod tokenlarga o'tkazilgan deb hisoblanmaydi.
- Chromium'da mahalliy production build va ajratilgan API javoblari bilan: kirish/chiqish, parol ko'rsatish, yorug'/qorong'i rejim, klaviatura fokusi, yangi jarayon dialogi, mobil menyu, 390 px ekranda gorizontal overflow yo'qligi, reduced-motion va mahalliy shrift yuklanishi tekshirildi.
- Asosiy tugma matnining kontrasti qorong'i rejimda 7.92:1, yorug' rejimda 5.36:1.
- Hisobot sinovida JSON/Markdown yuklandi, sana/xizmat filtrlari saqlandi, server xatosida fayl yaratilmagan va mavjud PDF/CSV tugmalari saqlangani tekshirildi.
- Vizual va eksport sinovlari sun'iy API javoblaridan foydalanadi; ular production ma'lumotlarini yaratmaydi yoki o'zgartirmaydi.
