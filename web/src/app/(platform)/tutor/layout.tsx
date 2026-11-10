"use client";

import { AppShell } from "@/components/platform/AppShell";
import { RequireRole } from "@/components/platform/RequireRole";

// Admins can do everything a tutor can, so they may open these pages too.
export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["tutor", "admin", "super_admin"]}>
      <AppShell nav={[{ href: "/tutor/", label: "My programmes" }]}>{children}</AppShell>
    </RequireRole>
  );
}
