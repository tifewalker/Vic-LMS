"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { useModerationSignal } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";
import type { People } from "@/lib/types";
import { useMe } from "./RequireRole";
import { useModeration } from "./useModeration";

type Message = {
  id: string;
  class_id: string;
  author_id: string;
  body: string;
  is_question: boolean;
  answered: boolean;
  created_at: string;
  hidden?: boolean;
};
type Payload = { messages: Message[]; muted: boolean; muted_ids?: string[] };

export const MUTED_NOTICE = "Posting is paused on your account for now. You can still read everything. Contact the programme admin if you think this is a mistake.";

/**
 * Realtime message stream for a class: name, tutor tag and time on each message; questions
 * marked in clay, answered ones muted. On phones the composer stays pinned to the bottom.
 * Admins see hidden messages greyed out, with moderation actions on each message.
 */
export function LiveQA({ base, classId, people, canTeach }: { base: string; classId: string; people: People; canTeach: boolean }) {
  const me = useMe();
  const toast = useToast();
  const mod = useModeration();
  const isAdmin = me.role === "admin" || me.role === "super_admin";
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [muted, setMuted] = useState(false);
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [questionsOnly, setQuestionsOnly] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    api<Payload>(`${base}/classes/${classId}/messages`).then((res) => {
      if (!res.ok) return setMessages((m) => m ?? []);
      setMessages(res.data.messages);
      setMuted(res.data.muted);
      setMutedIds(res.data.muted_ids ?? []);
    });
  }, [base, classId]);

  useEffect(() => {
    load();
    // New and updated messages arrive straight from Supabase Realtime (RLS applies).
    const channel = supabase()
      .channel(`live-${classId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages", filter: `class_id=eq.${classId}` }, (payload) => {
        const row = payload.new as Message;
        if (!row?.id) return;
        setMessages((prev) => {
          const list = prev ?? [];
          if (row.hidden && !isAdmin) return list.filter((m) => m.id !== row.id);
          const i = list.findIndex((m) => m.id === row.id);
          if (i === -1) return [...list, row];
          const next = [...list];
          next[i] = row;
          return next;
        });
      })
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [classId, isAdmin, load]);

  // Hides, unhides and mutes: reload, because a hidden row's update never reaches students.
  useModerationSignal([`mod:class:${classId}`, `mod:user:${me.id}`], load);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

  const isAdminAuthor = (id: string) => (id === me.id ? isAdmin : !people[id]);
  const name = (id: string) => (id === me.id ? "You" : (people[id]?.full_name ?? "Programme admin"));
  const roleTag = (id: string) => (isAdminAuthor(id) ? "admin" : (id === me.id ? me.role !== "student" : people[id]?.role === "tutor") ? "tutor" : null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (replyTo && isAdmin) {
      const okay = await mod.reply("live_messages", replyTo.id, body);
      setBusy(false);
      if (!okay) return;
    } else {
      const res = await api(`${base}/classes/${classId}/messages`, { body: { body, is_question: isQuestion } });
      setBusy(false);
      if (!res.ok) {
        if (res.status === 403) load();
        return toast(res.error, "error");
      }
    }
    setBody("");
    setIsQuestion(false);
    setReplyTo(null);
  }
  async function toggleAnswered(m: Message) {
    if (isAdmin) {
      if (await mod.answered("live_messages", m.id, !m.answered)) load();
      return;
    }
    const res = await api(`${base}/messages/${m.id}/answered`, { body: { answered: !m.answered } });
    if (!res.ok) toast(res.error, "error");
  }
  async function toggleHidden(m: Message) {
    if (await mod.hide("live_messages", m.id, !m.hidden)) load();
  }
  async function toggleMute(m: Message) {
    if (await mod.mute(m.author_id, name(m.author_id), !mutedIds.includes(m.author_id))) load();
  }
  function startReply(m: Message) {
    setReplyTo(m);
    textRef.current?.focus();
  }

  const shown = (messages ?? []).filter((m) => !questionsOnly || m.is_question);
  const open = (messages ?? []).filter((m) => m.is_question && !m.answered && !m.hidden).length;

  return (
    <section aria-label="Live Q&A">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ui-xs text-ink-muted">
          {messages ? `${messages.length} message${messages.length === 1 ? "" : "s"} · ${open} open question${open === 1 ? "" : "s"}` : "Loading messages"}
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-ui-sm">
          <input type="checkbox" checked={questionsOnly} onChange={(e) => setQuestionsOnly(e.target.checked)} className="size-4 cursor-pointer accent-[var(--accent)]" />
          Questions only
        </label>
      </div>

      <ol ref={listRef} aria-live="polite" className="mt-3 max-h-[32rem] overflow-y-auto border-y border-line">
        {messages === null ? (
          <li className="py-4">
            <SkeletonLines lines={4} />
          </li>
        ) : null}
        {messages && shown.length === 0 ? (
          <li className="py-10">
            <p className="font-serif text-ui-lg">{questionsOnly ? "No questions yet." : "No messages yet."}</p>
            <p className="mt-1 text-ui-sm text-ink-muted">{canTeach ? "Questions from students appear here as they are asked." : "Ask a question or say hello. Everyone in the class sees it."}</p>
          </li>
        ) : null}
        {shown.map((m) => {
          const tag = roleTag(m.author_id);
          const authorMuted = mutedIds.includes(m.author_id);
          return (
            <li
              key={m.id}
              className={cx(
                "border-b border-line py-4 last:border-b-0",
                m.is_question && !m.answered && !m.hidden && "border-l-2 border-l-accent pl-4",
                (m.answered || m.hidden) && "text-ink-muted",
                m.hidden && "bg-paper-2/60 pl-4",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={cx("text-ui-sm font-semibold", m.answered || m.hidden ? "text-ink-muted" : "text-ink")}>{name(m.author_id)}</span>
                {tag ? <StatusLabel status={tag} /> : null}
                {isAdmin && authorMuted ? <StatusLabel status="muted" /> : null}
                <span className="text-ui-xs text-ink-muted">{new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                {m.is_question ? <StatusLabel status={m.answered ? "answered" : "question"} /> : null}
                {m.hidden ? <StatusLabel status="hidden" /> : null}
                {canTeach && m.is_question && !isAdmin ? (
                  <Button variant="quiet" size="sm" className="ml-auto" onClick={() => toggleAnswered(m)}>
                    {m.answered ? "Mark unanswered" : "Mark answered"}
                  </Button>
                ) : null}
              </div>
              <p className={cx("mt-1 max-w-measure break-words whitespace-pre-wrap", m.hidden && "line-through decoration-ink-muted/40")}>{m.body}</p>
              {isAdmin ? (
                <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
                  {m.is_question ? (
                    <Button variant="quiet" size="sm" onClick={() => toggleAnswered(m)}>
                      {m.answered ? "Mark unanswered" : "Mark answered"}
                    </Button>
                  ) : null}
                  <Button variant="quiet" size="sm" onClick={() => toggleHidden(m)}>
                    {m.hidden ? "Unhide" : "Hide"}
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => startReply(m)}>
                    Reply
                  </Button>
                  {!isAdminAuthor(m.author_id) ? (
                    <Button variant="quiet" size="sm" onClick={() => toggleMute(m)}>
                      {authorMuted ? "Unmute author" : "Mute author"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {muted ? (
        <Notice tone="info" className="mt-4">
          {MUTED_NOTICE}
        </Notice>
      ) : (
        <form onSubmit={send} className="mt-4 space-y-3 border-line bg-paper max-md:sticky max-md:bottom-0 max-md:-mx-4 max-md:border-t max-md:px-4 max-md:py-3">
          {replyTo ? (
            <p className="flex flex-wrap items-center gap-x-3 text-ui-xs text-ink-muted">
              <span>
                Replying as Admin to {name(replyTo.author_id)}: “{replyTo.body.slice(0, 60)}
                {replyTo.body.length > 60 ? "…" : ""}”
              </span>
              <Button variant="quiet" size="sm" onClick={() => setReplyTo(null)}>
                Cancel reply
              </Button>
            </p>
          ) : null}
          <label className="block">
            <span className="sr-only">Message</span>
            <textarea ref={textRef} rows={2} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Write a message" className={cx(controlClass, "py-2.5")} />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" loading={busy} loadingText="Sending…" disabled={!body.trim()}>
              Send
            </Button>
            {!canTeach ? (
              <label className="flex cursor-pointer items-center gap-2 text-ui-sm">
                <input type="checkbox" checked={isQuestion} onChange={(e) => setIsQuestion(e.target.checked)} className="size-4 cursor-pointer accent-[var(--accent)]" />
                This is a question
              </label>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
