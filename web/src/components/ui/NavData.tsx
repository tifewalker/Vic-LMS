"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useMe } from "@/components/platform/RequireRole";
import { api, type Me } from "@/lib/api";
import { useModerationSignal } from "@/lib/realtime";

export type LiveClass = { id: string; title: string; programme_id: string };

/** Counts shown in the sidebar and on the dashboards. */
export type NavData = {
  live: LiveClass[];
  unanswered_live: number;
  unanswered_threads: number;
  ungraded: number;
  due: number;
  muted: boolean;
  programmes: { id: string; title: string }[];
  loaded: boolean;
};

const empty: NavData = { live: [], unanswered_live: 0, unanswered_threads: 0, ungraded: 0, due: 0, muted: false, programmes: [], loaded: false };

const Ctx = createContext<{ data: NavData; refresh: () => void }>({ data: empty, refresh: () => {} });

export const useNavData = () => useContext(Ctx);

const isAdminRole = (r: Me["role"]) => r === "admin" || r === "super_admin";

/** Loads the counts for the signed-in role, then keeps them fresh: every minute, on focus, and after moderation. */
export function NavDataProvider({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const [data, setData] = useState<NavData>(empty);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const base = isAdminRole(me.role) ? "/admin" : me.role === "tutor" ? "/tutor" : "/student";
    const programmesPath = me.role === "tutor" ? "/tutor/programmes" : me.role === "student" ? "/student/overview" : null;
    Promise.all([
      api<Partial<NavData>>(`${base}/nav`),
      programmesPath ? api<{ programmes: { id: string; title: string }[] }>(programmesPath) : Promise.resolve(null),
    ]).then(([nav, progs]) => {
      if (cancelled) return;
      setData((prev) => ({
        ...prev,
        ...(nav.ok ? nav.data : {}),
        programmes: progs?.ok ? progs.data.programmes.map(({ id, title }) => ({ id, title })) : prev.programmes,
        loaded: true,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [me.role, tick]);

  useEffect(() => {
    const id = window.setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // A mute or unmute of this user arrives here.
  useModerationSignal([`mod:user:${me.id}`], refresh);

  return <Ctx.Provider value={{ data, refresh }}>{children}</Ctx.Provider>;
}
