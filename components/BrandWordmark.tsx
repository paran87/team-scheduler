import { BRAND_TAGLINE } from "@/lib/brand";

type BrandWordmarkProps = {
  tone?: "light" | "dark";
  kicker?: string;
};

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect className="bw-cal-page" x="8" y="13" width="3.2" height="3.2" rx="0.8" fill="currentColor" />
      <rect x="13" y="13" width="3.2" height="3.2" rx="0.8" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function DropGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.2c2.8 3.6 6.4 7.4 6.4 11a6.4 6.4 0 1 1-12.8 0c0-3.6 3.6-7.4 6.4-11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21.5s7-6.1 7-11.2A7 7 0 1 0 5 10.3c0 5.1 7 11.2 7 11.2Z"
        fill="currentColor"
      />
      <circle cx="12" cy="10.2" r="2.4" fill="#fff" />
    </svg>
  );
}

export function BrandWordmark({ tone = "light", kicker }: BrandWordmarkProps) {
  return (
    <div className={`brand-wordmark${tone === "dark" ? " is-dark" : ""}`}>
      <p className="brand-wordmark-title" aria-label={BRAND_TAGLINE}>
        <span className="bw-field">
          Field
          <span className="bw-wave" aria-hidden />
        </span>
        <span className="bw-rest">
          <span className="bw-deployment">deployment</span>
          <span className="bw-calendar">
            <span className="bw-glyph is-cal">
              <CalendarGlyph />
            </span>
            calendar
          </span>
          <span className="bw-glyphs" aria-hidden>
            <span className="bw-glyph is-drop">
              <DropGlyph />
            </span>
            <span className="bw-glyph is-pin">
              <PinGlyph />
            </span>
          </span>
          <span className="bw-seals" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/dpwh-logo.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/bagong-pilipinas.png" alt="" />
          </span>
        </span>
      </p>
      {kicker ? <p className="brand-kicker">{kicker}</p> : null}
    </div>
  );
}
