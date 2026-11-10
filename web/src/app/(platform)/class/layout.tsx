"use client";

import { AppShell } from "@/components/platform/AppShell";
import { RequireRole } from "@/components/platform/RequireRole";

/** The class page is shared: students and tutors of the programme, and admins. The API checks enrolment. */
export default function ClassLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["student", "tutor", "admin", "super_admin"]}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
