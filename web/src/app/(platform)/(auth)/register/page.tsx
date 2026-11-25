"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { site } from "@/lib/site";
import { TIMETABLE_TEXT } from "@/lib/timetable";

type Course = { id: string; title: string; outline: string[] };
type Registered = { full_name: string; email: string; matric_no: string; enrolled: boolean };
type Form = { full_name: string; email: string; phone: string; sex: string; matric_no: string; department: string; level: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanMatric = (m: string) => m.trim().toUpperCase().replace(/\s+/g, "");
const cleanPhone = (p: string) => p.trim().replace(/[\s().-]/g, "");

const LEVELS = ["100", "200", "300", "400", "500"];
const blank: Form = { full_name: "", email: "", phone: "", sex: "", matric_no: "", department: "", level: "" };

/** Field errors, checked in the browser first. The API checks everything again. */
function check(f: Form) {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!f.full_name.trim()) errors.full_name = "Enter your full name.";
  if (!f.email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL.test(f.email.trim())) errors.email = "Enter a valid email address, like name@example.com.";
  const phone = cleanPhone(f.phone);
  if (!phone) errors.phone = "Enter your phone number.";
  else if (!/^\+?[0-9]{7,15}$/.test(phone)) errors.phone = "Enter a valid phone number, like 0803 123 4567.";
  if (!f.sex) errors.sex = "Choose your sex.";
  const m = cleanMatric(f.matric_no);
  if (!m) errors.matric_no = "Enter your matric number, or your registration number if you are in 100 Level.";
  else if (m.length < 6) errors.matric_no = "This number must be at least 6 characters.";
  else if (!/^[A-Z0-9/.-]+$/.test(m)) errors.matric_no = "Use only letters, numbers and the characters / - .";
  if (!f.department.trim()) errors.department = "Enter your department.";
  else if (f.department.trim().length > 120) errors.department = "Department must be 120 characters or fewer.";
  if (!f.level) errors.level = "Choose your level.";
  return errors;
}

export default function RegisterPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Form>(blank);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Registered | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    api<{ programmes: Course[] }>("/auth/programmes").then((res) => (res.ok ? setCourses(res.data.programmes) : setLoadError(res.error)));
  }, []);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = check(form);
    setErrors(found);
    setError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await api<Registered>("/auth/register", { body: { ...form, level: Number(form.level) } });
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
              <dt className="text-ui-xs text-ink-muted">Email (or your matric or registration number)</dt>
              <dd className="font-semibold break-all">{done.email}</dd>
            </div>
            <div>
              <dt className="text-ui-xs text-ink-muted">Password: your matric or registration number</dt>
              <dd className="font-semibold break-all">{done.matric_no}</dd>
            </div>
          </dl>
        </div>
        {done.enrolled ? null : (
          <Notice className="mt-6">Your account is ready, but we could not add you to every course. The programme team will add you.</Notice>
        )}
        <p className="mt-6 text-ink-muted">Keep these details. We do not send emails, so this is the only place they are shown.</p>
        <p className="mt-3 text-ink-muted">{TIMETABLE_TEXT} After you log in, your timetable shows every lecture.</p>
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
      <p className="mt-2 text-ink-muted">
        Fill in your details. You can log in as soon as you finish, using your email and your matric or registration number as the password.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <TextField label="Full name" name="full_name" autoComplete="name" required value={form.full_name} error={errors.full_name} onChange={set("full_name")} />
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" required value={form.email} error={errors.email} onChange={set("email")} />
        <TextField
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0803 123 4567"
          required
          value={form.phone}
          error={errors.phone}
          onChange={set("phone")}
        />
        <fieldset aria-describedby={errors.sex ? "sex-error" : undefined}>
          <legend className="text-ui-sm font-semibold">Sex</legend>
          <div className="mt-3 flex flex-wrap gap-6">
            {[
              ["female", "Female"],
              ["male", "Male"],
            ].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-3 text-ui-sm">
                <input
                  type="radio"
                  name="sex"
                  value={value}
                  checked={form.sex === value}
                  onChange={set("sex")}
                  className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>
          {errors.sex ? (
            <p id="sex-error" className="mt-2 text-ui-xs font-semibold text-accent-strong">
              {errors.sex}
            </p>
          ) : null}
        </fieldset>
        <TextField
          label="Matric or registration number"
          name="matric_no"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          hint="Use your matric number. If you are in 100 Level and have none yet, use your registration number. This will also be your password."
          required
          value={form.matric_no}
          error={errors.matric_no}
          onChange={set("matric_no")}
        />
        <TextField
          label="Department"
          name="department"
          autoComplete="off"
          hint="For example, Computer Science."
          required
          value={form.department}
          error={errors.department}
          onChange={set("department")}
        />
        <SelectField label="Level" name="level" required value={form.level} error={errors.level} onChange={set("level")}>
          <option value="">Choose your level</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l} Level
            </option>
          ))}
        </SelectField>
        <section aria-labelledby="courses-title">
          <h2 id="courses-title" className="text-ui-sm font-semibold">
            {courses?.length === 1 ? "Your course" : "Your courses"}
          </h2>
          {loadError ? (
            <Notice tone="error" className="mt-3">
              {loadError}
            </Notice>
          ) : !courses ? (
            <p className="mt-3 text-ui-sm text-ink-muted">Loading courses…</p>
          ) : (
            <div className="mt-2 border-l-2 border-sage bg-paper-2/60 px-4 py-3">
              <p className="text-ui-xs text-ink-muted">
                {courses.length === 1 ? "Every participant takes this course" : "Every participant takes all of these courses"}. You are added when you register.
              </p>
              {courses.map((c) => (
                <div key={c.id} className="mt-3">
                  <p className="font-semibold">{c.title}</p>
                  {c.outline.length ? (
                    <>
                      <p className="mt-2 text-ui-xs text-ink-muted">Course outline</p>
                      <ol className="mt-1 list-decimal space-y-1 pl-5 text-ui-sm">
                        {c.outline.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
        <Button type="submit" loading={busy} loadingText="Registering…">
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
