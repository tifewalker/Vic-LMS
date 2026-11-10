"use client";

import { AppShell } from "@/components/platform/AppShell";
import { RequireRole } from "@/components/platform/RequireRole";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["student"]}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
