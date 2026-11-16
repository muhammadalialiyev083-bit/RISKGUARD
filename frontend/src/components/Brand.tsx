export const BRAND_LOGO_URL = "/brand/uzhi-logo.webp";
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
      <img
        src={BRAND_LOGO_URL}
        alt="UzHi — Uzluksiz Himoya"
        width="960"
        height="320"
        decoding="async"
      />
    </a>
  );
}
