"use client";

import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useNavData } from "@/components/ui/NavData";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

export type HideKind = "live_messages" | "threads" | "replies";

const what: Record<HideKind, string> = { live_messages: "message", threads: "thread", replies: "reply" };

/**
 * Admin moderation actions with confirmation and toasts. Each returns true when it worked,
 * so the caller can reload. Students and tutors never see these controls.
 */
export function useModeration() {
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh } = useNavData();

  const done = (res: { ok: boolean; error?: string }, message: string) => {
    if (res.ok) {
      toast(message);
      refresh();
    } else toast(res.error ?? "Something went wrong.", "error");
    return res.ok;
  };

  return {
    async hide(kind: HideKind, id: string, hidden: boolean) {
      if (hidden && !(await confirm({ title: `Hide this ${what[kind]}?`, body: "Students and tutors will no longer see it. Admins still can, and you can show it again later.", confirmLabel: "Hide" }))) return false;
      const res = await api(`/admin/moderation/${kind}/${id}/hide`, { body: { hidden } });
      return done(res, hidden ? "Hidden from students and tutors." : "Visible again.");
    },
    async mute(userId: string, name: string, muted: boolean) {
      if (muted && !(await confirm({ title: `Mute ${name}?`, body: "They can still read everything, but cannot post in live Q&A or discussions until you unmute them.", confirmLabel: "Mute" }))) return false;
      const res = await api(`/admin/users/${userId}/mute`, { body: { muted } });
      return done(res, muted ? `${name} is muted.` : `${name} can post again.`);
    },
    async answered(kind: "live_messages" | "threads", id: string, answered: boolean) {
      const res = await api(`/admin/moderation/${kind}/${id}/answered`, { body: { answered } });
      return done(res, answered ? "Marked answered." : "Marked unanswered.");
    },
    async pin(threadId: string, pinned: boolean) {
      const res = await api(`/admin/moderation/threads/${threadId}/pin`, { body: { pinned } });
      return done(res, pinned ? "Pinned." : "Unpinned.");
    },
    async reply(kind: "live_messages" | "threads", id: string, body: string) {
      const path = kind === "threads" ? `/admin/moderation/threads/${id}/replies` : `/admin/moderation/live_messages/${id}/reply`;
      const res = await api(path, { body: { body } });
      return done(res, "Reply posted as Admin.");
    },
  };
}
