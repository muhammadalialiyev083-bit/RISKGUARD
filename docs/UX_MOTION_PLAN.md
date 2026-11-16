# UzHi dashboard va yo‘riqnoma dizayni

Foydalanuvchi bergan https://www.fusionrm.com/ va uning ochiq platforma sahifasi umumiy operatsion ko‘rinish uchun namuna: xizmatlar, bog‘liqliklar, risklar va tiklanish bir ish oqimida ko‘rsatiladi. UzHi o‘z brendi, o‘z ma’lumotlari va o‘z domain formulalaridan foydalanadi.

## Dizayn qarorlari

- Ranglar: siyoh `#102433`, dengiz `#162F40`, firuza `#52CAB4`, qog‘oz `#FFFFFF`, tuman `#EDF3F3`, ogohlantirish `#E9B56A`. Mavjud semantik tokenlar va light/dark mavzular saqlanadi.
- Shrift: lokal IBM Plex Sans; matn 14, izoh 12, asosiy sarlavha 28, raqam 38 px. Kontent chapga tekislanadi.
- Foydalanuvchining video va yangi to‘liq logosi asosiy brend ifodasi. Kartalar sokin va o‘qiladigan; fon past kontrastda, to‘xtatiladigan va harakatni kamaytirish sozlamasiga mos bo‘ladi.
- Header va tashkilot konteksti bitta sticky qatlamda. Logoni bosish dashboardga qaytaradi.

```text
logo + navigatsiya | sticky header / kontekst
                  | xush kelibsiz / navbatdagi aniq qadam
                  | filtrlar / haqiqiy KPI
                  | risk matritsasi / BIA va rejalar qamrovi
                  | boshlash ketma-ketligi / bog‘liqliklar
                  | hisobot eksporti / bog‘langan bo‘limlar
```

Har bir bo‘limda mavzuga mos shaffof illyustratsiya, shu bo‘lim yozuvlaridan olingan vizual ko‘rsatkich va uch bosqichli yo‘riqnoma bo‘ladi. Bo‘limlar kiruvchi ma’lumotlar va keyingi natija orqali bog‘lanadi.

## Brief bilan tekshirish

Umumiy marketing bloklari o‘rniga BIA → risk → reja → sinov ketma-ketligi asos bo‘ladi. Ko‘rsatkichlar uydirma tarixiy trend yoki tayyorgarlik sertifikati sifatida taqdim etilmaydi. Qadamlar mavjud yozuvlar orqali tekshiriladi; birinchi ish yangi foydalanuvchiga aniq ko‘rsatiladi. Motion-background uchun bir aktiv fon drayveri, offscreen/hidden pause, statik poster va freeze-harness tekshiruv sahifasi qo‘llanadi.
