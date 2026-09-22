"use client";

import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { BrandWordmark } from "./BrandWordmark";
import { CommandRibbon } from "./CommandRibbon";

export function AdminTopBar() {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-stripe" aria-hidden />
      <div className="admin-topbar-inner">
        <div className="admin-brand-block">
          <BrandLogo />
          <div>
            <BrandWordmark kicker="" />
            <span className="admin-mode-badge">
              <span className="admin-mode-dot" aria-hidden />
              ADMIN MODE
            </span>
          </div>
        </div>
        <CommandRibbon />
        <div className="topbar-actions">
          <Link href="/" className="admin-view-public-link">
            ← Public site
          </Link>
        </div>
      </div>
    </header>
  );
}
