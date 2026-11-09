# Login tuzatishi

## Sabab va yechim

Django kirishdan so‘ng CSRF tokenini almashtiradi. Frontend eski tokenni saqlab
qolgani uchun keyingi POST so‘rovlari, jumladan tizimdan chiqish, 403 qaytargan.
Chiqish xatosi yashirilgani sabab brauzerdagi sessiya ochiq qolgan va hisobni
almashtirish ham ishlamagan.

Frontend endi kirish/chiqish javobidan yangilangan tokenni oladi. Eski server
tokenni qaytarmasa, uni qayta so‘raydi. Boshqa oynada token o‘zgarganda faqat
CSRF sabab rad etilgan so‘rov bir marta qayta yuboriladi. Oddiy ruxsat yoki
parol xatolari qayta yuborilmaydi.

Login ham CSRF tekshiruvini bajaradi. Autentifikatsiya javoblari keshga
yozilmaydi. Paroldagi bosh va oxirgi bo‘shliqlar saqlanadi. Chiqish xatosi
ko‘rsatiladi; muvaffaqiyatli chiqishda foydalanuvchi ma’lumotlari tozalanadi.

## Mahalliy ishga tushirish

HTTP orqali ishlashda backend uchun `DEBUG=True` belgilang. Bu cookie’larni
`SameSite=Lax; Secure=False` bilan yuboradi. Vite’ning `/api` proksisi
`127.0.0.1:8000` dagi Django’ga murojaat qiladi.

```sh
cd backend
DEBUG=True python manage.py runserver 127.0.0.1:8000
```

Boshqa terminalda:

```sh
cd frontend
npm run dev
```

Frontendni `http://localhost:5173` yoki `http://127.0.0.1:5173` orqali oching.

## Jonli serverga qo‘llash

Bu loyiha Sites orqali joylashtirilmagan. Mavjud Netlify va Render loyihalarida
ikkala qismni ham qayta joylashtirish kerak. Avval yangi frontendni, keyin
backendni joylashtirish eski backend bilan moslikni saqlaydi.

- Netlify: `frontend` katalogida `npm run build`, nashr katalogi `dist`.
  `public/_redirects` faylidagi `/api/*` proksisi SPA qoidasidan oldin turishi kerak.
- Render: Django xizmatini yangilang va qayta ishga tushiring. Production’da
  `DEBUG=False` va doimiy `SECRET_KEY` ishlating. Mavjud ma’lumotlar bazasi
  sozlamalarini saqlang.
- Manzil o‘zgarsa, `ALLOWED_HOSTS` ga backend hostini,
  `CSRF_TRUSTED_ORIGINS` va `CORS_ALLOWED_ORIGINS` ga esa to‘liq HTTPS
  frontend manzilini yozing. Ro‘yxatlar vergul bilan ajratiladi.
- Amaldagi foydalanuvchi va parollarni ishlating. Bu tuzatish hisoblarni yoki
  parollarni qayta yaratmaydi; bazani qayta seed qilish talab qilinmaydi.

Production’da `Secure=True; SameSite=None` sozlamalari saqlanadi. Yangi
ma’lumotlar bazasi migratsiyasi talab qilinmaydi.

## Tekshiruv

```sh
cd backend
DEBUG=True python -m pytest -q
python manage.py check
cd ../frontend
npm test
npm run build
```

Brauzerda: kiring → sahifani yangilang → ruxsat etilgan amalni bajaring →
chiqing → boshqa hisob bilan kiring. Chiqishdan so‘ng `/api/v1/auth/me`
autentifikatsiya xatosini qaytarishi kerak.
