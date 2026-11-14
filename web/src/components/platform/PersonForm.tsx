"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

type Created = { id: string; tutor_id: string | null; invite: "sent" | "pending" | "failed" };

const inviteText: Record<Created["invite"], string> = {
  sent: "The invite email has been sent.",
  pending: "Today's email allowance is used up, so the invite is waiting. Use Send pending invites on the Users page tomorrow.",
  failed: "The account was created but the invite could not be sent. Use Resend invite on the Users page.",
};

/** Name and email form that creates a tutor or an admin and sends the invite. */
export function PersonForm({ kind }: { kind: "tutor" | "admin" }) {
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<(Created & { name: string }) | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api<Created>(kind === "tutor" ? "/admin/tutors" : "/admin/admins", { body: { full_name: fullName, email } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setCreated({ ...res.data, name: fullName.trim() });
    toast(`${fullName.trim()} added.`);
    setFullName("");
    setEmail("");
  }

  return (
    <div className="max-w-md space-y-6">
      {created ? (
        <Notice tone="success">
          {created.name} has been added{created.tutor_id ? ` with tutor ID ${created.tutor_id}` : ""}. {inviteText[created.invite]}
        </Notice>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <TextField label="Full name" autoComplete="off" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Email" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} error={error || undefined} />
        <Button type="submit" loading={busy} loadingText="Adding…" disabled={!fullName.trim() || !email.trim()}>
          {kind === "tutor" ? "Add tutor and send invite" : "Add admin and send invite"}
        </Button>
      </form>
    </div>
  );
}
