"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Notice, PasswordFields } from "@/components/platform/ui";
import { api, homeFor, type Role } from "@/lib/api";
import { storeSession } from "@/lib/supabase";

const INVALID = "This link is no longer valid. Ask the admin to send a new one.";

type Check = { valid: false } | { valid: true; first_name: string };
type ActivateResponse = {
  session: { access_token: string; refresh_token: string } | null;
  profile: { role: Role } | null;
};

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
      <p className="text-ink-muted" role="status">
        Checking your link…
      </p>
    );
  }

  if (!check.valid) {
    return (
      <>
        <h1 className="text-[2rem]">Link not valid</h1>
        <p className="mt-4">{INVALID}</p>
        <p className="mt-6">
          <a href="/login/" className="text-accent-strong underline decoration-accent/45 underline-offset-[0.22em]">
            Go to sign in
          </a>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[2rem]">Welcome, {check.first_name}.</h1>
      <p className="mt-2 text-ink-muted">Set your password.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <PasswordFields onChange={setPassword} />
        <Button type="submit" disabled={busy || !password}>
          {busy ? "Saving…" : "Set password and continue"}
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
