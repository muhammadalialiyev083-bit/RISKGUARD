export type RecordRow = Record<string, any>;
export type WorkspaceData = Record<string, RecordRow[]>;
export type GuideStep = { text: string; target: string; label: string };
export type ModuleGuide = {
  title: string;
  purpose: string;
  resource: string;
  field: string;
  primary: string;
  previous: string;
  next: string;
  steps: GuideStep[];
};
const step = (text: string, target: string, label: string): GuideStep => ({
  text,
  target,
  label,
});
export const guides: Record<string, ModuleGuide> = {
  organizations: {
    title: "Tashkilotdan boshlang",
    purpose: "Barcha jarayonlar va mas’ullar uchun umumiy kontekst yarating.",
    resource: "organizations",
    field: "profile",
    primary: "Profilni to‘ldirish",
    previous: "dashboard",
    next: "processes",
    steps: [
      step(
        "Tashkilot nomi, faoliyat sohasi va vaqt mintaqasini kiriting.",
        "organizations?action=edit",
        "Tashkilot profili",
      ),
      step(
        "Bo‘limlar va mas’ul foydalanuvchilarni tekshiring.",
        "departments",
        "Bo‘limlar",
      ),
      step(
        "Himoya qilinadigan xizmatni belgilang.",
        "services?action=create",
        "Xizmat qo‘shish",
      ),
    ],
  },
  departments: {
    title: "Mas’ul tuzilmani belgilang",
    purpose: "Bo‘limlar jarayon egalari va xizmatlarni bog‘laydi.",
    resource: "departments",
    field: "head_name",
    primary: "Bo‘lim qo‘shish",
    previous: "organizations",
    next: "services",
    steps: [
      step(
        "Bo‘lim nomi va rahbarini kiriting.",
        "departments?action=create",
        "Bo‘lim yaratish",
      ),
      step(
        "Foydalanuvchining bo‘limi va rolini tekshiring.",
        "users",
        "Foydalanuvchilar",
      ),
      step(
        "Bo‘limga tegishli xizmatlarni tuzing.",
        "services",
        "Xizmatlarga o‘tish",
      ),
    ],
  },
  services: {
    title: "Xizmatni jarayonlarga bog‘lang",
    purpose:
      "Xizmat mijoz yoki tashkilot uchun taqdim etiladigan natijani bildiradi.",
    resource: "services",
    field: "owner",
    primary: "Xizmat qo‘shish",
    previous: "organizations",
    next: "processes",
    steps: [
      step(
        "Xizmat nomi va mas’ul bo‘limni kiriting.",
        "services?action=create",
        "Xizmat yaratish",
      ),
      step(
        "Xizmatni bajaradigan jarayonlarni belgilang.",
        "processes?action=create",
        "Jarayon qo‘shish",
      ),
      step("Uzilish ta’sirini BIA orqali baholang.", "bia", "BIA ga o‘tish"),
    ],
  },
  users: {
    title: "Mas’uliyatni aniq taqsimlang",
    purpose:
      "Jarayon egalari, tahlilchilar va tasdiqlovchilar bir ish oqimida ishlaydi.",
    resource: "users",
    field: "role_display",
    primary: "Foydalanuvchilarni ko‘rish",
    previous: "departments",
    next: "processes",
    steps: [
      step(
        "Mavjud foydalanuvchi va bo‘limlarni tekshiring.",
        "users",
        "Foydalanuvchilar",
      ),
      step(
        "Yangi hamkasbni profil sahifasidan taklif qiling.",
        "settings",
        "Taklif yuborish",
      ),
      step(
        "Jarayonga tegishli egani biriktiring.",
        "processes",
        "Jarayon egalari",
      ),
    ],
  },
  processes: {
    title: "Jarayonni xizmatga ulang",
    purpose: "BIA, risk va tiklanish rejasi aynan shu jarayondan boshlanadi.",
    resource: "processes",
    field: "criticality",
    primary: "Jarayon qo‘shish",
    previous: "organizations",
    next: "assets",
    steps: [
      step(
        "Avval xizmat va uning mas’ulini belgilang.",
        "services",
        "Xizmatlar",
      ),
      step(
        "Jarayon nomi, egasi va muhimlik darajasini kiriting.",
        "processes?action=create",
        "Jarayon yaratish",
      ),
      step(
        "Jarayon ishlashi uchun kerak bo‘lgan aktivlarni bog‘lang.",
        "dependencies",
        "Bog‘liqliklar",
      ),
    ],
  },
  assets: {
    title: "Muhim resurslarni birlashtiring",
    purpose:
      "Tizim, server, xodim yoki bino qaysi jarayonni qo‘llab-quvvatlashini belgilang.",
    resource: "assets",
    field: "type",
    primary: "Aktiv qo‘shish",
    previous: "processes",
    next: "bia",
    steps: [
      step(
        "Aktiv nomi, turi va egasini kiriting.",
        "assets?action=create",
        "Aktiv yaratish",
      ),
      step(
        "Jarayon va aktiv orasidagi qaramlikni belgilang.",
        "dependencies?action=create",
        "Bog‘liqlik yaratish",
      ),
      step(
        "Jismoniy yoki zaxira manzilni xaritada rejalashtiring.",
        "map",
        "Hududiy xarita",
      ),
    ],
  },
  dependencies: {
    title: "Qaramliklarni xaritalang",
    purpose:
      "Bitta resurs uzilganda qaysi jarayonlarga ta’sir qilishini ko‘ring.",
    resource: "dependencies",
    field: "dependency_criticality",
    primary: "Bog‘liqlik qo‘shish",
    previous: "assets",
    next: "bia",
    steps: [
      step(
        "Avval jarayon va aktivlar reestrini to‘ldiring.",
        "assets",
        "Aktivlar",
      ),
      step(
        "Manba, bog‘liq resurs va qaramlik turini tanlang.",
        "dependencies?action=create",
        "Aloqa yaratish",
      ),
      step(
        "Uzilish chegaralarini BIA da aniqlang.",
        "bia",
        "Ta’sirni baholash",
      ),
    ],
  },
  providers: {
    title: "Tashqi qaramlikni nazorat qiling",
    purpose:
      "Provayder xizmatlari, aktivlari va ko‘rib chiqish muddatini bir joyda kuzating.",
    resource: "providers",
    field: "risk_rating",
    primary: "Provayder qo‘shish",
    previous: "assets",
    next: "risks",
    steps: [
      step(
        "Provayder nomi, aloqa va mas’ulini kiriting.",
        "providers?action=create",
        "Provayder yaratish",
      ),
      step(
        "U foydalanadigan xizmat va aktivlarni bog‘lang.",
        "assets",
        "Bog‘langan aktivlar",
      ),
      step(
        "Yetkazib beruvchi uzilishi riskini baholang.",
        "risks",
        "Risklar reestri",
      ),
    ],
  },
  bia: {
    title: "Uzilish ta’sirini o‘lchang",
    purpose: "MTPD, RTO va RPO tiklanishning vaqt chegaralarini belgilaydi.",
    resource: "bia",
    field: "status",
    primary: "BIA baholashini yaratish",
    previous: "assets",
    next: "risks",
    steps: [
      step(
        "Baholanadigan jarayon va egasini tekshiring.",
        "processes",
        "Jarayonlar",
      ),
      step(
        "MTPD, RTO, RPO va zaxiralash oralig‘ini kiriting. RTO MTPD dan oshmasin.",
        "bia?action=create",
        "BIA yaratish",
      ),
      step(
        "Baholashni ko‘rib chiqish va tasdiqlashdan so‘ng risklarni baholang.",
        "risks",
        "Risklarga o‘tish",
      ),
    ],
  },
  risks: {
    title: "Riskdan amaliy choraga o‘ting",
    purpose:
      "Ehtimollik va ta’sirni baholab, nazorat choralari bilan qoldiq riskni kuzating.",
    resource: "risks",
    field: "risk_class",
    primary: "Risk qo‘shish",
    previous: "bia",
    next: "engine",
    steps: [
      step(
        "Risk tegishli bo‘lgan jarayon yoki aktivni aniqlang.",
        "processes",
        "Jarayonlar",
      ),
      step(
        "Tahdid, ehtimollik va ta’sirni kiriting. Ball ehtimollik × ta’sir orqali hisoblanadi.",
        "risks?action=create",
        "Risk yaratish",
      ),
      step(
        "Riskka javob chorasini tanlab, ustuvorlikni hisoblang.",
        "engine",
        "Hisoblash yadrosi",
      ),
    ],
  },
  controls: {
    title: "Nazorat chorasini riskka bog‘lang",
    purpose:
      "Riskni kamaytiradigan choralarni va ularning samaradorligini qayd eting.",
    resource: "controls",
    field: "status",
    primary: "Nazorat chorasi qo‘shish",
    previous: "risks",
    next: "engine",
    steps: [
      step("Nazorat qilinadigan riskni tanlang.", "risks", "Risklar"),
      step(
        "Chora va mas’ulni belgilang.",
        "controls?action=create",
        "Chora yaratish",
      ),
      step("Qoldiq risk va ustuvorlikni qayta baholang.", "engine", "Baholash"),
    ],
  },
  engine: {
    title: "Qaror uchun ustuvorlikni hisoblang",
    purpose:
      "Ta’sir, shoshilinchlik, risk va bog‘liqliklar asosida jarayonlarni taqqoslang.",
    resource: "processes",
    field: "criticality",
    primary: "Hisoblashga o‘tish",
    previous: "risks",
    next: "strategies",
    steps: [
      step(
        "Jarayon, BIA va risk ma’lumotlarini tekshiring.",
        "bia",
        "BIA baholashlari",
      ),
      step(
        "Quyidagi hisoblash formasida jarayonni tanlab natijani oling.",
        "engine?focus=work",
        "Hisoblash formasi",
      ),
      step(
        "Natijaga mos tiklash strategiyasini taqqoslang.",
        "strategies",
        "Strategiyalar",
      ),
    ],
  },
  strategies: {
    title: "Tiklash usulini tanlang",
    purpose: "Strategiya xarajat, vaqt va resurs imkoniyatini birlashtiradi.",
    resource: "strategies",
    field: "is_selected",
    primary: "Strategiya qo‘shish",
    previous: "engine",
    next: "plans",
    steps: [
      step(
        "Jarayonning RTO va ustuvorligini tekshiring.",
        "engine",
        "Hisoblash natijasi",
      ),
      step(
        "Tiklash usuli, xarajat va kutiladigan vaqtni kiriting.",
        "strategies?action=create",
        "Strategiya yaratish",
      ),
      step(
        "Tanlangan strategiyadan BCP yoki DRP rejasini tuzing.",
        "plans",
        "Tiklanish rejalari",
      ),
    ],
  },
  plans: {
    title: "Strategiyani bajariladigan rejaga aylantiring",
    purpose: "Har bir tiklanish qadami, mas’uli va vaqti aniq bo‘lsin.",
    resource: "plans",
    field: "status",
    primary: "Reja yaratish",
    previous: "strategies",
    next: "simulation",
    steps: [
      step(
        "Jarayon, BIA va tanlangan strategiyani tekshiring.",
        "strategies",
        "Strategiyalar",
      ),
      step(
        "BCP yoki DRP rejasiga ketma-ket qadamlar va mas’ullarni qo‘shing.",
        "plans?action=create",
        "Reja yaratish",
      ),
      step(
        "Rejani ko‘rib chiqib e’lon qiling, keyin ssenariyda sinang.",
        "simulation",
        "Sinovga o‘tish",
      ),
    ],
  },
  simulation: {
    title: "Rejani sinovdan o‘tkazing",
    purpose:
      "Ssenariy orqali bog‘liqliklar va tiklanish taxminlarini tekshiring.",
    resource: "scenarios",
    field: "estimated_outage_hours",
    primary: "Ssenariy yaratish",
    previous: "plans",
    next: "incidents",
    steps: [
      step(
        "E’lon qilingan reja va bog‘liqliklarni tekshiring.",
        "plans",
        "Rejalar",
      ),
      step(
        "Uziladigan aktiv va resurslar bilan ssenariy tuzing, so‘ng ishga tushiring.",
        "scenarios?action=create",
        "Ssenariy yaratish",
      ),
      step(
        "Natijani mashq sifatida qayd eting va yaxshilash vazifasi oching.",
        "exercises",
        "Mashqlar",
      ),
    ],
  },
  scenarios: {
    title: "Uzilish ssenariysini belgilang",
    purpose:
      "Qaysi resurs ishlamasligi va qanday imkoniyat qolishini qayd eting.",
    resource: "scenarios",
    field: "estimated_outage_hours",
    primary: "Ssenariy yaratish",
    previous: "plans",
    next: "exercises",
    steps: [
      step(
        "Tegishli aktiv va bog‘liqliklarni tekshiring.",
        "assets",
        "Aktivlar",
      ),
      step(
        "Ssenariy yarating va uning bajarish tugmasini bosing.",
        "scenarios?action=create",
        "Ssenariy yaratish",
      ),
      step(
        "Natijani mashqlar reestriga yozing.",
        "exercises",
        "Natijani qayd etish",
      ),
    ],
  },
  exercises: {
    title: "Sinov natijasini qayd eting",
    purpose: "Reja taxminini amaliy mashq dalili bilan bog‘lang.",
    resource: "exercises",
    field: "outcome",
    primary: "Mashq qayd etish",
    previous: "scenarios",
    next: "tasks",
    steps: [
      step(
        "Sinovdan o‘tadigan ssenariy va rejani tanlang.",
        "simulation",
        "Ssenariylar",
      ),
      step(
        "Mashq va kuzatilgan natijani reestrga kiriting.",
        "exercises?action=create",
        "Mashq yaratish",
      ),
      step(
        "Aniqlangan kamchilik uchun mas’ul va muddatli vazifa oching.",
        "tasks",
        "Yaxshilash vazifalari",
      ),
    ],
  },
  incidents: {
    title: "Hodisani tiklanish bilan bog‘lang",
    purpose:
      "Faol hodisa, ta’sir qilgan resurslar va bajariladigan ishlar bitta tarixda saqlanadi.",
    resource: "incidents",
    field: "status",
    primary: "Hodisa ochish",
    previous: "simulation",
    next: "tasks",
    steps: [
      step(
        "Hodisa va ta’sir qilgan resurslarni kiriting.",
        "incidents?action=create",
        "Hodisa yaratish",
      ),
      step(
        "Rejani ishga tushiring va hodisa tarixini yangilang.",
        "plans",
        "Tiklanish rejalari",
      ),
      step(
        "Keyingi choralarni vazifa sifatida taqsimlang.",
        "tasks",
        "Vazifalar",
      ),
    ],
  },
  tasks: {
    title: "Kamchilikni yakunlangan ishga aylantiring",
    purpose: "Hodisa yoki mashqdan kelgan vazifaga mas’ul va muddat belgilang.",
    resource: "improvement-tasks",
    field: "status",
    primary: "Vazifa yaratish",
    previous: "incidents",
    next: "reports",
    steps: [
      step(
        "Vazifaga sabab bo‘lgan hodisa yoki ssenariyni tanlang.",
        "incidents",
        "Hodisalar",
      ),
      step(
        "Vazifa, mas’ul, ustuvorlik va muddatni kiriting.",
        "tasks?action=create",
        "Vazifa yaratish",
      ),
      step(
        "Bajarilgan ishni yangilab, natijani hisobotda ko‘ring.",
        "reports",
        "Hisobotlar",
      ),
    ],
  },
  reports: {
    title: "Dalillarni hisobotga jamlang",
    purpose:
      "Tanlangan davr va xizmat bo‘yicha joriy ko‘rsatkichlarni yuklab oling.",
    resource: "processes",
    field: "criticality",
    primary: "Eksportga o‘tish",
    previous: "tasks",
    next: "audit",
    steps: [
      step(
        "Davr va xizmat filtrini tanlang.",
        "reports?focus=work",
        "Filtrlar va eksport",
      ),
      step(
        "PDF, CSV, Markdown yoki JSON hisobotini yuklab oling.",
        "reports?focus=work",
        "Hisobot olish",
      ),
      step(
        "Amallar tarixini audit jurnalida tekshiring.",
        "audit",
        "Audit jurnali",
      ),
    ],
  },
  audit: {
    title: "Qaror izini kuzating",
    purpose: "Kim, qachon va qaysi yozuvni o‘zgartirganini tekshiring.",
    resource: "audit",
    field: "action",
    primary: "Jurnalga o‘tish",
    previous: "reports",
    next: "dashboard",
    steps: [
      step(
        "Qidiruv orqali kerakli yozuv yoki foydalanuvchini toping.",
        "audit?focus=work",
        "Audit yozuvlari",
      ),
      step(
        "Yaratish, yangilash yoki boshqa amal turini filtrlang.",
        "audit?focus=work",
        "Jurnal filtri",
      ),
      step(
        "Dastur holatini boshqaruv panelida kuzating.",
        "dashboard",
        "Boshqaruv paneli",
      ),
    ],
  },
  settings: {
    title: "Hisobingizni tayyorlang",
    purpose: "Ism, aloqa, bildirishnomalar va hisob xavfsizligini boshqaring.",
    resource: "profile",
    field: "profile",
    primary: "Profilga o‘tish",
    previous: "organizations",
    next: "dashboard",
    steps: [
      step(
        "Ism va aloqa ma’lumotlarini to‘ldiring.",
        "settings?focus=work",
        "Profil formasi",
      ),
      step(
        "Parol va kerak bo‘lsa Google bog‘lanishini tekshiring.",
        "settings?focus=security",
        "Hisob xavfsizligi",
      ),
      step(
        "Asosiy ishni boshqaruv panelidan davom ettiring.",
        "dashboard",
        "Boshqaruv paneli",
      ),
    ],
  },
  map: {
    title: "Manzildan yo‘nalishgacha",
    purpose:
      "Asosiy va zaxira joylashuvlarni geografik tiklanish ketma-ketligida ko‘ring.",
    resource: "map",
    field: "kind",
    primary: "Manzil qo‘shish",
    previous: "assets",
    next: "plans",
    steps: [
      step(
        "Mening rejam rejimida shahar yoki aniq koordinatani kiriting.",
        "map?focus=work",
        "Manzil qo‘shish",
      ),
      step(
        "Manzillarni tartiblang, xaritada yaqinlashtiring va animatsiyani ijro eting.",
        "map?focus=work",
        "Yo‘nalishni ko‘rish",
      ),
      step(
        "GeoJSON nusxani saqlang va tiklanish rejasini tuzing.",
        "plans",
        "Rejalarga o‘tish",
      ),
    ],
  },
};

export const labels: Record<string, string> = {
  dashboard: "Boshqaruv paneli",
  organizations: "Tashkilot",
  processes: "Jarayonlar",
  assets: "Aktivlar",
  providers: "Provayderlar",
  bia: "BIA",
  risks: "Risklar",
  controls: "Nazorat choralari",
  engine: "Hisoblash",
  strategies: "Strategiyalar",
  plans: "Rejalar",
  simulation: "Ssenariy sinovlari",
  scenarios: "Ssenariylar",
  exercises: "Mashqlar",
  incidents: "Hodisalar",
  tasks: "Vazifalar",
  reports: "Hisobotlar",
  audit: "Audit",
  settings: "Profil",
  map: "Hududiy xarita",
  departments: "Bo‘limlar",
  services: "Xizmatlar",
  users: "Foydalanuvchilar",
  CRITICAL: "Kritik",
  HIGH: "Yuqori",
  MEDIUM: "O‘rta",
  LOW: "Past",
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  UNDER_REVIEW: "Ko‘rib chiqilmoqda",
  DRAFT: "Qoralama",
  SUBMITTED: "Yuborilgan",
  IN_REVIEW: "Ko‘rib chiqilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Qaytarilgan",
  PUBLISHED: "E’lon qilingan",
  ARCHIVED: "Arxiv",
  OPEN: "Ochiq",
  INVESTIGATING: "Tekshirilmoqda",
  RECOVERING: "Tiklanmoqda",
  RESOLVED: "Bartaraf etilgan",
  CLOSED: "Yopilgan",
  IN_PROGRESS: "Bajarilmoqda",
  DONE: "Bajarilgan",
  SYSTEM: "Tizim",
  SERVER: "Server",
  PERSONNEL: "Xodim",
  VENDOR: "Tashqi xizmat",
  FACILITY: "Bino",
  SUCCESS: "Muvaffaqiyatli",
  PARTIAL: "Qisman muvaffaqiyatli",
  FAILED: "Muvaffaqiyatsiz",
  IDENTIFIED: "Aniqlangan",
  ASSESSED: "Baholangan",
  MITIGATED: "Kamaytirilgan",
  ACCEPTED: "Qabul qilingan",
  PLANNED: "Rejalashtirilgan",
  IMPLEMENTED: "Joriy qilingan",
  EFFECTIVE: "Samarali",
  CREATE: "Yaratish",
  UPDATE: "Yangilash",
  DELETE: "O‘chirish",
  LOGIN: "Kirish",
  LOGOUT: "Chiqish",
  MANDATORY: "Majburiy",
  OPTIONAL: "Ixtiyoriy",
  low: "Past",
  medium: "O‘rta",
  high: "Yuqori",
  office: "Asosiy",
  backup: "Zaxira",
  partner: "Hamkor",
};

export function distribution(
  rows: RecordRow[],
  field: string,
): { label: string; value: number }[] {
  const groups = new Map<string, number>();
  rows.forEach((row) => {
    const likelihood = Number(row.likelihood),
      impact = Number(row.impact);
    const raw =
      field === "risk_class"
        ? !Number.isFinite(likelihood) ||
          !Number.isFinite(impact) ||
          likelihood < 1 ||
          impact < 1 ||
          likelihood > 5 ||
          impact > 5 ||
          !Number.isInteger(likelihood) ||
          !Number.isInteger(impact)
          ? undefined
          : likelihood * impact <= 6
            ? "low"
            : likelihood * impact <= 14
              ? "medium"
              : "high"
        : row[field];
    const key =
      raw == null || raw === ""
        ? "Belgilanmagan"
        : field === "owner"
          ? "Mas’ul #" + raw
          : field === "estimated_outage_hours"
            ? raw + " soat"
            : raw === true
              ? "Tanlangan"
              : raw === false
                ? "Tanlanmagan"
                : String(raw);
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  return [...groups]
    .map(([key, value]) => ({ label: labels[key] || key, value }))
    .sort((a, b) => b.value - a.value);
}

export function startingSteps(
  data: WorkspaceData,
  summary: RecordRow | null,
  user: RecordRow,
) {
  const has = (resource: string) => (data[resource] || []).length > 0;
  const organization =
    (data.organizations || []).find((row) => row.id === user.organization) ||
    user.organization_detail;
  return [
    {
      title: "Tashkilot profilini to‘ldiring",
      detail: "Faoliyat sohasi va mas’ul tuzilmani belgilang.",
      target: "organizations?action=edit",
      complete: Boolean(organization?.name && organization?.sector),
    },
    {
      title: "Birinchi xizmatni yarating",
      detail: "Tashkilot taqdim etadigan natijani nomlang.",
      target: "services?action=create",
      complete: has("services"),
    },
    {
      title: "Jarayon va egasini belgilang",
      detail: "Xizmat qanday bajarilishini va kim javobgarligini kiriting.",
      target: "processes?action=create",
      complete: has("processes"),
    },
    {
      title: "Aktiv va bog‘liqliklarni ulang",
      detail: "Jarayonga kerak bo‘lgan resurslarni xaritalang.",
      target: "assets",
      complete: has("assets") && has("dependencies"),
    },
    {
      title: "BIA ni baholang va tasdiqlang",
      detail: "MTPD, RTO va RPO chegaralarini kelishing.",
      target: "bia",
      complete: (data.bia || []).some((row) => row.status === "APPROVED"),
    },
    {
      title: "Risklarni baholang",
      detail: "Tahdid, ehtimollik va ta’sirni aniqlang.",
      target: "risks",
      complete: has("risks"),
    },
    {
      title: "Tiklanish rejasini e’lon qiling",
      detail: "Qadamlar va mas’ullar bilan BCP yoki DRP tuzing.",
      target: "plans",
      complete: (data.plans || []).some((row) => row.status === "PUBLISHED"),
    },
    {
      title: "Sinov natijasini qayd eting",
      detail: "Ssenariyni sinang va mashq dalilini saqlang.",
      target: "simulation",
      complete: data.exercises
        ? data.exercises.length > 0
        : Number(summary?.summary?.completed_exercises_count) > 0,
    },
  ];
}
