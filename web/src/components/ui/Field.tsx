"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";

/**
 * Form fields: label above, optional helper text, inline error in clay-strong.
 * Inputs share one height (44px) and use the global 2px clay focus ring.
 */

export const controlClass =
  "block w-full rounded-sm border border-line bg-white px-3 text-ui-md text-ink placeholder:text-ink-muted/80 hover:border-ink-muted/60 disabled:bg-paper-2 aria-[invalid=true]:border-accent-strong";

type ShellProps = { label: string; hint?: string; error?: string; className?: string; optional?: boolean };

function Shell({ id, label, hint, error, optional, className, children }: ShellProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-ui-sm font-semibold text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-ui-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-ui-xs font-semibold text-accent-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: ShellProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(controlClass, "h-11")}
      />
    </Shell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  className,
  rows = 4,
  ...input
}: ShellProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea
        id={id}
        rows={rows}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(controlClass, "py-2.5 leading-relaxed")}
      />
    </Shell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...select
}: ShellProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <select
        id={id}
        {...select}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(controlClass, "h-11 cursor-pointer pr-8")}
      >
        {children}
      </select>
    </Shell>
  );
}

/** Checkbox with its label to the right. */
export function CheckboxField({ label, hint, className, ...input }: { label: React.ReactNode; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cx("flex items-start gap-3", className)}>
      <input id={id} type="checkbox" {...input} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--accent)]" />
      <label htmlFor={id} className="cursor-pointer text-ui-sm">
        {label}
        {hint ? <span className="block text-ui-xs text-ink-muted">{hint}</span> : null}
      </label>
    </div>
  );
}

/** File input styled to sit with the other fields. */
export function FileField({ label, hint, optional, className, ...input }: ShellProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} optional={optional} className={className}>
      <input
        id={id}
        type="file"
        {...input}
        aria-describedby={describedBy(id, hint)}
        className="block w-full text-ui-sm text-ink file:mr-4 file:h-11 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-paper file:px-4 file:font-semibold file:text-ink hover:file:bg-paper-2"
      />
    </Shell>
  );
}

/** Radio group in a fieldset with a legend. */
export function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-ui-sm font-semibold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 text-ui-sm">
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="size-4 cursor-pointer accent-[var(--accent)]" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
