"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PasswordFields } from "@/components/ui/PasswordFields";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { api, homeFor, type Role } from "@/lib/api";
import { storeSession } from "@/lib/supabase";

const INVALID = "This link is no longer valid. Ask the admin to send a new one.";

type Check = { valid: false } | { valid: true; first_name: string };
type ActivateResponse = { session: { access_token: string; refresh_token: string } | null; profile: { role: Role } | null };

function Activate() {
  const token = useSearchParams().get("token") ?? "";
  const [check, setCheck] = useState<Check | null>(token ? null : { valid: false });
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<Check>(`/auth/activate/${encodeURIComponent(token)}`).then((res) => setCheck(res.ok ? res.data : { valid: false }));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError("");
    const res = await api<ActivateResponse>("/auth/activate", { body: { token, password } });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if (res.data.session && res.data.profile) {
      await storeSession(res.data.session);
      window.location.assign(homeFor(res.data.profile.role));
    } else {
      window.location.replace("/login/");
    }
  }

  if (!check) {
    return (
      <div className="space-y-6">
        <div aria-hidden="true" className="h-10 w-2/3 rounded-sm bg-paper-2" />
        <SkeletonLines lines={3} />
      </div>
    );
  }

  if (!check.valid) {
    return (
      <>
        <p className="ui-label">Activate your account</p>
        <h1 className="mt-1 font-serif text-ui-xl">Link not valid</h1>
        <p className="mt-3 max-w-measure">{INVALID}</p>
        <ButtonLink href="/login/" variant="secondary" className="mt-8">
          Go to sign in
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <p className="ui-label">Activate your account</p>
      <h1 className="mt-1 font-serif text-ui-xl">Welcome, {check.first_name}.</h1>
      <p className="mt-2 text-ink-muted">Set your password.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <PasswordFields onChange={setPassword} />
        <Button type="submit" loading={busy} loadingText="Saving…" disabled={!password}>
          Set password and continue
        </Button>
      </form>
    </>
  );
}

export default function ActivatePage() {
  return (
    <Suspense>
      <Activate />
    </Suspense>
  );
}
