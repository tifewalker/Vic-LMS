"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { site } from "@/lib/site";

type Programme = { id: string; title: string };
type Registered = { full_name: string; email: string; matric_no: string; enrolled: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanMatric = (m: string) => m.trim().toUpperCase().replace(/\s+/g, "");

/** Field errors, checked in the browser first. The API checks everything again. */
function check(name: string, email: string, matric: string, picked: string[]) {
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.full_name = "Enter your full name.";
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL.test(email.trim())) errors.email = "Enter a valid email address, like name@example.com.";
  const m = cleanMatric(matric);
  if (!m) errors.matric_no = "Enter your matric number.";
  else if (m.length < 6) errors.matric_no = "Matric number must be at least 6 characters.";
  else if (!/^[A-Z0-9/.-]+$/.test(m)) errors.matric_no = "Use only letters, numbers and the characters / - .";
  if (!picked.length) errors.programmes = "Choose at least one programme.";
  return errors;
}

export default function RegisterPage() {
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [matric, setMatric] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Registered | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ programmes: Programme[] }>("/auth/programmes").then((res) => (res.ok ? setProgrammes(res.data.programmes) : setLoadError(res.error)));
  }, []);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = check(name, email, matric, picked);
    setErrors(found);
    setError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await api<Registered>("/auth/register", { body: { full_name: name, email, matric_no: matric, programme_ids: picked } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(res.data);
    window.scrollTo({ top: 0 });
  }

  if (done) {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="outline-none">
        <p className="ui-label">Training platform</p>
        <h1 className="mt-1 font-serif text-ui-xl">You are registered</h1>
        <div className="mt-6 border-y border-l-2 border-line border-l-sage bg-paper-2/60 px-5 py-6">
          <p className="font-semibold">Log in with:</p>
          <dl className="mt-3 space-y-3">
            <div>
              <dt className="text-ui-xs text-ink-muted">Email (or your matric number)</dt>
              <dd className="font-semibold break-all">{done.email}</dd>
            </div>
            <div>
              <dt className="text-ui-xs text-ink-muted">Password: your matric number</dt>
              <dd className="font-semibold break-all">{done.matric_no}</dd>
            </div>
          </dl>
        </div>
        {done.enrolled ? null : (
          <Notice className="mt-6">Your account is ready, but we could not add you to every programme you chose. The programme team will add you.</Notice>
        )}
        <p className="mt-6 text-ink-muted">Keep these details. We do not send emails, so this is the only place they are shown.</p>
        <ButtonLink href={site.platform.login} className="mt-8">
          Go to log in
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <p className="ui-label">Training platform</p>
      <h1 className="mt-1 font-serif text-ui-xl">Student registration</h1>
      <p className="mt-2 text-ink-muted">Fill in your details. You can log in as soon as you finish, using your email and your matric number as the password.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <TextField label="Full name" name="full_name" autoComplete="name" required value={name} error={errors.full_name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} error={errors.email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Matric number"
          name="matric_no"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          hint="This will also be your password."
          required
          value={matric}
          error={errors.matric_no}
          onChange={(e) => setMatric(e.target.value)}
        />
        <fieldset aria-describedby={errors.programmes ? "programmes-error" : undefined}>
          <legend className="text-ui-sm font-semibold">Programmes</legend>
          <p className="mt-1 text-ui-xs text-ink-muted">Tick every programme you are taking.</p>
          {loadError ? (
            <Notice tone="error" className="mt-3">
              {loadError}
            </Notice>
          ) : !programmes ? (
            <p className="mt-3 text-ui-sm text-ink-muted">Loading programmes…</p>
          ) : (
            <div className="mt-3 space-y-3">
              {programmes.map((p) => (
                <CheckboxField key={p.id} label={p.title} checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
              ))}
            </div>
          )}
          {errors.programmes ? (
            <p id="programmes-error" className="mt-2 text-ui-xs font-semibold text-accent-strong">
              {errors.programmes}
            </p>
          ) : null}
        </fieldset>
        <Button type="submit" loading={busy} loadingText="Registering…" disabled={!programmes}>
          Register
        </Button>
      </form>
      <p className="mt-8 border-t border-line pt-6 text-ui-sm text-ink-muted">
        Already registered?{" "}
        <Link href={site.platform.login} className="font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
          Log in
        </Link>
      </p>
    </>
  );
}
