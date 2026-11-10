"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, homeFor, signOut, type Me, type Role } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button, Notice } from "./ui";

const MeContext = createContext<Me | null>(null);

/** The signed-in user's profile, inside a RequireRole boundary. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside RequireRole");
  return me;
}

type State = { kind: "loading" } | { kind: "ok"; me: Me } | { kind: "blocked"; message: string };

/**
 * Client-side route guard: checks /me and redirects if signed out or the role is wrong.
 * The API enforces access on every request; this only decides what to show.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase().auth.getSession();
      if (!data.session) return window.location.replace("/login/");

      const res = await api<{ profile: Me }>("/me");
      if (cancelled) return;
      if (!res.ok) {
        if (res.status === 401) {
          await supabase().auth.signOut();
          return window.location.replace("/login/");
        }
        return setState({ kind: "blocked", message: res.error });
      }
      const me = res.data.profile;
      if (!roles.includes(me.role)) return window.location.replace(homeFor(me.role));
      setState({ kind: "ok", me });
    })();
    return () => {
      cancelled = true;
    };
    // roles is a constant per layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.kind === "loading") {
    return (
      <p className="container-site py-16 text-ink-muted" role="status">
        Loading…
      </p>
    );
  }
  if (state.kind === "blocked") {
    return (
      <div className="container-site max-w-xl py-16">
        <Notice tone="error">{state.message}</Notice>
        <Button variant="secondary" className="mt-6" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    );
  }
  return <MeContext.Provider value={state.me}>{children}</MeContext.Provider>;
}
