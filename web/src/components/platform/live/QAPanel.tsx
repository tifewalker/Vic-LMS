"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { People } from "@/lib/types";
import { useMe } from "../RequireRole";
import { useModeration } from "../useModeration";
import type { LiveMessage, useLiveMessages } from "./data";

export const MUTED_NOTICE = "Posting is paused on your account for now. You can still read everything. Contact the programme admin if you think this is a mistake.";
export const MAX_MESSAGE = 500;

type Messages = ReturnType<typeof useLiveMessages>;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Small text actions with a 44px tap target on touch screens. */
function Action({ children, onClick, pressed }: { children: React.ReactNode; onClick: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="inline-flex min-h-11 cursor-pointer items-center px-1.5 text-ui-xs font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong lg:min-h-8"
    >
      {children}
    </button>
  );
}

/**
 * Live Q&A for a class, newest at the bottom. It follows new messages only while the reader is
 * already at the bottom; otherwise a "New messages" pill appears. Questions are marked in clay,
 * answered ones muted. Tutors and admins can mark answered, pin to the top of everyone's Q&A,
 * and reply; admins can also hide and mute. The composer stays at the bottom of the panel.
 */
export function QAPanel({ base, classId, people, canTeach, data, onComposerFocus, compact = false, dense = false }: { base: string; classId: string; people: People; canTeach: boolean; data: Messages; onComposerFocus?: (focused: boolean) => void; compact?: boolean; dense?: boolean }) {
  const me = useMe();
  const toast = useToast();
  const mod = useModeration();
  const isAdmin = me.role === "admin" || me.role === "super_admin";
  const { messages, muted, mutedIds, reload } = data;

  const [questionsOnly, setQuestionsOnly] = useState(false);
  const [body, setBody] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [replyTo, setReplyTo] = useState<LiveMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [pill, setPill] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const seen = useRef<{ count: number; last: string | null; filter: boolean } | null>(null);
  const forceBottom = useRef(false);

  const all = messages ?? [];
  const shown = all.filter((m) => !questionsOnly || m.is_question);
  // One pin per class (pinning replaces the previous one); older data may hold more, so show the newest.
  const pinned = all.filter((m) => m.pinned && !m.hidden).sort((a, b) => (b.pinned_at ?? "").localeCompare(a.pinned_at ?? "")).slice(0, 1);
  const openQuestions = all.filter((m) => m.is_question && !m.answered && !m.hidden).length;
  const byId = new Map(all.map((m) => [m.id, m]));

  const isAdminAuthor = (id: string) => (id === me.id ? isAdmin : !people[id]);
  const name = (id: string) => (id === me.id ? "You" : (people[id]?.full_name ?? "Programme admin"));
  const roleTag = (id: string) => (isAdminAuthor(id) ? "admin" : (id === me.id ? me.role === "tutor" : people[id]?.role === "tutor") ? "tutor" : null);

  // Follow new messages only when the reader is at the bottom; otherwise offer the pill.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || messages === null) return;
    const list = messages.filter((m) => !questionsOnly || m.is_question);
    const newest = list.at(-1) ?? null;
    const prev = seen.current;
    const now = { count: list.length, last: newest?.id ?? null, filter: questionsOnly };
    seen.current = now;
    const first = prev === null || prev.filter !== questionsOnly;
    const grew = prev !== null && now.last !== prev.last && now.count >= prev.count;
    if (first || forceBottom.current || (grew && atBottom.current)) {
      el.scrollTop = el.scrollHeight;
      atBottom.current = true;
      forceBottom.current = false;
      setPill(false);
    } else if (grew && newest?.author_id !== me.id) {
      setPill(true);
    }
  }, [messages, questionsOnly, me.id]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (atBottom.current) setPill(false);
  }
  function jumpToNewest() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setPill(false);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await api(`${base}/classes/${classId}/messages`, {
      body: { body, is_question: canTeach ? false : isQuestion, reply_to: replyTo?.id ?? null },
    });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 403) reload();
      return toast(res.error, "error");
    }
    setBody("");
    setIsQuestion(false);
    setReplyTo(null);
    forceBottom.current = true;
    // In light mode there is no socket, so fetch the new message now.
    reload();
  }

  async function toggleAnswered(m: LiveMessage) {
    if (isAdmin) {
      if (await mod.answered("live_messages", m.id, !m.answered)) reload();
      return;
    }
    const res = await api(`${base}/messages/${m.id}/answered`, { body: { answered: !m.answered } });
    if (!res.ok) return toast(res.error, "error");
    reload();
  }
  async function togglePinned(m: LiveMessage) {
    const res = await api(`${base}/messages/${m.id}/pin`, { body: { pinned: !m.pinned } });
    if (!res.ok) return toast(res.error, "error");
    toast(m.pinned ? "Unpinned." : "Pinned to the top of everyone's Q&A.");
    reload();
  }
  async function toggleHidden(m: LiveMessage) {
    if (await mod.hide("live_messages", m.id, !m.hidden)) reload();
  }
  async function toggleMute(m: LiveMessage) {
    if (await mod.mute(m.author_id, name(m.author_id), !mutedIds.includes(m.author_id))) reload();
  }
  function startReply(m: LiveMessage) {
    setReplyTo(m);
    textRef.current?.focus();
  }

  // A render function (not a nested component), so items keep their DOM between renders.
  function renderItem(m: LiveMessage, inPinned = false) {
    const tag = roleTag(m.author_id);
    const parent = m.reply_to ? byId.get(m.reply_to) : undefined;
    const quiet = m.answered || m.hidden;
    return (
      <li
        key={m.id}
        className={cx(
          "border-b border-line px-4 py-3 last:border-b-0",
          m.is_question && !m.answered && !m.hidden && "border-l-2 border-l-accent",
          quiet && "text-ink-muted",
          m.hidden && "bg-paper-2/60",
        )}
      >
        {inPinned ? <p className="mb-1 text-ui-xs font-semibold text-accent-strong">Pinned by tutor</p> : null}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cx("text-ui-sm font-semibold", quiet ? "text-ink-muted" : "text-ink")}>{name(m.author_id)}</span>
          {tag ? <StatusLabel status={tag} /> : null}
          <time dateTime={m.created_at} className="text-ui-xs text-ink-muted tabular-nums">
            {timeOf(m.created_at)}
          </time>
          {m.is_question ? <StatusLabel status={m.answered ? "answered" : "question"} /> : null}
          {isAdmin && mutedIds.includes(m.author_id) ? <StatusLabel status="muted" /> : null}
          {m.hidden ? <StatusLabel status="hidden" /> : null}
        </div>
        {m.reply_to ? (
          <p className="mt-1 border-l border-line pl-2 text-ui-xs text-ink-muted">
            Reply to {parent ? `${name(parent.author_id)}: “${parent.body.slice(0, 80)}${parent.body.length > 80 ? "…" : ""}”` : "an earlier message"}
          </p>
        ) : null}
        <p className={cx("mt-1 break-words whitespace-pre-wrap", m.hidden && "line-through decoration-ink-muted/40")}>{m.body}</p>
        {canTeach && !inPinned ? (
          <div className="mt-1 -ml-1.5 flex flex-wrap gap-x-2">
            {m.is_question ? <Action onClick={() => toggleAnswered(m)}>{m.answered ? "Mark unanswered" : "Mark answered"}</Action> : null}
            <Action onClick={() => togglePinned(m)} pressed={m.pinned}>
              {m.pinned ? "Unpin" : "Pin"}
            </Action>
            <Action onClick={() => startReply(m)}>Reply</Action>
            {isAdmin ? <Action onClick={() => toggleHidden(m)}>{m.hidden ? "Unhide" : "Hide"}</Action> : null}
            {isAdmin && !isAdminAuthor(m.author_id) ? (
              <Action onClick={() => toggleMute(m)}>{mutedIds.includes(m.author_id) ? "Unmute author" : "Mute author"}</Action>
            ) : null}
          </div>
        ) : null}
        {canTeach && inPinned ? (
          <div className="mt-1 -ml-1.5">
            <Action onClick={() => togglePinned(m)}>Unpin</Action>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <section aria-label="Live Q&A" className="flex h-full min-h-0 flex-col">
      {/* With the phone keyboard open (compact), only the messages and the composer stay. */}
      <div className={cx("flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-1.5", compact && "hidden")}>
        <p className="text-ui-xs text-ink-muted">{messages ? `${openQuestions} open question${openQuestions === 1 ? "" : "s"}` : "Loading"}</p>
        <div role="group" aria-label="Show" className="flex">
          {[
            { v: false, label: "All" },
            { v: true, label: "Questions only" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={questionsOnly === o.v}
              onClick={() => setQuestionsOnly(o.v)}
              className={cx(
                "min-h-11 cursor-pointer px-2.5 text-ui-xs lg:min-h-8",
                questionsOnly === o.v ? "font-semibold text-ink underline decoration-accent decoration-2 underline-offset-[0.4em]" : "text-ink-muted hover:text-ink",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phones (dense): the pinned message is one line, so the conversation keeps its room. */}
      {pinned.length && !compact && dense ? (
        <ul aria-label="Pinned" className="shrink-0 border-b border-line bg-accent-soft/30">
          {pinned.map((m) => (
            <li key={m.id} className="flex min-h-11 items-center gap-2 px-4 text-ui-sm">
              <span className="shrink-0 text-ui-xs font-semibold text-accent-strong">Pinned by tutor</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{name(m.author_id)}:</span> {m.body}
              </span>
              {canTeach ? <Action onClick={() => togglePinned(m)}>Unpin</Action> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {pinned.length && !compact && !dense ? (
        <ul aria-label="Pinned" className="max-h-[40%] shrink-0 overflow-y-auto border-b border-line bg-accent-soft/30 [&_li>p.whitespace-pre-wrap]:line-clamp-2">
          {pinned.map((m) => (
            renderItem(m, true)
          ))}
        </ul>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <ol ref={listRef} onScroll={onScroll} aria-label="Messages" aria-live="polite" aria-relevant="additions" className="h-full overflow-y-auto overscroll-contain">
          {messages === null ? (
            <li className="p-4">
              <SkeletonLines lines={4} />
            </li>
          ) : null}
          {messages && shown.length === 0 ? (
            <li className="px-4 py-10">
              <p className="font-serif text-ui-lg">{questionsOnly ? "No questions yet." : "No messages yet."}</p>
              <p className="mt-1 text-ui-sm text-ink-muted">{canTeach ? "Questions from students appear here as they are asked." : "Ask a question or say hello. Everyone in the class sees it."}</p>
            </li>
          ) : null}
          {shown.map((m) => (
            renderItem(m)
          ))}
        </ol>
        {pill ? (
          <button
            type="button"
            onClick={jumpToNewest}
            className="absolute bottom-3 left-1/2 h-11 -translate-x-1/2 cursor-pointer rounded-sm bg-ink px-4 text-ui-sm font-semibold text-paper shadow-sm hover:bg-ink/90"
          >
            New messages
          </button>
        ) : null}
      </div>

      {muted ? (
        <Notice tone="info" className="m-3 shrink-0">
          {MUTED_NOTICE}
        </Notice>
      ) : (
        <form onSubmit={send} className="shrink-0 space-y-2 border-t border-line bg-paper px-4 py-2.5">
          {replyTo ? (
            <p className="flex flex-wrap items-center gap-x-2 text-ui-xs text-ink-muted">
              <span className="min-w-0">
                Replying to {name(replyTo.author_id)}: “{replyTo.body.slice(0, 50)}
                {replyTo.body.length > 50 ? "…" : ""}”
              </span>
              <Action onClick={() => setReplyTo(null)}>Cancel reply</Action>
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{replyTo ? "Reply" : "Message"}</span>
              <textarea
                ref={textRef}
                rows={1}
                value={body}
                maxLength={MAX_MESSAGE}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => onComposerFocus?.(true)}
                onBlur={() => onComposerFocus?.(false)}
                onKeyDown={(e) => {
                  // Enter sends on a keyboard; Shift+Enter adds a line.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(hover: hover)").matches) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={canTeach ? "Write a message" : "Ask or write something"}
                className={cx(controlClass, "min-h-11 resize-none py-2 text-ui-sm")}
              />
            </label>
            <Button type="submit" loading={busy} loadingText="Sending…" disabled={!body.trim()} className="shrink-0">
              Send
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            {!canTeach ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-ui-sm lg:min-h-8">
                <input type="checkbox" checked={isQuestion} onChange={(e) => setIsQuestion(e.target.checked)} className="size-5 cursor-pointer accent-[var(--accent)]" />
                This is a question
              </label>
            ) : (
              <span />
            )}
            <span className={cx("text-ui-xs tabular-nums", body.length > MAX_MESSAGE - 50 ? "text-accent-strong" : "text-ink-muted")} aria-live={body.length > MAX_MESSAGE - 50 ? "polite" : "off"}>
              {body.length}/{MAX_MESSAGE}
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
