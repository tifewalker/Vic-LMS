"use client";

import { useState } from "react";
import { passwordRules } from "@/lib/password";
import { TextField } from "./Field";

/** New password and confirm, with the strength rules ticking off as you type. */
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
    <div className="space-y-6">
      <div>
        <TextField label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => update(e.target.value, confirm)} />
        <ul className="mt-3 space-y-1 text-ui-xs" aria-label="Password rules">
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
      </div>
      <TextField
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
