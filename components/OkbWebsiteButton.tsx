"use client";

import { useEffect, useState } from "react";

export function OkbWebsiteButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="okb-site-btn" onClick={() => setOpen(true)}>
        OKB WEBSITE
      </button>
      {open ? (
        <div className="okb-soon-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div
            className="okb-soon-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="okb-soon-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="okb-soon-title" className="okb-soon-title">
              Coming soon...
            </p>
            <button type="button" className="okb-soon-close" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
