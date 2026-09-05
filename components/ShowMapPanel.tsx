"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { MONTH_NAMES, TEAM_META } from "@/lib/schedule-data";
import { getMapPins, type MapPin } from "@/lib/map-pins";
import { personInitials } from "@/lib/team-roster";
import { activityReportPath, notesForBlock, toDateKey } from "@/lib/activity-notes";
import { durationLabelForAssignment } from "@/lib/assignment-duration";
import { getPlaceImage } from "@/lib/place-images";
import { useActivityNotes } from "./ActivityNotesProvider";
import { ActivityFields } from "./ActivityFields";
import { TeamAvatar } from "./TeamAvatar";
import { TeamLink } from "./TeamLink";

type ShowMapPanelProps = {
  viewYear: number;
  viewMonth: number;
};

type Viewport = {
  zoom: number;
  lat: number;
  lng: number;
};

type PinMetrics = {
  width: number;
  height: number;
  photo: number;
  font: number;
  placeFont: number;
};

type PlacedLabel = {
  pin: MapPin;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  metrics: PinMetrics;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 12;
const PH_CENTER: Viewport = { zoom: 6, lat: 12.5, lng: 122.2 };

function lngToWorldX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToWorldY(lat: number, zoom: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * TILE_SIZE * 2 ** zoom;
}

function worldToLng(x: number, zoom: number) {
  return (x / (TILE_SIZE * 2 ** zoom)) * 360 - 180;
}

function worldToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * 2 ** zoom);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function pinMetrics(zoom: number): PinMetrics {
  const t = (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
  return {
    width: Math.round(112 + t * 78),
    height: Math.round(24 + t * 22),
    photo: Math.round(16 + t * 18),
    font: Math.round(8 + t * 4),
    placeFont: Math.round(7 + t * 4),
  };
}

function fitViewport(pins: MapPin[], width: number, height: number): Viewport {
  if (!pins.length || width < 40 || height < 40) return PH_CENTER;

  const lats = [...pins.map((pin) => pin.lat)].sort((a, b) => a - b);
  const lngs = [...pins.map((pin) => pin.lng)].sort((a, b) => a - b);
  const lo = Math.floor((lats.length - 1) * 0.1);
  const hi = Math.ceil((lats.length - 1) * 0.9);
  const minLat = lats[lo];
  const maxLat = lats[hi];
  const minLng = lngs[lo];
  const maxLng = lngs[hi];
  const pad = 88;

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const spanX = lngToWorldX(maxLng, zoom) - lngToWorldX(minLng, zoom);
    const spanY = latToWorldY(minLat, zoom) - latToWorldY(maxLat, zoom);
    if (spanX + pad * 2 <= width && spanY + pad * 2 <= height) {
      return { zoom, lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
    }
  }

  return { zoom: MIN_ZOOM, lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

function tilesFor(view: Viewport, width: number, height: number) {
  const zoom = view.zoom;
  const n = 2 ** zoom;
  const worldX = lngToWorldX(view.lng, zoom);
  const worldY = latToWorldY(view.lat, zoom);
  const originX = worldX - width / 2;
  const originY = worldY - height / 2;
  const minTX = Math.floor(originX / TILE_SIZE);
  const minTY = Math.floor(originY / TILE_SIZE);
  const maxTX = Math.floor((originX + width) / TILE_SIZE);
  const maxTY = Math.floor((originY + height) / TILE_SIZE);
  const tiles: { key: string; left: number; top: number; src: string }[] = [];

  for (let ty = minTY; ty <= maxTY; ty += 1) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = minTX; tx <= maxTX; tx += 1) {
      const wrappedX = ((tx % n) + n) % n;
      tiles.push({
        key: `${zoom}-${wrappedX}-${ty}-${tx}`,
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
        src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
      });
    }
  }

  return { tiles, originX, originY };
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  gap: number,
) {
  return ax < bx + bw + gap && ax + aw + gap > bx && ay < by + bh + gap && ay + ah + gap > by;
}

function layoutLabels(
  pins: MapPin[],
  view: Viewport,
  originX: number,
  originY: number,
  canvasW: number,
  canvasH: number,
  selectedId?: string | null,
): PlacedLabel[] {
  const metrics = pinMetrics(view.zoom);
  const gap = 5;
  const margin = 8;
  const reserved = [
    { x: canvasW - 58, y: 8, w: 50, h: 96 },
    { x: canvasW - 150, y: canvasH - 36, w: 142, h: 28 },
  ];
  const points = pins
    .map((pin) => ({
      pin,
      x: lngToWorldX(pin.lng, view.zoom) - originX,
      y: latToWorldY(pin.lat, view.zoom) - originY,
    }))
    .sort((a, b) => {
      if (a.pin.id === selectedId) return -1;
      if (b.pin.id === selectedId) return 1;
      return a.y - b.y || a.x - b.x;
    });

  const placed: PlacedLabel[] = [];

  function blocked(lx: number, ly: number) {
    if (lx < margin || ly < margin || lx + metrics.width > canvasW - margin || ly + metrics.height > canvasH - margin) {
      return true;
    }
    if (
      reserved.some((zone) =>
        rectsOverlap(lx, ly, metrics.width, metrics.height, zone.x, zone.y, zone.w, zone.h, 4),
      )
    ) {
      return true;
    }
    return placed.some((item) =>
      rectsOverlap(lx, ly, metrics.width, metrics.height, item.labelX, item.labelY, metrics.width, metrics.height, gap),
    );
  }

  for (const point of points) {
    const candidates: { labelX: number; labelY: number }[] = [];
    const ring = Math.max(metrics.width, metrics.height) + 10;

    candidates.push(
      { labelX: point.x + 12, labelY: point.y - metrics.height / 2 },
      { labelX: point.x - metrics.width - 12, labelY: point.y - metrics.height / 2 },
      { labelX: point.x - metrics.width / 2, labelY: point.y - metrics.height - 12 },
      { labelX: point.x - metrics.width / 2, labelY: point.y + 12 },
    );

    for (let step = 1; step <= 8; step += 1) {
      const radius = ring * 0.35 * step;
      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * Math.PI * 2 + step * 0.18;
        candidates.push({
          labelX: point.x + Math.cos(angle) * radius - metrics.width / 2,
          labelY: point.y + Math.sin(angle) * radius - metrics.height / 2,
        });
      }
    }

    for (let row = 0; row < Math.ceil(canvasH / (metrics.height + gap)); row += 1) {
      for (const col of [0, 1, 2]) {
        candidates.push({
          labelX: margin + col * (metrics.width + gap),
          labelY: margin + row * (metrics.height + gap),
        });
      }
    }

    let best: { labelX: number; labelY: number } | null = null;
    let bestDist = Infinity;
    for (const candidate of candidates) {
      const labelX = Math.min(canvasW - metrics.width - margin, Math.max(margin, candidate.labelX));
      const labelY = Math.min(canvasH - metrics.height - margin, Math.max(margin, candidate.labelY));
      if (blocked(labelX, labelY)) continue;
      const cx = labelX + metrics.width / 2;
      const cy = labelY + metrics.height / 2;
      const dist = (cx - point.x) ** 2 + (cy - point.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = { labelX, labelY };
      }
    }

    placed.push({
      pin: point.pin,
      x: point.x,
      y: point.y,
      labelX: best?.labelX ?? margin,
      labelY: best?.labelY ?? margin,
      metrics,
    });
  }

  return placed;
}

function LeadThumb({ pin, size }: { pin: MapPin; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = personInitials(pin.leadName);
  const style = size ? { width: size, height: size } : undefined;

  if (failed || !pin.leadPhoto) {
    return (
      <span className="map-label-fallback" style={{ background: pin.color, ...style }}>
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pin.leadPhoto}
      alt={pin.leadName}
      className="map-label-photo"
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

function MapActivityCard({
  pin,
  viewYear,
  viewMonth,
  onClose,
}: {
  pin: MapPin;
  viewYear: number;
  viewMonth: number;
  onClose: () => void;
}) {
  const { notes } = useActivityNotes();
  const fields = notesForBlock(notes, viewYear, viewMonth, pin);
  const location = pin.place;
  const placeImage = getPlaceImage(location);
  const meta = TEAM_META[pin.team];
  const rangeLabel =
    pin.start === pin.end
      ? `${MONTH_NAMES[viewMonth].slice(0, 3)} ${pin.start}`
      : `${MONTH_NAMES[viewMonth].slice(0, 3)} ${pin.start}–${pin.end}`;

  return (
    <aside
      className="map-info-panel"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="detail-header">
        <div>
          <div className="detail-date-big">{rangeLabel}</div>
          <div className="detail-date-sub">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close activity details">
          ✕
        </button>
      </div>

      <div className="team-card" style={{ marginBottom: 0 }}>
        <div className={`team-photo ${meta.photoClass}`}>
          {placeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={placeImage}
              alt=""
              className="place-photo"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <div className="overlay" />
          <div>
            <div className="pin" style={{ textAlign: "center" }}>
              📍
            </div>
            <div className="loc-text">{location}</div>
          </div>
        </div>
        <div className="team-body">
          <TeamLink team={pin.team} date={toDateKey(viewYear, viewMonth, pin.start)} className="team-name-row team-nav-link">
            <span className={`team-chip ${meta.chipSolid}`}>{pin.teamLabel}</span>
            <TeamAvatar teamKey={pin.team} size={32} />
          </TeamLink>
          <p className="team-place">{pin.leadName}</p>
          {pin.event ? <p className="team-event">{pin.event}</p> : null}
          <ActivityFields
            location={location}
            duration={durationLabelForAssignment(viewYear, viewMonth, pin.start, pin.team, notes, pin.start, pin.end)}
            activity={fields.activity}
            reportHref={activityReportPath(toDateKey(viewYear, viewMonth, pin.start), pin.team)}
          />
        </div>
      </div>
    </aside>
  );
}

export function ShowMapPanel({ viewYear, viewMonth }: ShowMapPanelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<Viewport>(PH_CENTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const fittedFor = useRef("");
  const centeredId = useRef<string | null>(null);

  const { notes } = useActivityNotes();
  const pins = useMemo(() => getMapPins(viewYear, viewMonth, notes), [viewYear, viewMonth, notes]);
  const pinKey = pins.map((pin) => pin.id).join("|");
  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedId(null);
    fittedFor.current = "";
    centeredId.current = null;
  }, [viewYear, viewMonth, pinKey]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.width < 40 || size.height < 40) return;
    const key = `${viewYear}-${viewMonth}`;
    if (fittedFor.current === key) return;
    fittedFor.current = key;
    setView(fitViewport(pins, size.width, size.height));
  }, [viewYear, viewMonth, pins, size.width, size.height]);

  function focusPin(pin: MapPin) {
    setSelectedId(pin.id);
    setView((current) => ({
      zoom: Math.max(current.zoom, 7),
      lat: pin.lat,
      lng: pin.lng,
    }));
  }

  const { tiles, originX, originY } = useMemo(
    () => tilesFor(view, size.width, size.height),
    [view, size.width, size.height],
  );
  const markers = useMemo(
    () => layoutLabels(pins, view, originX, originY, size.width, size.height, selectedId),
    [pins, view, originX, originY, size.width, size.height, selectedId],
  );

  useEffect(() => {
    if (!selectedId || size.width < 40 || size.height < 40) {
      if (!selectedId) centeredId.current = null;
      return;
    }
    if (centeredId.current === selectedId) return;
    const marker = markers.find((item) => item.pin.id === selectedId);
    if (!marker) return;
    centeredId.current = selectedId;
    const dx = size.width / 2 - (marker.labelX + marker.metrics.width / 2);
    const dy = size.height / 2 - (marker.labelY + marker.metrics.height / 2);
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      setView((current) => {
        const worldX = lngToWorldX(current.lng, current.zoom) - dx;
        const worldY = latToWorldY(current.lat, current.zoom) - dy;
        return {
          zoom: current.zoom,
          lng: worldToLng(worldX, current.zoom),
          lat: worldToLat(worldY, current.zoom),
        };
      });
    }
  }, [selectedId, markers, size.width, size.height]);

  function panBy(dx: number, dy: number) {
    setView((current) => {
      const worldX = lngToWorldX(current.lng, current.zoom) - dx;
      const worldY = latToWorldY(current.lat, current.zoom) - dy;
      return {
        zoom: current.zoom,
        lng: worldToLng(worldX, current.zoom),
        lat: worldToLat(worldY, current.zoom),
      };
    });
  }

  function zoomBy(delta: number, clientX?: number, clientY?: number) {
    const el = wrapRef.current;
    setView((current) => {
      const zoom = clampZoom(current.zoom + delta);
      if (zoom === current.zoom || !el) return { ...current, zoom };
      const rect = el.getBoundingClientRect();
      const anchorX = clientX == null ? rect.width / 2 : clientX - rect.left;
      const anchorY = clientY == null ? rect.height / 2 : clientY - rect.top;
      const currentOriginX = lngToWorldX(current.lng, current.zoom) - rect.width / 2;
      const currentOriginY = latToWorldY(current.lat, current.zoom) - rect.height / 2;
      const lat = worldToLat(currentOriginY + anchorY, current.zoom);
      const lng = worldToLng(currentOriginX + anchorX, current.zoom);
      const nextOriginX = lngToWorldX(lng, zoom) - anchorX;
      const nextOriginY = latToWorldY(lat, zoom) - anchorY;
      return {
        zoom,
        lng: worldToLng(nextOriginX + rect.width / 2, zoom),
        lat: worldToLat(nextOriginY + rect.height / 2, zoom),
      };
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    movedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    panBy(dx, dy);
    drag.startX = event.clientX;
    drag.startY = event.clientY;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!movedRef.current) setSelectedId(null);
  }

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement | null)?.closest(".map-info-layer")) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1 : -1, event.clientX, event.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="map-panel">
      <div className="section-heading">
        <h2>Show Map</h2>
        <p>
          Every location covered by team activity in {MONTH_NAMES[viewMonth]} {viewYear}. Click a
          label to read its information.
        </p>
      </div>

      <div className="map-stage">
        <div className={`map-canvas${selected ? " has-panel" : ""}`}>
          <div
            ref={wrapRef}
            className="map-surface"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {tiles.map((tile) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tile.key}
                src={tile.src}
                alt=""
                draggable={false}
                className="map-tile"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}

            <svg className="map-leaders" aria-hidden="true">
              {markers.map((marker) => (
                <line
                  key={marker.pin.id}
                  x1={marker.x}
                  y1={marker.y}
                  x2={marker.labelX + 10}
                  y2={marker.labelY + marker.metrics.height / 2}
                  stroke={marker.pin.id === selectedId ? marker.pin.color : "rgba(28, 30, 43, 0.35)"}
                  strokeWidth={marker.pin.id === selectedId ? 2 : 1}
                />
              ))}
            </svg>

            {markers.map((marker) => (
              <span
                key={`${marker.pin.id}-dot`}
                className="map-anchor"
                style={{ left: marker.x, top: marker.y, background: marker.pin.color }}
              />
            ))}

            {markers.map((marker) => (
              <button
                key={marker.pin.id}
                type="button"
                className={`map-photo-pin${marker.pin.id === selectedId ? " is-selected" : ""}`}
                style={{
                  left: marker.labelX,
                  top: marker.labelY,
                  width: marker.metrics.width,
                  height: marker.metrics.height,
                  ["--pin" as string]: marker.pin.color,
                  ["--pin-photo" as string]: `${marker.metrics.photo}px`,
                  ["--pin-font" as string]: `${marker.metrics.font}px`,
                  ["--pin-place" as string]: `${marker.metrics.placeFont}px`,
                }}
                title={`${marker.pin.teamLabel} · ${marker.pin.leadName} · ${marker.pin.place}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => focusPin(marker.pin)}
              >
                <LeadThumb pin={marker.pin} size={marker.metrics.photo} />
                <span className="map-label-text">
                  <strong>{marker.pin.teamLabel}</strong>
                  <em>{marker.pin.place}</em>
                </span>
              </button>
            ))}

            <div className="map-zoom" onPointerDown={(event) => event.stopPropagation()}>
              <button type="button" className="icon-btn" title="Zoom in" onClick={() => zoomBy(1)}>
                +
              </button>
              <button type="button" className="icon-btn" title="Zoom out" onClick={() => zoomBy(-1)}>
                −
              </button>
            </div>
            <p className="map-attrib">
              ©{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                OpenStreetMap
              </a>
            </p>
          </div>

          {selected ? (
            <div
              className="map-info-layer"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <MapActivityCard
                pin={selected}
                viewYear={viewYear}
                viewMonth={viewMonth}
                onClose={() => setSelectedId(null)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {!pins.length ? (
        <p className="map-empty">No mapped locations for this month.</p>
      ) : (
        <p className="map-count">{pins.length} mapped locations this month</p>
      )}
    </div>
  );
}
