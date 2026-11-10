"use client";

import { useId, useState } from "react";
import { cx } from "@/lib/cx";
import { passwordRules } from "@/lib/password";

/** Plain controls for the platform screens, on the CLAUDE.md palette. */

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "sm";

/** Button styles, also used for links that look like buttons. Square-ish corners, no icons. */
export function buttonClass(variant: Variant = "primary", className?: string, size: Size = "md") {
  return cx(
    "inline-flex cursor-pointer items-center justify-center rounded-sm font-semibold transition-colors",
    // Quiet buttons look like links: no padding. Otherwise padding by size.
    variant === "quiet" ? "text-[0.9375rem]" : size === "md" ? "px-4 py-2.5 text-[0.9375rem]" : "px-3 py-1.5 text-sm",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variant === "primary" && "bg-accent text-paper hover:bg-accent-strong",
    variant === "secondary" && "border border-line bg-paper text-ink hover:border-ink-muted",
    variant === "quiet" && "text-accent-strong underline decoration-accent/45 underline-offset-[0.22em] hover:decoration-accent-strong",
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" {...rest} className={buttonClass(variant, className, size)} />;
}

/** Shared look for inputs and selects outside Field. */
export const inputClass = "block w-full rounded-sm border border-line bg-white px-3 py-2 text-base text-ink";

export function Field({
  label,
  hint,
  error,
  className,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.9375rem] font-semibold">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-sm text-ink-muted">{hint}</p> : null}
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink-muted/70 focus:border-ink-muted"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-accent-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-sm border-l-2 px-4 py-3 text-[0.9375rem]",
        tone === "error" && "border-accent bg-accent-soft/60",
        tone === "success" && "border-sage bg-sage-soft",
        tone === "info" && "border-line bg-paper-2",
      )}
    >
      {children}
    </div>
  );
}

export function PageTitle({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="mt-1 text-[clamp(1.75rem,4vw,2.5rem)]">{title}</h1>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

/** New password + confirm, with live strength rules. */
export function PasswordFields({ onChange }: { onChange: (value: string | null) => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;

  const update = (p: string, c: string) => {
    setPassword(p);
    setConfirm(c);
    onChange(passwordRules.every((r) => r.test(p)) && p === c ? p : null);
  };

  return (
    <div className="space-y-4">
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => update(e.target.value, confirm)}
      />
      <ul className="space-y-1 text-sm" aria-label="Password rules">
        {passwordRules.map((r) => {
          const met = r.test(password);
          return (
            <li key={r.label} className={met ? "text-sage-strong" : "text-ink-muted"}>
              <span aria-hidden="true">{met ? "✓ " : "· "}</span>
              {r.label}
              <span className="sr-only">{met ? " (done)" : " (not yet)"}</span>
            </li>
          );
        })}
      </ul>
      <Field
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => update(password, e.target.value)}
        error={mismatch ? "The passwords do not match." : undefined}
      />
    </div>
  );
}
