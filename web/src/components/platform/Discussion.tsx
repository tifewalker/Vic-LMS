"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { People } from "@/lib/types";
import { useMe } from "./RequireRole";
import { Button, Field, inputClass, Notice } from "./ui";

type Thread = {
  id: string;
  class_id: string | null;
  author_id: string;
  kind: "question" | "discussion";
  title: string;
  body: string;
  pinned: boolean;
  answered: boolean;
  created_at: string;
  reply_count?: number;
};
type Reply = { id: string; author_id: string; body: string; is_answer: boolean; created_at: string };

/**
 * Threads and replies for a class (classId) or the whole programme (classId = null).
 * Updates arrive through Supabase Realtime; tutors can pin threads and mark answers.
 */
export function Discussion({
  base,
  programmeId,
  classId,
  people,
  canTeach,
}: {
  base: string;
  programmeId: string;
  classId: string | null;
  people: People;
  canTeach: boolean;
}) {
  const me = useMe();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState({ kind: "question" as Thread["kind"], title: "", body: "" });
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<{ threads: Thread[] }>(`${base}/programmes/${programmeId}/threads?class_id=${classId ?? "none"}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setThreads(res.data.threads);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [base, programmeId, classId, reloadKey]);

  useEffect(() => {
    const channel = supabase()
      .channel(`threads-${programmeId}-${classId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "threads", filter: `programme_id=eq.${programmeId}` }, () =>
        setReloadKey((k) => k + 1),
      )
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [programmeId, classId]);

  const name = (id: string) => (id === me.id ? "You" : (people[id]?.full_name ?? "Programme admin"));

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await api<{ id: string }>(`${base}/programmes/${programmeId}/threads`, { body: { ...draft, class_id: classId } });
    if (!res.ok) return setError(res.error);
    setDraft({ kind: "question", title: "", body: "" });
    setWriting(false);
    setOpenId(res.data.id);
    setReloadKey((k) => k + 1);
  }

  if (openId) {
    return (
      <ThreadView
        base={base}
        threadId={openId}
        name={name}
        canTeach={canTeach}
        onBack={() => {
          setOpenId(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <section aria-label="Discussion">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Ask a question or start a discussion. Everyone in the programme can see it.</p>
        {!writing ? (
          <Button size="sm" onClick={() => setWriting(true)}>
            New post
          </Button>
        ) : null}
      </div>
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      {writing ? (
        <form onSubmit={post} className="mt-4 space-y-4 border border-line p-4" noValidate>
          <label className="block max-w-56">
            <span className="block text-[0.9375rem] font-semibold">Type</span>
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Thread["kind"] })} className={`mt-1.5 ${inputClass}`}>
              <option value="question">Question</option>
              <option value="discussion">Discussion</option>
            </select>
          </label>
          <Field label="Title" value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <label className="block">
            <span className="block text-[0.9375rem] font-semibold">Message</span>
            <textarea
              rows={4}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={!draft.title.trim() || !draft.body.trim()}>
              Post
            </Button>
            <Button variant="secondary" onClick={() => setWriting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <ul className="mt-4 border-t border-line">
        {threads === null ? <li className="py-4 text-ink-muted">Loading…</li> : null}
        {threads?.length === 0 ? <li className="py-4 text-ink-muted">No posts yet.</li> : null}
        {threads?.map((t) => (
          <li key={t.id} className="border-b border-line">
            <button type="button" onClick={() => setOpenId(t.id)} className="group block w-full cursor-pointer py-3 text-left">
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-serif text-lg group-hover:text-accent-strong">{t.title}</span>
                {t.pinned ? <span className="text-sm font-semibold text-ink">Pinned</span> : null}
                {t.kind === "question" ? (
                  <span className={cx("text-sm", t.answered ? "text-sage-strong" : "text-accent-strong")}>{t.answered ? "Answered" : "Question"}</span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-sm text-ink-muted">
                {name(t.author_id)} · {formatDateTime(t.created_at)} · {t.reply_count ?? 0} repl{t.reply_count === 1 ? "y" : "ies"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ThreadView({
  base,
  threadId,
  name,
  canTeach,
  onBack,
}: {
  base: string;
  threadId: string;
  name: (id: string) => string;
  canTeach: boolean;
  onBack: () => void;
}) {
  const [data, setData] = useState<{ thread: Thread; replies: Reply[] } | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    api<{ thread: Thread; replies: Reply[] }>(`${base}/threads/${threadId}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [base, threadId, reloadKey]);

  useEffect(() => {
    const channel = supabase()
      .channel(`replies-${threadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "replies", filter: `thread_id=eq.${threadId}` }, () => setReloadKey((k) => k + 1))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "threads", filter: `id=eq.${threadId}` }, () => setReloadKey((k) => k + 1))
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [threadId]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    const res = await api(`${base}/threads/${threadId}/replies`, { body: { body } });
    if (!res.ok) return setError(res.error);
    setBody("");
    reload();
  }
  async function pin(pinned: boolean) {
    const res = await api(`${base}/threads/${threadId}/pin`, { body: { pinned } });
    if (!res.ok) setError(res.error);
    reload();
  }
  async function markAnswer(r: Reply) {
    const res = await api(`${base}/replies/${r.id}/answer`, { body: { is_answer: !r.is_answer } });
    if (!res.ok) setError(res.error);
    reload();
  }

  return (
    <section aria-label="Thread">
      <Button variant="quiet" onClick={onBack}>
        Back to all posts
      </Button>
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      {!data ? (
        <p className="mt-4 text-ink-muted">Loading…</p>
      ) : (
        <>
          <article className="mt-4 border-t border-line pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-2xl">{data.thread.title}</h3>
              {canTeach ? (
                <Button size="sm" variant="secondary" onClick={() => pin(!data.thread.pinned)}>
                  {data.thread.pinned ? "Unpin" : "Pin"}
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {name(data.thread.author_id)} · {formatDateTime(data.thread.created_at)}
              {data.thread.pinned ? " · Pinned" : ""}
              {data.thread.kind === "question" ? (data.thread.answered ? " · Answered" : " · Question") : ""}
            </p>
            <p className="mt-3 max-w-measure break-words whitespace-pre-wrap">{data.thread.body}</p>
          </article>

          <ol className="mt-6 border-t border-line">
            {data.replies.map((r) => (
              <li key={r.id} className={cx("border-b border-line py-3", r.is_answer && "border-l-2 border-l-sage bg-sage-soft/50 pl-3")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold">{name(r.author_id)}</span>
                    <span className="text-ink-muted"> · {formatDateTime(r.created_at)}</span>
                    {r.is_answer ? <span className="font-semibold text-sage-strong"> · Answer</span> : null}
                  </p>
                  {canTeach ? (
                    <Button variant="quiet" onClick={() => markAnswer(r)}>
                      {r.is_answer ? "Unmark answer" : "Mark as answer"}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 max-w-measure break-words whitespace-pre-wrap">{r.body}</p>
              </li>
            ))}
            {data.replies.length === 0 ? <li className="py-4 text-ink-muted">No replies yet.</li> : null}
          </ol>

          <form onSubmit={reply} className="mt-4 space-y-3">
            <label className="block">
              <span className="block text-[0.9375rem] font-semibold">Reply</span>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base"
              />
            </label>
            <Button type="submit" disabled={!body.trim()}>
              Post reply
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
