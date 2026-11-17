"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";

type Created = { id: string; tutor_id: string | null };

/** Creates a tutor or an admin with a password the admin chooses. No email is sent. */
export function PersonForm({ kind }: { kind: "tutor" | "admin" }) {
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<(Created & { name: string; email: string }) | null>(null);
  const problem = password ? passwordProblem(password) : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordProblem(password)) return;
    setBusy(true);
    setError("");
    const res = await api<Created>(kind === "tutor" ? "/admin/tutors" : "/admin/admins", { body: { full_name: fullName, email, password } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setCreated({ ...res.data, name: fullName.trim(), email: email.trim().toLowerCase() });
    toast(`${fullName.trim()} added.`);
    setFullName("");
    setEmail("");
    setPassword("");
  }

  return (
    <div className="max-w-md space-y-6">
      {created ? (
        <Notice tone="success">
          {created.name} has been added and can log in now with {created.tutor_id ? `tutor ID ${created.tutor_id} or ` : ""}
          {created.email} and the password you set. Share the password with them yourself.
        </Notice>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <TextField label="Full name" autoComplete="off" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Email" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} error={error || undefined} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={PASSWORD_HINT}
          error={problem || undefined}
        />
        <Button type="submit" loading={busy} loadingText="Adding…" disabled={!fullName.trim() || !email.trim() || !password || Boolean(problem)}>
          {kind === "tutor" ? "Add tutor" : "Add admin"}
        </Button>
      </form>
    </div>
  );
}
