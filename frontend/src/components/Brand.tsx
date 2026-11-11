// Set this one value when the approved logo file is available.
export const BRAND_LOGO_URL: string | null = null;
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span
        className="logo-slot"
        aria-label="Logotip uchun ajratilgan bo‘sh joy"
      >
        {BRAND_LOGO_URL && (
          <img src={BRAND_LOGO_URL} alt="Uzluksiz Himoya logotipi" />
        )}
      </span>
      <div className={compact ? "brand-copy compact" : "brand-copy"}>
        <strong className="brand-short">
          UzHi<span className="brand-dot">.</span>
        </strong>
        <span>Uzluksiz Himoya</span>
      </div>
    </div>
  );
}
