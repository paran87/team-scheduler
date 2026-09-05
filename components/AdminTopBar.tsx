"use client";

import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { BrandWordmark } from "./BrandWordmark";

export function AdminTopBar() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <BrandLogo />
          <BrandWordmark kicker="Admin · Edit schedule & activities" />
        </div>
        <Link href="/" className="backend-nav-link">
          View public site
        </Link>
      </div>
    </header>
  );
}
