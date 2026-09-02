"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ACTIVITY_CHANNEL, type ActivityNote } from "@/lib/activity-notes";

type ActivityNotesContextValue = {
  notes: ActivityNote[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const ActivityNotesContext = createContext<ActivityNotesContextValue>({
  notes: [],
  loading: false,
  refresh: async () => {},
});

async function loadNotes() {
  try {
    const response = await fetch("/api/activity-notes", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { notes?: ActivityNote[] };
    return data.notes ?? [];
  } catch {
    return null;
  }
}

export function ActivityNotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await loadNotes();
      if (next) setNotes(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);

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

  const value = useMemo(() => ({ notes, loading, refresh }), [notes, loading, refresh]);

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
