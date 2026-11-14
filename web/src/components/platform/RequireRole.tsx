"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { api, homeFor, signOut, type Me, type Role } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const MeContext = createContext<Me | null>(null);

/** The signed-in user's profile, inside a RequireRole boundary. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside RequireRole");
  return me;
}

type State = { kind: "loading" } | { kind: "ok"; me: Me } | { kind: "blocked"; message: string };

/** Placeholder with the same frame as the app shell, so nothing jumps when it loads. */
function ShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div aria-hidden="true" className="hidden border-r border-line bg-paper-2 lg:block" />
      <div aria-hidden="true" className="h-16 border-b border-line lg:hidden" />
      <div className="px-4 py-8 md:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-[72rem]">
          <SkeletonPage />
        </div>
      </div>
    </div>
  );
}

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

  if (state.kind === "loading") return <ShellSkeleton />;
  if (state.kind === "blocked") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Notice tone="error">{state.message}</Notice>
        <Button variant="secondary" className="mt-6" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    );
  }
  return <MeContext.Provider value={state.me}>{children}</MeContext.Provider>;
}
