# motion-effects integratsiyasi

O‘rnatish: `npx --yes skills add https://github.com/charlie947/motion-graphics-skills --skill motion-effects --agent codex --yes`.

Skill `.agents/skills/motion-effects/` ichida, manba versiyasi `skills-lock.json` ichida saqlanadi. Asl retseptlar va ko‘rsatmalar o‘zgartirilmagan. Litsenziya: `frontend/public/licenses/motion-effects.txt`.

Sayt bo‘ylab qo‘llangan effektlar: faol menyu/panelning umumiy belgisi, qidiruv natijalarining ketma-ket ochilishi, kartochkadan ish oynasiga o‘tish, KPI kartochkalarining ko‘tarilishi, sarlavha niqobi, ma’lumotlari saqlanadigan ustun → chiziq grafigi va haqiqiy bog‘liqlik chiziqlaridagi oqimlar.

Kirish sahifasi va dashboarddagi **UzHi qanday ishlaydi?** tugmasi 8 soniyalik mahsulot ko‘rinishini ochadi. Unda ayni kartochka to‘liq ishchi maydonga kengayadi, jarayon → BIA/risk → reja oqimi yoritiladi. Yangi operatsion ma’lumot yoki sun’iy KPI yaratilmaydi.

Brend va harakat tafsilotlari: `brand.md`, `MOTION.md`. Jonli shakllarda qisqa, foydalanuvchi amali bilan boshlanadigan o‘tishlar ishlatiladi; eksportga yaroqli mahsulot ko‘rinishi alohida deterministik HTML hisoblanadi. Sayt vazifasiga aloqasi bo‘lmagan media yoki logotip effektlari ishchi interfeysga tiqishtirilmagan.

Tekshirish:

```sh
cd frontend
npm run build
npm test
npm run test:effects
```

`test:effects` yig‘ilgan `dist` fayllarini Playwright ichida yetkazadi, API javoblarini esa faqat test ma’lumotlari bilan almashtiradi. Mahalliy server talab qilinmaydi va productionga yozuv yuborilmaydi. `EXPERIENCE_BASE_URL` berilsa, shu URLdagi build sinaladi; API yozuvlari baribir taqiqlanadi.

Sinov yetti animatsiya kadrini (0, 1, 2.2, 4.4, 6.6, 7.9, 8 s), takrorlanish chegarasini, orqaga seek, offline resurslar, haqiqiy diagramma qiymatlari, pauza/replay, fokus va Escape, saqlanadigan harakat sozlamasi, reduced-motion, light/dark, mobil ko‘rinish, login va bo‘sh ma’lumot holatini tekshiradi.
