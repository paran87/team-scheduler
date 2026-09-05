"use client";

import { useEffect, useState } from "react";
import type { ActivityReportImage } from "@/lib/activity-notes";

type ReportPhotoGalleryProps = {
  images: ActivityReportImage[];
};

function fileNameFor(image: ActivityReportImage, index: number) {
  const raw = (image.name || image.path.split("/").pop() || `photo-${index + 1}`).trim();
  return raw.replace(/[\\/:*?"<>|]+/g, "-") || `photo-${index + 1}`;
}

async function downloadPhoto(image: ActivityReportImage, index: number) {
  const fileName = fileNameFor(image, index);
  try {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(image.url, "_blank", "noopener,noreferrer");
  }
}

export function ReportPhotoGallery({ images }: ReportPhotoGalleryProps) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active == null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((current) => (current == null ? current : (current + 1) % images.length));
      if (event.key === "ArrowLeft") {
        setActive((current) => (current == null ? current : (current - 1 + images.length) % images.length));
      }
    }

    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [active, images.length]);

  if (!images.length) {
    return <p className="report-empty">No photos uploaded yet.</p>;
  }

  const current = active == null ? null : images[active];

  return (
    <>
      <ul className="report-photo-grid">
        {images.map((image, index) => (
          <li key={image.path}>
            <button
              type="button"
              className="report-photo-open"
              onClick={() => setActive(index)}
              aria-label={`Enlarge ${image.name || `photo ${index + 1}`}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" />
              <span className="report-photo-hint" aria-hidden>
                View
              </span>
            </button>
          </li>
        ))}
      </ul>

      {current && active != null ? (
        <div className="report-lightbox" onClick={() => setActive(null)} role="presentation">
          <div
            className="report-lightbox-card"
            role="dialog"
            aria-modal="true"
            aria-label={current.name || "Enlarged photo"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="report-lightbox-top">
              <button
                type="button"
                className="report-lightbox-icon is-download"
                aria-label="Download"
                onClick={() => void downloadPhoto(current, active)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 4v12" />
                  <path d="m7 12 5 5 5-5" />
                  <path d="M5 20h14" />
                </svg>
              </button>
              <button type="button" className="report-lightbox-icon is-close" aria-label="Close" onClick={() => setActive(null)}>
                <span aria-hidden>×</span>
              </button>
            </div>

            {images.length > 1 ? (
              <button
                type="button"
                className="report-lightbox-nav is-prev"
                aria-label="Previous"
                onClick={() => setActive((active - 1 + images.length) % images.length)}
              >
                <span aria-hidden>‹</span>
              </button>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.name} />

            {images.length > 1 ? (
              <button
                type="button"
                className="report-lightbox-nav is-next"
                aria-label="Next"
                onClick={() => setActive((active + 1) % images.length)}
              >
                <span aria-hidden>›</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
