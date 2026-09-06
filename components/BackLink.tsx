"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { homeTabHref, isTabName, labelForReturnUrl, TAB_LABELS, TAB_STORAGE_KEY } from "@/lib/tabs";

type BackLinkProps = {
  initialHref?: string;
  initialLabel?: string;
};

export function BackLink({ initialHref = homeTabHref(), initialLabel = "← Back" }: BackLinkProps) {
  const router = useRouter();
  const [href, setHref] = useState(initialHref);
  const [label, setLabel] = useState(initialLabel);
  const [useHistory, setUseHistory] = useState(false);

  useEffect(() => {
    let nextHref = initialHref;
    let nextLabel = initialLabel;
    const fallback = initialHref === homeTabHref() && initialLabel === "← Back";
    let hasInAppOrigin = !fallback;

    try {
      const storedTab = sessionStorage.getItem(TAB_STORAGE_KEY);
      if (fallback && isTabName(storedTab)) {
        nextHref = homeTabHref(storedTab);
        nextLabel = `← ${TAB_LABELS[storedTab]}`;
        hasInAppOrigin = true;
      }
    } catch {
      /* sessionStorage unavailable */
    }

    try {
      const referrer = document.referrer;
      if (referrer) {
        const url = new URL(referrer);
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          nextHref = `${url.pathname}${url.search}${url.hash}` || nextHref;
          nextLabel = `← ${labelForReturnUrl(url)}`;
          hasInAppOrigin = true;
        }
      }
    } catch {
      /* ignore invalid referrer */
    }

    setHref(nextHref);
    setLabel(nextLabel);
    setUseHistory(window.history.length > 1 && hasInAppOrigin);
  }, [initialHref, initialLabel]);

  return (
    <Link
      href={href}
      className="org-back"
      onClick={(event) => {
        if (!useHistory) return;
        event.preventDefault();
        router.back();
      }}
    >
      {label}
    </Link>
  );
}
