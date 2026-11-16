# Dashboard, logo va bosqichli ish oqimi

## Foydalanuvchiga ko‘rinadigan o‘zgarishlar

- Header va tashkilot konteksti bitta sticky qatlamda: sahifa scroll qilinganda yuqorida qoladi.
- Foydalanuvchi taqdim etgan UzHi qalqoni, yozuvi va shiori to‘liq logo sifatida sidebar, mobil header, kirish va sessiya sahifalarida ishlatiladi. Logo dashboardga olib boradi.
- [Fusion ochiq platforma sahifasi](https://www.fusionrm.com/platform/) namunasi asosida umumiy boshqaruv paneli: KPI, risk matritsasi, BIA va reja qamrovi, jarayonlar muhimligi, boshlash qadamlari va bog‘liqliklar xaritasi.
- Foydalanuvchi videosi dashboard foniga joylashtirildi. U ovozsiz, H.264, 1280×720, 24 fps, taxminan 20 soniya. Hajmi 7.8 MB dan 1.8 MB gacha kamaytirildi; oxiri boshlang‘ich kadrga yumshoq ulanadi. To‘xtatish/ijro boshqaruvi bor.
- Har bir asosiy bo‘lim va uning ichki kategoriyasiga mazmunga mos past opacity SVG illyustratsiyasi, joriy yozuvlardan diagramma va uch qadamli ko‘rsatma qo‘shildi. Ko‘rsatmani yig‘ish va qayta ochish mumkin.
- Tashkilot → xizmat → jarayon → aktiv/bog‘liqlik → BIA → risk → strategiya/reja → sinov → hodisa/vazifa → hisobot/audit yo‘nalishi ishlaydigan havolalar bilan bog‘landi.
- Boshlash tugmasi navbatdagi tugallanmagan qadamni ochadi. Kerakli joyda haqiqiy yaratish yoki tahrirlash formasi avtomatik ochiladi. Ichki tablar ham deep link va browser back/forward bilan ishlaydi.
- Dashboard matritsasidagi katak risklar reestrini tegishli ehtimollik/ta’sir filtri bilan ochadi. Muhimlik diagrammasi jarayonlar reestriga filtr bilan olib boradi.
- Hududiy xaritada nuqtani bosib koordinata tanlash qo‘shildi. Manzillar, tartib, animatsiya, pauza, yaqinlashtirish, import/eksport, xato import, hisoblar ajratilishi va saqlash xatolari brauzerda tekshirildi.

## Ma’lumotlarning ma’nosi

KPI va grafiklar mavjud API yozuvlaridan olinadi. Tarixiy trend, moliyaviy zarar yoki haqiqiy sinovdan o‘tmagan tayyorgarlik ballari uydirilmaydi. BIA/reja qamrovi tegishli tasdiqlangan yoki e’lon qilingan yozuvga ega jarayonlar ulushini bildiradi. Dastlabki sakkiz qadam dasturga boshlang‘ich ma’lumot kiritilganini bildiradi; u sertifikat yoki uzluksizlik kafolati emas.

Boshlash ko‘rsatkichlari dashboard filtrlaridan oldingi to‘liq workspace ma’lumotlaridan olinadi. Yangi saqlangan tashkilot profili serverdan qayta o‘qiladi. Auditorga yozuv yaratish formasi ochilmaydi.

Xarita rejalari avvalgi kabi shu brauzerda foydalanuvchi va tashkilot ID bo‘yicha alohida saqlanadi. Boshqa qurilmaga o‘tish uchun GeoJSON ishlatiladi; xarita bo‘limidagi eslatma bu chegarani ochiq ko‘rsatadi.

## motion-background qanday tatbiq etildi

Manba: [iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills), `motion-background`.

- Asosiy fon foydalanuvchi videosidan foydalanadigan bitta native video drayveri.
- Oyna yashiringanda yoki dashboard ko‘rinmay qolganda ijro pauzaga o‘tadi. Komponent yopilganda media va observerlar tozalanadi.
- `prefers-reduced-motion` uchun statik poster. Video yuklanmasa CSS mesh zaxira foni ishlaydi; unda ham pauza tugmasi ishlaydi. Bir vaqtning o‘zida bitta fon drayveri ko‘rsatiladi.
- Matn va kartalar ostidagi scrim video yorug‘ligidan qat’i nazar o‘qilishni saqlaydi. Video 720p o‘lchamda dekodlanadi, shader yoki canvas yuklamasi qo‘shilmaydi.
- `/dashboard?motion_t=0`, `10`, `20` tekshiruv vaqtini muzlatadi.
- `/motion-background-preview.html?t=0`, `12`, `24` — CSS, JavaScript va logo ichiga joylangan mustaqil HTML. Muhitdagi Chrome `file://` manzillarini administrator siyosati bilan bloklagani sababli o‘sha protokol bevosita tekshirilmadi; bir xil HTML localhost HTTP orqali tashqi resurslarsiz tekshirildi. Boshlanish va yakun kadrlari mos keladi.
- Skill paketidagi uchta asosiy fayl hamda repo ildizidagi to‘rtta yordamchi nusxasi upstream Git blob xeshlari bilan tekshirildi. Yordamchilar o‘zgartirilmasdan skillning `scripts/` papkasiga kiritildi.
- MIT litsenziyasi `/licenses/motion-background.txt` ichida berilgan. Mavjud yetti skill bilan jami sakkizta skill lockfile’da qayd etiladi.

## Tekshirish buyruqlari

`frontend/` ichida:

```bash
npm ci --no-audit --no-fund
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 5207 --strictPort
# Boshqa terminalda:
EXPERIENCE_BASE_URL=http://127.0.0.1:5207 npm run test:experience
EXPERIENCE_BASE_URL=http://127.0.0.1:5207 npm run test:motion
MAP_BASE_URL=http://127.0.0.1:5207 npm run test:map
REPORT_BASE_URL=http://127.0.0.1:5207 npm run test:reports
```

Brauzer sinovlari izolyatsiyalangan API javoblari va test brauzer saqlash joyida bajariladi. Production yozuvlariga mutatsiya yuborilmaydi. Tekshiruvlar desktop/mobil, light/dark, sticky header, logo, qo‘llanmalar, sahifalar orasidagi o‘tish, xarita boshqaruvi, hisobot va video lifecycle holatlarini qamrab oladi.
