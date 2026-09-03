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
import { ACTIVITY_CHANNEL, type ActivityNote } from "@/lib/activity-notes";

type ActivityNotesContextValue = {
  notes: ActivityNote[];
  loading: boolean;
  refresh: () => Promise<void>;
  replaceNotes: (notes: ActivityNote[]) => void;
};

const ActivityNotesContext = createContext<ActivityNotesContextValue>({
  notes: [],
  loading: false,
  refresh: async () => {},
  replaceNotes: () => {},
});

const REFRESH_MS = 30_000;

async function loadNotes() {
  try {
    const response = await fetch("/api/activity-notes", { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as { notes?: ActivityNote[]; error?: string };
    if (!response.ok) {
      console.error("activity-notes:", data.error || `HTTP ${response.status}`);
      return null;
    }
    return data.notes ?? [];
  } catch (error) {
    console.error("activity-notes:", error);
    return null;
  }
}

function sameNotes(a: ActivityNote[], b: ActivityNote[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ActivityNotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshRequestId = useRef(0);

  const replaceNotes = useCallback((next: ActivityNote[]) => {
    refreshRequestId.current += 1;
    setNotes((current) => (sameNotes(current, next) ? current : next));
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestId.current;
    try {
      const next = await loadNotes();
      if (requestId !== refreshRequestId.current || next === null) return;
      setNotes((current) => (sameNotes(current, next) ? current : next));
    } finally {
      if (requestId === refreshRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(ACTIVITY_CHANNEL);
      channel.onmessage = () => {
        void refresh();
      };
    } catch {
      channel = null;
    }

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      channel?.close();
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const value = useMemo(() => ({ notes, loading, refresh, replaceNotes }), [notes, loading, refresh, replaceNotes]);

  return <ActivityNotesContext.Provider value={value}>{children}</ActivityNotesContext.Provider>;
}

export function useActivityNotes() {
  return useContext(ActivityNotesContext);
}

export function notifyActivityNotesChanged() {
  try {
    const channel = new BroadcastChannel(ACTIVITY_CHANNEL);
    channel.postMessage("updated");
    channel.close();
  } catch {
    /* BroadcastChannel is unavailable in some browsers */
  }
}
