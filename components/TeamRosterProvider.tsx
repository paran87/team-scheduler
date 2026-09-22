"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  allRosterPeople,
  mergeTeamRoster,
  setExtraRosterMembers,
  TEAM_ROSTER_CHANNEL,
  TEAM_ROSTERS,
  type ExtraRosterMember,
  type RosterPerson,
  type TeamRoster,
} from "@/lib/team-roster";
import type { TeamKey } from "@/lib/types";

type TeamRosterContextValue = {
  extras: ExtraRosterMember[];
  people: RosterPerson[];
  loading: boolean;
  rosterFor: (team: TeamKey) => TeamRoster;
  refresh: () => Promise<void>;
  replaceExtras: (members: ExtraRosterMember[]) => void;
};

const TeamRosterContext = createContext<TeamRosterContextValue>({
  extras: [],
  people: allRosterPeople([]),
  loading: false,
  rosterFor: (team) => mergeTeamRoster(TEAM_ROSTERS[team], []),
  refresh: async () => {},
  replaceExtras: () => {},
});

const STORAGE_KEY = `${TEAM_ROSTER_CHANNEL}:updated`;

async function loadExtras() {
  try {
    const response = await fetch("/api/team-roster", { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as { members?: ExtraRosterMember[]; error?: string };
    if (!response.ok) {
      console.error("team-roster:", data.error || `HTTP ${response.status}`);
      return null;
    }
    return Array.isArray(data.members) ? data.members : [];
  } catch (error) {
    console.error("team-roster:", error);
    return null;
  }
}

function sameExtras(a: ExtraRosterMember[], b: ExtraRosterMember[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function TeamRosterProvider({ children }: { children: ReactNode }) {
  const [extras, setExtras] = useState<ExtraRosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshRequestId = useRef(0);

  const applyExtras = useCallback((members: ExtraRosterMember[]) => {
    setExtraRosterMembers(members);
    setExtras((current) => (sameExtras(current, members) ? current : members));
  }, []);

  const replaceExtras = useCallback(
    (members: ExtraRosterMember[]) => {
      refreshRequestId.current += 1;
      applyExtras(members);
      setLoading(false);
    },
    [applyExtras],
  );

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestId.current;
    try {
      const next = await loadExtras();
      if (requestId !== refreshRequestId.current || next === null) return;
      applyExtras(next);
    } finally {
      if (requestId === refreshRequestId.current) setLoading(false);
    }
  }, [applyExtras]);

  useEffect(() => {
    void refresh();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(TEAM_ROSTER_CHANNEL);
      channel.onmessage = () => {
        void refresh();
      };
    } catch {
      channel = null;
    }

    const onLiveUpdate = () => {
      void refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) void refresh();
    };

    window.addEventListener(TEAM_ROSTER_CHANNEL, onLiveUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      window.removeEventListener(TEAM_ROSTER_CHANNEL, onLiveUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const value = useMemo<TeamRosterContextValue>(
    () => ({
      extras,
      people: allRosterPeople(extras),
      loading,
      rosterFor: (team) => mergeTeamRoster(TEAM_ROSTERS[team], extras),
      refresh,
      replaceExtras,
    }),
    [extras, loading, refresh, replaceExtras],
  );

  return <TeamRosterContext.Provider value={value}>{children}</TeamRosterContext.Provider>;
}

export function useTeamRoster() {
  return useContext(TeamRosterContext);
}

export function notifyTeamRosterChanged() {
  try {
    const channel = new BroadcastChannel(TEAM_ROSTER_CHANNEL);
    channel.postMessage("updated");
    channel.close();
  } catch {
    /* BroadcastChannel is unavailable in some browsers */
  }
  try {
    localStorage.setItem(`${TEAM_ROSTER_CHANNEL}:updated`, String(Date.now()));
  } catch {
    /* private mode or disabled storage */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TEAM_ROSTER_CHANNEL));
  }
}
