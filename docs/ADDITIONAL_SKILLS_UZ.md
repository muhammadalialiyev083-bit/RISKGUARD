# Diagramma va PostgreSQL skillari

Loyihaga quyidagi ikki skill qo'shildi:

| Skill | Manba | Vazifa |
|---|---|---|
| `diagram-design` | https://github.com/cathrynlavery/diagram-design | Arxitektura, jarayon, bog'liqlik va ma'lumot modeli diagrammalari |
| `supabase-postgres-best-practices` | https://github.com/supabase/agent-skills | PostgreSQL sxemasi, SQL, indeks, ulanish va ishlash samaradorligi bo'yicha yo'riqnomalar |

Paketlar `.agents/skills/` ichida to'liq o'rnatilgan. `skills-lock.json` manba va tekshiruv hashlarini saqlaydi. Oldingi `design-system`, `frontend-design` va `firecrawl-dashboard-reporting` skillari ham mavjud.

```sh
npx skills add https://github.com/cathrynlavery/diagram-design --skill diagram-design --agent codex --yes
npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices --agent codex --yes
```

## Foydalanish

Diagramma yaratish topshirig'ida `diagram-design/SKILL.md` va tanlangan diagramma turi yo'riqnomasi o'qiladi. Birinchi diagramma oldidan skillning brend sozlash tartibi qo'llanadi; UzHi'ning mavjud rang va shrift manbasi `frontend/design-tokens.json` da.

PostgreSQL bilan bog'liq kod yoki sxema ishlarida `supabase-postgres-best-practices/SKILL.md` va shu ishga tegishli qoida fayllari avval o'qiladi. Bu tavsiyalar Render'dagi PostgreSQL uchun ham tegishli.

Ushbu o'rnatish yangi diagramma yaratmaydi yoki bazada SQL bajarmaydi. U dasturga yangi runtime kutubxonasi yoki Supabase xizmati ulanishini qo'shmaydi; skillar keyingi ishlarda agent foydalanadigan yo'riqnoma va vositalardir.

## Tekshirish

- Diagramma paketidagi 317 ta va PostgreSQL paketidagi 36 ta fayl upstream Git blob hashlari bilan solishtirildi: barchasi mos.
- Diagramma paketidagi sakkizta Python yordamchi fayl sintaksisi tekshirildi.
- Lockfile JSON o'qilishi va barcha beshta skill mavjudligi tekshirildi.
- Paketlarning litsenziya qaydlari `EXTRA_SKILL_LICENSES.md` faylida saqlangan.
