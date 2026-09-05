import { BRAND_NAME } from "@/lib/brand";

export function BrandLogo() {
  return (
    <div className="brand-icon">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/oplan-kontra-baha.png"
        alt={BRAND_NAME}
        className="brand-logo"
      />
    </div>
  );
}
