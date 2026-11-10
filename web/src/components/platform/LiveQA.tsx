"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { supabase } from "@/lib/supabase";
import type { People } from "@/lib/types";
import { useMe } from "./RequireRole";
import { Button, Notice } from "./ui";

type Message = { id: string; class_id: string; author_id: string; body: string; is_question: boolean; answered: boolean; created_at: string };

/** Realtime message stream for a class. Students can flag questions; tutors mark them answered. */
export function LiveQA({ base, classId, people, canTeach }: { base: string; classId: string; people: People; canTeach: boolean }) {
  const me = useMe();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [questionsOnly, setQuestionsOnly] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ messages: Message[] }>(`${base}/classes/${classId}/messages`).then((res) => {
      if (!cancelled && res.ok) setMessages(res.data.messages);
    });
    // New and updated messages arrive straight from Supabase Realtime (RLS applies).
    const channel = supabase()
      .channel(`live-${classId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages", filter: `class_id=eq.${classId}` }, (payload) => {
        const row = payload.new as Message;
        if (!row?.id) return;
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === row.id);
          if (i === -1) return [...prev, row];
          const next = [...prev];
          next[i] = row;
          return next;
        });
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase().removeChannel(channel);
    };
  }, [base, classId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const name = (id: string) => (id === me.id ? "You" : (people[id]?.full_name ?? "Programme admin"));
  const roleOf = (id: string) => (id === me.id ? me.role : people[id]?.role);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api(`${base}/classes/${classId}/messages`, { body: { body, is_question: isQuestion } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setBody("");
    setIsQuestion(false);
  }

  async function toggleAnswered(m: Message) {
    const res = await api(`${base}/messages/${m.id}/answered`, { body: { answered: !m.answered } });
    if (!res.ok) setError(res.error);
  }

  const shown = questionsOnly ? messages.filter((m) => m.is_question) : messages;
  const openQuestions = messages.filter((m) => m.is_question && !m.answered).length;

  return (
    <section aria-label="Live Q&A">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {messages.length} message{messages.length === 1 ? "" : "s"}, {openQuestions} open question{openQuestions === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={questionsOnly} onChange={(e) => setQuestionsOnly(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Questions only
        </label>
      </div>

      <ol ref={listRef} aria-live="polite" className="mt-3 max-h-[28rem] overflow-y-auto border-y border-line">
        {shown.length === 0 ? <li className="py-6 text-ink-muted">No messages yet.</li> : null}
        {shown.map((m) => (
          <li key={m.id} className={cx("border-b border-line py-3 last:border-b-0", m.is_question && !m.answered && "bg-accent-soft/40")}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm">
                <span className="font-semibold">{name(m.author_id)}</span>
                {roleOf(m.author_id) === "tutor" ? <span className="text-ink-muted"> · Tutor</span> : null}
                <span className="text-ink-muted"> · {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              </p>
              <span className="flex items-center gap-3 text-sm">
                {m.is_question ? (
                  <span className={m.answered ? "text-sage-strong" : "font-semibold text-accent-strong"}>{m.answered ? "Answered" : "Question"}</span>
                ) : null}
                {canTeach && m.is_question ? (
                  <Button variant="quiet" onClick={() => toggleAnswered(m)}>
                    {m.answered ? "Mark unanswered" : "Mark answered"}
                  </Button>
                ) : null}
              </span>
            </div>
            <p className="mt-1 break-words whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={send} className="mt-4 space-y-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        <label className="block">
          <span className="sr-only">Message</span>
          <textarea
            rows={2}
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message"
            className="block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={busy || !body.trim()}>
            {busy ? "Sending…" : "Send"}
          </Button>
          {!canTeach ? (
            <label className="flex items-center gap-2 text-[0.9375rem]">
              <input type="checkbox" checked={isQuestion} onChange={(e) => setIsQuestion(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              This is a question
            </label>
          ) : null}
        </div>
      </form>
    </section>
  );
}
