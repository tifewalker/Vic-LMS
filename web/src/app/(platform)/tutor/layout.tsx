"use client";

import { AppShell } from "@/components/platform/AppShell";
import { RequireRole } from "@/components/platform/RequireRole";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["tutor"]}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
