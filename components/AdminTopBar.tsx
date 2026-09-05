"use client";

import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

export function AdminTopBar() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <BrandLogo />
          <div>
            <p className="brand-title">Team Schedule Dashboard</p>
            <p className="brand-sub">Admin · Edit schedule &amp; activities</p>
          </div>
        </div>
        <Link href="/" className="backend-nav-link">
          View dashboard
        </Link>
      </div>
    </header>
  );
}
