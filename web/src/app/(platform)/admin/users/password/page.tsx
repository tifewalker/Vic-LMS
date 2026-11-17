"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminBreadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";

function SetPassword() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const name = params.get("name") || "this person";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const problem = password ? passwordProblem(password) : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordProblem(password)) return;
    setBusy(true);
    setError("");
    const res = await api<{ id: string }>(`/admin/users/${id}/password`, { body: { password } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(true);
    setPassword("");
  }

  return (
    <>
      <AdminBreadcrumbs items={[{ label: "Users", href: "/admin/users/?role=tutor" }, { label: "Set password" }]} />
      <PageHeader kicker="People" title={`Set a password for ${name}`} description="The new password works straight away. No email is sent, so share it with them yourself." />
      <div className="mt-8 max-w-md space-y-6">
        {done ? <Notice tone="success">The password for {name} has been changed.</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setDone(false);
            }}
            hint={PASSWORD_HINT}
            error={problem || undefined}
          />
          <Button type="submit" loading={busy} loadingText="Saving…" disabled={!id || !password || Boolean(problem)}>
            Set password
          </Button>
        </form>
      </div>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <SetPassword />
    </Suspense>
  );
}
