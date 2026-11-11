"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PasswordFields } from "@/components/ui/PasswordFields";
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
        <p className="ui-label">Account</p>
        <h1 className="mt-1 font-serif text-ui-xl">Link not valid</h1>
        <p className="mt-3 max-w-measure">This reset link is no longer valid. Request a new one.</p>
        <ButtonLink href="/forgot-password/" variant="secondary" className="mt-8">
          Request a new link
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <p className="ui-label">Account</p>
      <h1 className="mt-1 font-serif text-ui-xl">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <PasswordFields onChange={setPassword} />
        <Button type="submit" loading={busy} loadingText="Saving…" disabled={!password}>
          Save new password
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
