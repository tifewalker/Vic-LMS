"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Notice, PasswordFields } from "@/components/platform/ui";
import { api, homeFor, type Me } from "@/lib/api";
import { supabase } from "@/lib/supabase";

function Reset() {
  const tokenHash = useSearchParams().get("token_hash") ?? "";
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(!tokenHash);
  const [busy, setBusy] = useState(false);

  // The link is only spent when the form is submitted, so email scanners that open it do not use it up.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError("");
    const { error: otpErr } = await supabase().auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (otpErr) {
      setInvalid(true);
      setBusy(false);
      return;
    }
    const { error: pwErr } = await supabase().auth.updateUser({ password });
    if (pwErr) {
      setError("Could not save your new password. Please try again.");
      setBusy(false);
      return;
    }
    const me = await api<{ profile: Me }>("/me");
    window.location.assign(me.ok ? homeFor(me.data.profile.role) : "/login/");
  }

  if (invalid) {
    return (
      <>
        <h1 className="text-[2rem]">Link not valid</h1>
        <p className="mt-4">This reset link is no longer valid. Request a new one.</p>
        <p className="mt-6">
          <a href="/forgot-password/" className="text-accent-strong underline decoration-accent/45 underline-offset-[0.22em]">
            Request a new link
          </a>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[2rem]">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <PasswordFields onChange={setPassword} />
        <Button type="submit" disabled={busy || !password}>
          {busy ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}
