"use client";

import { useState } from "react";
import { Button, Field, Notice } from "@/components/platform/ui";
import { api } from "@/lib/api";

const linkClass = "text-[0.9375rem] text-accent-strong underline decoration-accent/45 underline-offset-[0.22em]";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<{ message: string }>("/auth/forgot-password", { body: { email } });
    setBusy(false);
    if (res.ok) setMessage(res.data.message);
    else setError(res.error);
  }

  return (
    <>
      <h1 className="text-[2rem]">Forgot password</h1>
      <p className="mt-2 text-ink-muted">Enter the email address on your account and we will send you a reset link.</p>
      {message ? (
        <div className="mt-8 space-y-6">
          <Notice tone="success">{message}</Notice>
          <a href="/login/" className={linkClass}>
            Back to sign in
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button type="submit" disabled={busy || !email}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
            <a href="/login/" className={linkClass}>
              Back to sign in
            </a>
          </div>
        </form>
      )}
    </>
  );
}
