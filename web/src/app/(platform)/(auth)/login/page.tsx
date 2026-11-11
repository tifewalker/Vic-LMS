"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api, homeFor, type Role } from "@/lib/api";
import { storeSession } from "@/lib/supabase";

type LoginResponse = { session: { access_token: string; refresh_token: string }; profile: { role: Role } };

const linkClass = "text-ui-sm font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<LoginResponse>("/auth/login", { body: { identifier, password } });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    await storeSession(res.data.session);
    window.location.assign(homeFor(res.data.profile.role));
  }

  return (
    <>
      <p className="ui-label">Training platform</p>
      <h1 className="mt-1 font-serif text-ui-xl">Sign in</h1>
      <p className="mt-2 text-ink-muted">Use the details from your invitation email.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <TextField label="Email, matric number or tutor ID" name="identifier" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button type="submit" loading={busy} loadingText="Signing in…" disabled={!identifier || !password}>
            Sign in
          </Button>
          <a href="/forgot-password/" className={linkClass}>
            Forgot password
          </a>
        </div>
      </form>
    </>
  );
}
