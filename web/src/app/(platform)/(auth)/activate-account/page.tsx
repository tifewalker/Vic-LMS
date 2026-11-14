"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { TextField } from "@/components/ui/Field";
import { PasswordFields } from "@/components/ui/PasswordFields";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { api, homeFor, type Role } from "@/lib/api";
import { storeSession } from "@/lib/supabase";

const INVALID = "This link is no longer valid. Request a new one below.";
const linkClass = "text-ui-sm font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong";

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

  if (!check.valid) return <RequestLink expired={Boolean(token)} />;

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

/**
 * No link, or a link that no longer works: ask for a fresh activation email.
 * The reply is the same whether or not an account exists.
 */
function RequestLink({ expired }: { expired: boolean }) {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<{ message: string }>("/auth/request-activation", { body: { identifier } });
    setBusy(false);
    if (res.ok) setMessage(res.data.message);
    else setError(res.error);
  }

  return (
    <>
      <p className="ui-label">First time here</p>
      <h1 className="mt-1 font-serif text-ui-xl">{expired ? "Link not valid" : "Activate your account"}</h1>
      <p className="mt-2 max-w-measure text-ink-muted">
        {expired
          ? INVALID
          : "Your activation link was sent to the email address you registered with. If you cannot find it, enter your matric number or email and we will send a new one."}
      </p>
      {message ? (
        <div className="mt-8 space-y-6">
          <Notice tone="success">{message}</Notice>
          <ButtonLink href="/login/" variant="secondary">
            Go to sign in
          </ButtonLink>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <TextField
            label="Matric number or email"
            name="identifier"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button type="submit" loading={busy} loadingText="Sending…" disabled={!identifier.trim()}>
              Send activation link
            </Button>
            <a href="/login/" className={linkClass}>
              Already active? Sign in
            </a>
          </div>
        </form>
      )}
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
