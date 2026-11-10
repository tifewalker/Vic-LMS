"use client";

import { useState } from "react";
import { Button } from "./ui";

/** A small action that asks "Are you sure?" inline before running. */
export function ConfirmButton({
  label,
  confirmLabel,
  question,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  question: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <Button variant="quiet" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2" role="group" aria-label={question}>
      <span className="text-sm text-ink-muted">{question}</span>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
          setAsking(false);
        }}
      >
        {busy ? "Working…" : confirmLabel}
      </Button>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </span>
  );
}
