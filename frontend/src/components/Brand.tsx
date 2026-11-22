import "./brand.css";

export const BRAND_LOGO_URL = "/brand/uzhi-logo.svg";

export function Brand({
  compact = false,
  onHome,
}: {
  compact?: boolean;
  onHome?: () => void;
}) {
  return (
    <a
      className={`brand brand-approved ${compact ? "brand-compact" : ""}`}
      href="/dashboard"
      aria-label="UzHi — boshqaruv paneliga qaytish"
      onClick={(event) => {
        if (onHome) {
          event.preventDefault();
          onHome();
        }
      }}
    >
      <svg
        className="uzhi-logo-svg"
        viewBox={compact ? "14 5 182 182" : "0 0 550 186"}
        width={compact ? 182 : 550}
        height={compact ? 182 : 186}
        aria-hidden="true"
        focusable="false"
      >
        <use
          className="group-primary"
          href={`${BRAND_LOGO_URL}#${compact ? "uzhi-shield-primary" : "uzhi-primary"}`}
        />
        <use
          className="group-secondary"
          href={`${BRAND_LOGO_URL}#${compact ? "uzhi-shield-secondary" : "uzhi-secondary"}`}
        />
      </svg>
    </a>
  );
}
