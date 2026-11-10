"use client";

import { AppShell } from "@/components/platform/AppShell";
import { RequireRole } from "@/components/platform/RequireRole";

const nav = [
  { href: "/admin/", label: "Dashboard" },
  { href: "/admin/programmes/", label: "Programmes" },
  { href: "/admin/users/", label: "Users" },
  { href: "/admin/users/import/", label: "Import students" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["admin", "super_admin"]}>
      <AppShell nav={nav}>{children}</AppShell>
    </RequireRole>
  );
}
