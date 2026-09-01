"use client";

import { useState } from "react";
import { TEAM_META } from "@/lib/schedule-data";
import type { TeamKey } from "@/lib/types";

type TeamAvatarProps = {
  teamKey: TeamKey;
  size?: number;
};

export function TeamAvatar({ teamKey, size = 32 }: TeamAvatarProps) {
  const meta = TEAM_META[teamKey];
  const [failed, setFailed] = useState(false);
  const fontSize = Math.round(size * 0.42);

  return (
    <span className="avatar-circle-wrap" style={{ width: size, height: size }}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.avatar}
          alt={meta.label}
          className="team-avatar-circle"
          style={{ width: size, height: size }}
          onError={() => setFailed(true)}
        />
      )}
      <span
        className="avatar-fallback"
        style={{
          width: size,
          height: size,
          fontSize,
          background: meta.color,
          display: failed ? "flex" : "none",
        }}
      >
        {meta.initials}
      </span>
    </span>
  );
}
