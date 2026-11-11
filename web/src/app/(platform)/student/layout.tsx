"use client";

import { RequireRole } from "@/components/platform/RequireRole";
import { AppShell } from "@/components/ui/AppShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["student"]}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
