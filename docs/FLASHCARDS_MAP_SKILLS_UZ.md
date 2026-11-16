# Flashcards va map-animation skillari

2026-11-16 kuni loyiha uchun `npx skills add` orqali Codex agentiga o‘rnatildi. Asl yo‘riqnomalar, manba va versiya xeshlari `skills-lock.json` ichida saqlanadi.

| Skill | O‘rnatilgan joy | Vazifasi |
|---|---|---|
| flashcards | `.agents/skills/flashcards/` | Manbadan savol-javob kartochkalari yaratish, mashq qilish va takrorlash natijalarini kuzatish |
| map-animation | `.agents/skills/map-animation/` | GeoJSON/SVG xarita, belgilar, marshrutlar va hudud animatsiyalari; video yaratish bo‘yicha yo‘riqnoma |

## O‘rnatish buyruqlari

```bash
npx skills add https://github.com/anthropics/claude-for-legal --skill flashcards --agent codex --yes
npx skills add https://github.com/iart-ai/map-animation-skills --skill map-animation --agent codex --yes
```

## Qo‘llash

`flashcards` aslida huquqshunoslik talabalarining o‘qishi uchun yozilgan. Asl yo‘riqnomadagi shaxsiy kontekst va o‘quv natijalari `~/.claude/plugins/config/claude-for-legal/law-student/` yo‘llaridan foydalanadi. Ular o‘rnatish vaqtida yaratilmaydi; Codex orqali amalda ishlatishda foydalanuvchi taqdim etgan mavzu, manba va tegishli lokal saqlash joyini belgilang. Shaxsiy o‘quv qaydlarini GitHub’ga yubormang. Manbasiz taxminlarni tekshirilgan fakt sifatida yodlash kartochkalariga kiritmang.

`map-animation` uchun ikkita usul bor: Google Earth Studio → After Effects yoki GeoJSON/SVG → Remotion/D3. Ushbu o‘rnatish multimedia ilovalarini yoki saytga yangi kutubxonalarni o‘rnatmaydi. Ular tegishli animatsiya topshirig‘i bo‘lganda tanlanadi.

Map yo‘riqnomasidagi `scripts/` yordamchilari yuqoridagi manbaning repo ildizida joylashgan va standart skill nusxasiga kirmaydi. Shu sababli `README.md`, `contact-sheet.sh`, `probe-mp4.sh` va `seek-shot.sh` o‘zgartirilmasdan `.agents/skills/map-animation/scripts/` ichiga ham kiritildi. Ular yo‘riqnomadagi mavjud tekshirish bosqichlari uchun kerak. `contact-sheet.sh` uchun ffmpeg, `probe-mp4.sh` uchun ffprobe, `seek-shot.sh` uchun Playwright Chromium kerak; talablar yordamchi README’da keltirilgan.

## Manba va tekshirish

- [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal), `law-student/skills/flashcards/`: asl skill fayli Git blob xeshi orqali tekshirildi.
- [iart-ai/map-animation-skills](https://github.com/iart-ai/map-animation-skills), `skills/map-animation/` va `scripts/`: barcha nusxalar asl fayllarning Git blob xeshlari bilan tekshirildi.
- Uchta shell yordamchi uchun `bash -n` sintaksis tekshiruvi bajarildi.
- Lockfile avvalgi beshta skill bilan birga jami yettita skillni qayd etadi.
- Litsenziyalar: [FLASHCARDS_MAP_LICENSES.md](FLASHCARDS_MAP_LICENSES.md).

Bu o‘zgarish agent skillari va hujjatlarni qo‘shadi. Sayt sahifasi, backend, database sxemasi yoki runtime sozlamalariga o‘zgartirish kiritmaydi.
