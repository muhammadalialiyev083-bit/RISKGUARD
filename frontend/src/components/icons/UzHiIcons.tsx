const accent = "var(--icon-accent, rgba(132, 204, 22, 0.26))";
const spark = "var(--icon-spark, #84cc16)";

const glyphs = {
  dashboard: <>
    <path d="M3 5 5 3h6v10H3z" fill={accent} />
    <path d="M14 3h7v6h-7zM14 12h7v9h-7zM3 16h8v5H3z" />
    <path d="M6 6h2v2H6z" fill={spark} stroke="none" />
  </>,
  map: <>
    <path d="m2.5 12 9.5-8 9.5 8-9.5 8z" fill={accent} />
    <path d="m7.5 12 4.5-4 4.5 4-4.5 4zM12 2v2m0 16v2" />
    <circle cx="12" cy="12" r="1.5" fill={spark} stroke="none" />
  </>,
  reports: <>
    <path d="M5 3h10l4 4v14H5z" fill={accent} />
    <path d="M15 3v5h4M8 17v-3m4 3v-6m4 6v-5" />
    <path d="M11.2 9.5h1.6v1.6h-1.6z" fill={spark} stroke="none" />
  </>,
  organization: <>
    <path d="M3 21V8h4V4h5v17M12 12h4V8h5v13H3" fill={accent} />
    <path d="M6 12h2m-2 4h2m8 0h2m-8 5v-3" />
    <path d="M16.5 11h2v2h-2z" fill={spark} stroke="none" />
  </>,
  processes: <>
    <path d="m2.5 8 9.5-5 9.5 5-9.5 5z" fill={accent} />
    <path d="m2.5 12.5 9.5 5 9.5-5m-19 4.5 9.5 5 9.5-5" />
    <path d="m9.6 8 2.4-1.3 2.4 1.3-2.4 1.3z" fill={spark} stroke="none" />
  </>,
  assets: <>
    <path d="m12 2.5 8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z" fill={accent} />
    <path d="m3.5 7.3 8.5 4.9 8.5-4.9M12 12.2v9.3" />
    <circle cx="12" cy="12.2" r="1.55" fill={spark} stroke="none" />
  </>,
  providers: <>
    <path d="M2.5 12 8 6.5h4.5l2.2 2.2-3 3-1.8-1.4L6 14.4z" fill={accent} />
    <path d="m9.3 15.3 3-3 1.8 1.4 3.9-4.1 3.5 2.4-5.5 5.5h-4.5z" />
    <path d="m16 8 1.8-1.8L19.6 8l-1.8 1.8z" fill={spark} stroke="none" />
  </>,
  bia: <>
    <path d="M11 3a9 9 0 1 0 10 10H11z" fill={accent} />
    <path d="M14 2.7v7.5h7.6A8.9 8.9 0 0 0 14 2.7z" />
    <path d="m16 5.7 2.6 2.6H16z" fill={spark} stroke="none" />
  </>,
  risks: <>
    <path d="m10 3-7.5 14v3h19v-3L14 3z" fill={accent} />
    <path d="M12 7.5v5.5" />
    <path d="M10.8 15.6h2.4V18h-2.4z" fill={spark} stroke="none" />
  </>,
  engine: <>
    <path d="M5 5h12l2 2v12H5z" fill={accent} />
    <path d="M8 2v3m4-3v3m4-3v3M8 19v3m4-3v3m4-3v3M2 8h3m-3 4h3m-3 4h3m14-8h3m-3 4h3m-3 4h3M9 9h6v6H9z" />
    <path d="M11 11h2v2h-2z" fill={spark} stroke="none" />
  </>,
  recovery: <>
    <path d="m12 8 4 4-4 4-4-4z" fill={accent} />
    <path d="M3 11a9 9 0 0 1 15.5-5.2L21 8m-5 0h5V3m0 10a9 9 0 0 1-15.5 5.2L3 16m5 0H3v5" />
    <circle cx="12" cy="12" r="1.25" fill={spark} stroke="none" />
  </>,
  scenarios: <>
    <path d="m12 2.5 8.5 5v9l-8.5 5-8.5-5v-9z" fill={accent} />
    <path d="m12 2.5 4.2 9.5-4.2 9.5L7.8 12zM3.5 7.5l12.7 4.5m-8.4 0 12.7 4.5" />
    <path d="m10.5 12 1.5-1.8 1.5 1.8-1.5 1.8z" fill={spark} stroke="none" />
  </>,
  highRisk: <>
    <path d="M7 3h10l4 4v7l-4 5-5 3-5-3-4-5V7z" fill={accent} />
    <path d="m7 16 10-9m-7 0h1m2 10h1" />
    <path d="M16.5 12.5h2.1v2.1h-2.1z" fill={spark} stroke="none" />
  </>,
  rpo: <>
    <circle cx="11" cy="13" r="8.5" fill={accent} />
    <circle cx="11" cy="13" r="4.5" />
    <path d="m11 13 7-7m-1.5 3.5 2.6-5.6 2.1 3.3z" />
    <circle cx="19.4" cy="4.5" r="1.5" fill={spark} stroke="none" />
  </>,
  unplanned: <>
    <path d="m2.5 7.5 9.5-5 9.5 5-9.5 5z" fill={accent} />
    <path d="m2.5 12 6.8 3.6m5.4 0 6.8-3.6m-19 5 9.5 5 9.5-5" />
    <path d="M10.7 14.4h2.6V17h-2.6z" fill={spark} stroke="none" />
  </>,
  plans: <>
    <path d="M4 5 8 3h8l4 2v8l-3 5-5 3.5L7 18l-3-5z" fill={accent} />
    <path d="m8 12 2.5 2.5 5.5-5.5" />
    <path d="M17 6h2v2h-2z" fill={spark} stroke="none" />
  </>,
  approvedBia: <>
    <path d="M3 13a9 9 0 1 1 18 0v4H3z" fill={accent} />
    <path d="M6 13h1m10 0h1M12 7v1m0 5 4-3M8 20h8" />
    <circle cx="12" cy="13" r="1.45" fill={spark} stroke="none" />
  </>,
  incidents: <>
    <path d="M5 17V9l4-4h6l4 4v8z" fill={accent} />
    <path d="M3 18h18v3H3zM2 9l2 1m16 0 2-1M12 2v1m-3 8 3 2 3-2" />
    <path d="M11 8h2v2h-2z" fill={spark} stroke="none" />
  </>,
  tasks: <>
    <path d="M4 6h16v14H4z" fill={accent} />
    <path d="M7 4h10v4H7zM7 13l1.5 1.5L11 12m2 2h4m-4 3h4" />
    <circle cx="8" cy="17" r="1.1" fill={spark} stroke="none" />
  </>,
  audit: <>
    <path d="M4 3h12l4 4v14H4z" fill={accent} />
    <path d="M16 3v5h4M7 9h5m-5 4h10m-10 4h10" />
    <path d="M14 8h2v2h-2z" fill={spark} stroke="none" />
  </>,
  evidence: <>
    <path d="M5 3h14v18l-7-3-7 3z" fill={accent} />
    <path d="m8 11 2.5 2.5 5.5-5.5" />
    <path d="M11 5h2v2h-2z" fill={spark} stroke="none" />
  </>,
  settings: <>
    <path d="M8 3h8l1.5 3 3.5 2v8l-3.5 2-1.5 3H8l-1.5-3L3 16V8l3.5-2z" fill={accent} />
    <path d="m12 8 4 4-4 4-4-4z" />
    <circle cx="12" cy="12" r="1.25" fill={spark} stroke="none" />
  </>,
  search: <>
    <path d="M6 3h7l4 4v6l-4 4H6l-3-4V7z" fill={accent} />
    <path d="m15.5 15.5 5 5" />
    <circle cx="9.8" cy="9.8" r="1.3" fill={spark} stroke="none" />
  </>,
  play: <>
    <path d="M6 4h2l12 8L8 20H6z" fill={accent} />
    <path d="m10 9 4.6 3-4.6 3z" fill={spark} stroke="none" />
  </>,
  pause: <>
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill={accent} />
    <path d="M15 6h2v2h-2z" fill={spark} stroke="none" />
  </>,
  sun: <>
    <path d="m12 6 6 6-6 6-6-6z" fill={accent} />
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.5 4.5 6 6m12 12 1.5 1.5m0-15L18 6M6 18l-1.5 1.5" />
    <circle cx="12" cy="12" r="1.5" fill={spark} stroke="none" />
  </>,
  moon: <>
    <path d="M19.7 15.6a9 9 0 1 1-11.4-11A8.2 8.2 0 0 0 19.7 15.6z" fill={accent} />
    <path d="m17.5 4.2 1.8 1.8-1.8 1.8L15.7 6z" fill={spark} stroke="none" />
  </>,
  bell: <>
    <path d="M6 13V8l3-4h6l3 4v5l3 4H3z" fill={accent} />
    <path d="M10 20h4" />
    <path d="M11 4h2v2h-2z" fill={spark} stroke="none" />
  </>,
  help: <>
    <path d="M7 3h10l4 4v10l-4 4H7l-4-4V7z" fill={accent} />
    <path d="M9 8.5 10.5 7h3.2L15 8.5v2L12 13" />
    <path d="M10.9 15.5h2.2v2.2h-2.2z" fill={spark} stroke="none" />
  </>,
  logout: <>
    <path d="M11 3H4v18h7v-4H8V7h3z" fill={accent} />
    <path d="M11 12h10m-4-4 4 4-4 4" />
    <path d="M12 7h2v2h-2z" fill={spark} stroke="none" />
  </>,
  refresh: <>
    <path d="m12 8 4 4-4 4-4-4z" fill={accent} stroke="none" />
    <path d="M4 9a8.5 8.5 0 0 1 14-3l2 2m-5 0h5V3m0 12a8.5 8.5 0 0 1-14 3l-2-2m5 0H4v5" />
    <circle cx="12" cy="12" r="1.25" fill={spark} stroke="none" />
  </>,
  plus: <>
    <path d="M3 9V3h6l-6 6zm18 6v6h-6z" fill={accent} stroke="none" />
    <path d="M12 5v14M5 12h14" />
    <path d="M11 11h2v2h-2z" fill={spark} stroke="none" />
  </>,
  expand: <>
    <path d="M4 11V4h7L4 11zm16 2v7h-7z" fill={accent} stroke="none" />
    <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" />
    <path d="m10 12 2-2 2 2-2 2z" fill={spark} stroke="none" />
  </>,
  menu: <>
    <path d="M3 5h18v14H3z" fill={accent} stroke="none" />
    <path d="M4 6h16M4 12h16M4 18h16" />
    <path d="M4 11h3v2H4z" fill={spark} stroke="none" />
  </>,
  collapse: <>
    <path d="M3 4h18v16H3z" fill={accent} />
    <path d="M9 4v16m7-12-4 4 4 4" />
    <path d="M5 6h2v2H5z" fill={spark} stroke="none" />
  </>,
  close: <>
    <path d="m12 3 9 9-9 9-9-9z" fill={accent} stroke="none" />
    <path d="m6 6 12 12M18 6 6 18" />
    <circle cx="12" cy="12" r="1.2" fill={spark} stroke="none" />
  </>,
  arrowRight: <>
    <path d="M11 5v14l8-7z" fill={accent} stroke="none" />
    <path d="M4 12h15m-6-6 6 6-6 6" />
    <path d="M4 11h2v2H4z" fill={spark} stroke="none" />
  </>,
  arrowLeft: <>
    <path d="M13 5v14l-8-7z" fill={accent} stroke="none" />
    <path d="M20 12H5m6 6-6-6 6-6" />
    <path d="M18 11h2v2h-2z" fill={spark} stroke="none" />
  </>,
  arrowUp: <>
    <path d="M5 13h14l-7-8z" fill={accent} stroke="none" />
    <path d="M12 20V5m-6 6 6-6 6 6" />
    <path d="M11 18h2v2h-2z" fill={spark} stroke="none" />
  </>,
  arrowDown: <>
    <path d="M5 11h14l-7 8z" fill={accent} stroke="none" />
    <path d="M12 4v15m-6-6 6 6 6-6" />
    <path d="M11 4h2v2h-2z" fill={spark} stroke="none" />
  </>,
  arrowUpRight: <>
    <path d="M9 5h10v10z" fill={accent} stroke="none" />
    <path d="M5 19 19 5m-9 0h9v9" />
    <path d="m4 19 1.4-1.4 1.4 1.4-1.4 1.4z" fill={spark} stroke="none" />
  </>,
  chevronRight: <>
    <path d="M8 5v14l8-7z" fill={accent} stroke="none" />
    <path d="m9 5 7 7-7 7" />
    <path d="M6.5 11h2v2h-2z" fill={spark} stroke="none" />
  </>,
  check: <>
    <path d="m5 11 4 4 9-8v4l-9 8-4-4z" fill={accent} stroke="none" />
    <path d="m4.5 12 4.5 4.5L19 6.5" />
    <circle cx="18.7" cy="6.7" r="1.25" fill={spark} stroke="none" />
  </>,
  checkCircle: <>
    <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" fill={accent} />
    <path d="m7 12 3 3 6-6" />
    <circle cx="16.2" cy="8.8" r="1.3" fill={spark} stroke="none" />
  </>,
  eye: <>
    <path d="m2 12 6-6h8l6 6-6 6H8z" fill={accent} />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="1.1" fill={spark} stroke="none" />
  </>,
  eyeOff: <>
    <path d="M7 7 2 12l6 6h8l2-2m2-2 2-2-6-6h-5" fill={accent} />
    <path d="m3 3 18 18" />
    <circle cx="16.5" cy="9.7" r="1.2" fill={spark} stroke="none" />
  </>,
  key: <>
    <path d="M3 6 6 3h6l4 4v5l-4 4H6l-3-4z" fill={accent} />
    <path d="m13 14 7 7 2-2-2-2-2 2" />
    <circle cx="8.5" cy="8.5" r="1.6" fill={spark} stroke="none" />
  </>,
  download: <>
    <path d="M3 15v5h18v-5" fill={accent} />
    <path d="M12 3v11m-4-4 4 4 4-4" />
    <path d="M11 16h2v2h-2z" fill={spark} stroke="none" />
  </>,
  upload: <>
    <path d="M3 15v5h18v-5" fill={accent} />
    <path d="M12 14V3m-4 4 4-4 4 4" />
    <path d="M11 16h2v2h-2z" fill={spark} stroke="none" />
  </>,
  pin: <>
    <path d="M5 6 8 3h8l3 3v7l-7 8-7-8z" fill={accent} />
    <path d="m9 10 3-3 3 3-3 3z" />
    <circle cx="12" cy="10" r="1.1" fill={spark} stroke="none" />
  </>,
  globe: <>
    <circle cx="12" cy="12" r="9" fill={accent} />
    <ellipse cx="12" cy="12" rx="4" ry="9" />
    <path d="M3 12h18" />
    <circle cx="16" cy="12" r="1.3" fill={spark} stroke="none" />
  </>,
  pencil: <>
    <path d="m4 15 11-11h3l2 2v3L9 20H4z" fill={accent} />
    <path d="m13 6 5 5M4 15l5 5" />
    <path d="m15.5 5.5 2.3 .3 .4 2.2z" fill={spark} stroke="none" />
  </>,
  restart: <>
    <path d="m12 8 4 4-4 4-4-4z" fill={accent} stroke="none" />
    <path d="M4 4v5h5M4 9a8.5 8.5 0 1 1-.2 6" />
    <circle cx="12" cy="12" r="1.25" fill={spark} stroke="none" />
  </>,
  trash: <>
    <path d="M5 7h14l-1 14H6z" fill={accent} />
    <path d="M3 7h18M9 7V3h6v4m-5 4v6m4-6v6" />
    <path d="M11 4h2v2h-2z" fill={spark} stroke="none" />
  </>,
  book: <>
    <path d="M3 5h5l4 2 4-2h5v13h-5l-4 2-4-2H3z" fill={accent} />
    <path d="M12 7v13m-6-9h2m8 0h2" />
    <path d="M15 13h2v2h-2z" fill={spark} stroke="none" />
  </>,
  chartBars: <>
    <path d="M7 19v-7h3v7m2 0V8h3v11m2 0V4h3v15" fill={accent} />
    <path d="M3 4v16h18" />
    <path d="M17 4h3v2h-3z" fill={spark} stroke="none" />
  </>,
  chartLine: <>
    <path d="m5 16 4-5 4 2 7-7v12H5z" fill={accent} stroke="none" />
    <path d="M3 4v16h18M5 16l4-5 4 2 7-7" />
    <circle cx="20" cy="6" r="1.3" fill={spark} stroke="none" />
  </>,
  circle: <>
    <circle cx="12" cy="12" r="8.5" fill={accent} />
    <circle cx="12" cy="12" r="1.5" fill={spark} stroke="none" />
  </>,
  clock: <>
    <path d="M7.5 3h9L21 7.5v9L16.5 21h-9L3 16.5v-9z" fill={accent} />
    <path d="M12 7v5l4 2" />
    <circle cx="12" cy="12" r="1.25" fill={spark} stroke="none" />
  </>,
};

export type UzHiIconName = keyof typeof glyphs;

export function UzHiIcon({
  name,
  size = 24,
  className,
}: {
  name: UzHiIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className ? `uzhi-icon ${className}` : "uzhi-icon"}
      fill="none"
      stroke="var(--icon-primary, currentColor)"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {glyphs[name]}
    </svg>
  );
}
