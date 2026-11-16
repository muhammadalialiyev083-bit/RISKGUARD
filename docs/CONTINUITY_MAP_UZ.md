# Hududiy tiklanish xaritasi

`map-animation` skillining GeoJSON/SVG yo‘li UzHi saytiga amaliy tatbiq etildi.

## Qayerdan ochiladi

- Boshqaruv panelidagi **Tiklanish yo‘nalishini xaritada ko‘ring → Xaritani ochish** kartasi.
- Chap menyudagi **Hududiy xarita** bo‘limi.
- Tizimga kirgandan keyin `/map` manzili.

## Nimalar bajariladi

1. Asosiy, zaxira yoki hamkor manzilini nomi va koordinatasi bilan qo‘shing. O‘zbekiston shaharlari ro‘yxati taxminiy markazni tez tanlash uchun berilgan; aniq manzil koordinatasini tahrirlash mumkin.
2. Yo‘nalish ro‘yxatida manzillarni tartiblang, tahrirlang yoki olib tashlang. Animatsiya aynan shu ketma-ketlikdan hosil bo‘ladi.
3. **Ijro etish**, pauza, boshidan boshlash va vaqt chizig‘i orqali animatsiyani boshqaring. Manzilni xaritada yoki ro‘yxatda tanlab yaqinlashtiring. **Umumiy ko‘rinish** barcha joylarni qaytaradi.
4. **GeoJSON nusxa** orqali rejani yuklab oling. **Rejani yuklash** oldin ko‘rib chiqish bosqichini ochadi; **Rejani almashtirish** bosilgach nusxa amaldagi shaxsiy rejaga aylanadi.

Yangi foydalanuvchida Toshkent → Samarqand → Buxoro **namuna** sifatida ko‘rsatiladi. Namuna tashkilot ma’lumoti sifatida saqlanmaydi. **Mening rejam** boshida bo‘sh bo‘ladi.

## Ma’lumot va chegaralar

- Reja `localStorage` orqali foydalanuvchi ID va tashkilot ID bo‘yicha alohida saqlanadi. Bu brauzerdagi shaxsiy rejalashtirish vositasi; u tashkilotning umumiy reyestri bilan sinxronlashmaydi. Boshqa qurilmaga o‘tishda GeoJSON nusxadan foydalaning.
- Brauzer saqlashni bloklasa, o‘zgarish ochiq oynada qoladi va aniq ogohlantirish chiqadi. Oynani yopishdan oldin GeoJSON nusxasini olish mumkin.
- Ko‘pi bilan 20 ta manzil; import fayli 128 KB gacha. Nom, manzil turi, identifikator va koordinatalar tekshiriladi. Xato import mavjud rejani almashtirmaydi.
- Nuqtalar GeoJSON tartibida `[longitude, latitude]` saqlanadi. Kenglik −85…85, uzunlik −180…180 oralig‘ida.
- Masofa Yer sferasidagi eng qisqa geografik yoy bo‘yicha hisoblanadi. Chiziqlar avtomobil marshruti, transport vaqti yoki haqiqiy tiklanish testi natijasi emas.
- Xarita chegaralari Natural Earth ma’lumotlaridan olingan, umumlashtirilgan geografik fon. Ma’lumot paketga kiritilgan; manzillar tashqi xarita yoki geokodlash xizmatiga yuborilmaydi. [Manba va litsenziya](WORLD_MAP_LICENSE.md).

## Skill qanday ishlatildi

- D3 geografik proyeksiyasi bazaviy xarita, belgilar va yo‘nalishlar uchun umumiy koordinata tizimini beradi.
- Yo‘nalish geografik yoydan olinadi va `stroke-dashoffset` bilan ketma-ket ochiladi; belgi tushishi, yozuvlar va hudud ajratilishi bir xil manzillar massiviga bog‘langan.
- Grafik holat 12 fps qadamda yangilanadi, kamera 24 fps vaqt chizig‘idan foydalanadi. Har bir kadr raqami aniq tanlanadi; animatsiya qiymatlari tasodifiy son yoki joriy sanaga bog‘liq emas.
- Kadrlar muzlatilib tekshiriladi; mobil belgi va yozuvlar ekran o‘lchamiga moslanadi. Klaviatura orqali nuqta tanlash va harakatni kamaytirish sozlamasi qo‘llanadi.
- Xarita sahifasi va ma’lumotlari alohida, kerak bo‘lganda yuklanadigan paketga ajratilgan.

## Tekshirish

`frontend/` ichida:

```bash
npm ci --no-audit --no-fund
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 5197 --strictPort
# Boshqa terminalda:
MAP_BASE_URL=http://127.0.0.1:5197 npm run test:map
REPORT_BASE_URL=http://127.0.0.1:5197 npm run test:reports
```

Testlar alohida API javoblari va brauzer saqlash joyida ishlaydi. Tashkilot yozuvlarini yaratmaydi yoki o‘zgartirmaydi. Xarita testi import/eksport, xato import, ketma-ketlik, saqlash, hisoblar izolatsiyasi, koordinatalar, kadrlar va real chiziq ochilishi, global/antimeridian ko‘rinishi, mobil ekran, tema hamda harakatni kamaytirishni tekshiradi.
