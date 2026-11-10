"use client";

import { useState } from "react";
import { Button, Field, Notice } from "@/components/platform/ui";
import { api, homeFor, type Role } from "@/lib/api";
import { storeSession } from "@/lib/supabase";

type LoginResponse = { session: { access_token: string; refresh_token: string }; profile: { role: Role } };

const linkClass = "text-[0.9375rem] text-accent-strong underline decoration-accent/45 underline-offset-[0.22em]";

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
      <h1 className="text-[2rem]">Sign in</h1>
      <p className="mt-2 text-ink-muted">Use the details from your invitation email.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Field
          label="Email, matric number or tutor ID"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <Button type="submit" disabled={busy || !identifier || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <a href="/forgot-password/" className={linkClass}>
            Forgot password
          </a>
        </div>
      </form>
    </>
  );
}
