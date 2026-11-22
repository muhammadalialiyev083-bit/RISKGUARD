type RecordSample = {
  name: string;
  sector?: string;
};

const organizations = [
  { name: "Navro‘z universiteti", sector: "Oliy ta’lim" },
  { name: "Barkamol tibbiyot markazi", sector: "Sog‘liqni saqlash" },
  { name: "Tayanch raqamli xizmatlar", sector: "IT xizmatlari" },
  { name: "Barqaror logistika markazi", sector: "Logistika" },
];

export const recordSamples: Partial<Record<string, readonly RecordSample[]>> = {
  organizations,
  departments: [
    { name: "Raqamli ta’lim markazi" },
    { name: "Moliya bo‘limi" },
    { name: "Texnik yordam bo‘limi" },
    { name: "Mijozlarga xizmat ko‘rsatish bo‘limi" },
  ],
  services: [
    { name: "Elektron ta’lim xizmati" },
    { name: "Talabalar to‘lovi" },
    { name: "Elektron kutubxona" },
    { name: "Mijozlarni qo‘llab-quvvatlash" },
  ],
};

export const sectorSamples = [
  ...organizations.map(({ sector }) => sector),
  "Bank va moliya",
  "Ishlab chiqarish",
  "Energetika",
  "Davlat xizmatlari",
  "Boshqa",
];
