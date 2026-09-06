import { OKB_WEBSITE_URL } from "@/lib/brand";

export function OkbWebsiteButton() {
  return (
    <a href={OKB_WEBSITE_URL} target="_blank" rel="noreferrer" className="okb-site-btn">
      OKB WEBSITE
    </a>
  );
}
