"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api, homeFor, type Role } from "@/lib/api";
import { storeSession } from "@/lib/supabase";

type LoginResponse = { session: { access_token: string; refresh_token: string }; profile: { role: Role } };

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
      <p className="mt-2 text-ink-muted">Students use their matric number. Tutors use their tutor ID or email.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <TextField label="Email, matric number or tutor ID" name="identifier" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <PasswordField label="Password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" loading={busy} loadingText="Signing in…" disabled={!identifier || !password}>
          Sign in
        </Button>
      </form>
      <p className="mt-8 border-t border-line pt-6 text-ui-sm text-ink-muted">Forgotten your password? Ask the programme admin to reset it.</p>
    </>
  );
}
