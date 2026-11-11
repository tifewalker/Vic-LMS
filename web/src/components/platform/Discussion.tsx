"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { People } from "@/lib/types";
import { useMe } from "./RequireRole";

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

/** Threads and replies for a class (classId) or the whole programme (null), updated through Realtime. */
export function Discussion({ base, programmeId, classId, people, canTeach }: { base: string; programmeId: string; classId: string | null; people: People; canTeach: boolean }) {
  const me = useMe();
  const toast = useToast();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState({ kind: "question" as Thread["kind"], title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<{ threads: Thread[] }>(`${base}/programmes/${programmeId}/threads?class_id=${classId ?? "none"}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setThreads(res.data.threads);
      else toast(res.error, "error");
    });
    return () => {
      cancelled = true;
    };
  }, [base, programmeId, classId, reloadKey, toast]);

  useEffect(() => {
    const channel = supabase()
      .channel(`threads-${programmeId}-${classId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "threads", filter: `programme_id=eq.${programmeId}` }, () => setReloadKey((k) => k + 1))
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [programmeId, classId]);

  const name = (id: string) => (id === me.id ? "You" : (people[id]?.full_name ?? "Programme admin"));

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api<{ id: string }>(`${base}/programmes/${programmeId}/threads`, { body: { ...draft, class_id: classId } });
    setBusy(false);
    if (!res.ok) return toast(res.error, "error");
    toast("Posted.");
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

  const newPost = <Button onClick={() => setWriting(true)}>New post</Button>;

  return (
    <section aria-label="Discussion" className="space-y-6">
      {!writing && threads?.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ui-sm text-ink-muted">Ask a question or start a discussion. Everyone in the programme can see it.</p>
          <Button size="sm" onClick={() => setWriting(true)}>
            New post
          </Button>
        </div>
      ) : null}

      {writing ? (
        <form onSubmit={post} className="max-w-2xl space-y-6 border border-line bg-paper p-6" noValidate>
          <h2 className="text-ui-md font-semibold">New post</h2>
          <SelectField label="Type" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Thread["kind"] })} className="max-w-56">
            <option value="question">Question</option>
            <option value="discussion">Discussion</option>
          </SelectField>
          <TextField label="Title" value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          <TextArea label="Message" rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} required />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={busy} loadingText="Posting…" disabled={!draft.title.trim() || !draft.body.trim()}>
              Post
            </Button>
            <Button variant="secondary" onClick={() => setWriting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {threads === null ? <SkeletonRows rows={3} /> : null}
      {threads?.length === 0 && !writing ? <EmptyState title="No posts yet." text="Ask a question or start a discussion. Everyone in the programme can see it." action={newPost} /> : null}
      {threads?.length ? (
        <ul className="border-t border-line">
          {threads.map((t) => (
            <li key={t.id} className="border-b border-line">
              <button type="button" onClick={() => setOpenId(t.id)} className="group block w-full cursor-pointer py-4 text-left hover:bg-paper-2/70">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-semibold text-ink group-hover:text-accent-strong group-hover:underline">{t.title}</span>
                  {t.pinned ? <StatusLabel status="pinned" /> : null}
                  {t.kind === "question" ? <StatusLabel status={t.answered ? "answered" : "question"} /> : null}
                </span>
                <span className="mt-1 block text-ui-xs text-ink-muted">
                  {name(t.author_id)} · {formatDateTime(t.created_at)} · {t.reply_count ?? 0} repl{t.reply_count === 1 ? "y" : "ies"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ThreadView({ base, threadId, name, canTeach, onBack }: { base: string; threadId: string; name: (id: string) => string; canTeach: boolean; onBack: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<{ thread: Thread; replies: Reply[] } | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    api<{ thread: Thread; replies: Reply[] }>(`${base}/threads/${threadId}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else toast(res.error, "error");
    });
    return () => {
      cancelled = true;
    };
  }, [base, threadId, reloadKey, toast]);

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
    setBusy(true);
    const res = await api(`${base}/threads/${threadId}/replies`, { body: { body } });
    setBusy(false);
    if (!res.ok) return toast(res.error, "error");
    setBody("");
    reload();
  }
  async function pin(pinned: boolean) {
    const res = await api(`${base}/threads/${threadId}/pin`, { body: { pinned } });
    toast(res.ok ? (pinned ? "Pinned." : "Unpinned.") : res.error, res.ok ? "success" : "error");
    reload();
  }
  async function markAnswer(r: Reply) {
    const res = await api(`${base}/replies/${r.id}/answer`, { body: { is_answer: !r.is_answer } });
    if (!res.ok) toast(res.error, "error");
    reload();
  }

  return (
    <section aria-label="Thread" className="max-w-3xl">
      <Button variant="quiet" onClick={onBack}>
        Back to all posts
      </Button>
      {!data ? (
        <div className="mt-6">
          <SkeletonRows rows={3} />
        </div>
      ) : (
        <>
          <article className="mt-6 border-t border-line pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="text-ui-md font-semibold">{data.thread.title}</h3>
                {data.thread.pinned ? <StatusLabel status="pinned" /> : null}
                {data.thread.kind === "question" ? <StatusLabel status={data.thread.answered ? "answered" : "question"} /> : null}
              </div>
              {canTeach ? (
                <Button size="sm" variant="secondary" onClick={() => pin(!data.thread.pinned)}>
                  {data.thread.pinned ? "Unpin" : "Pin"}
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-ui-xs text-ink-muted">
              {name(data.thread.author_id)} · {formatDateTime(data.thread.created_at)}
            </p>
            <p className="mt-3 max-w-measure break-words whitespace-pre-wrap">{data.thread.body}</p>
          </article>

          <ol className="mt-6 border-t border-line">
            {data.replies.map((r) => (
              <li key={r.id} className={cx("border-b border-line py-4", r.is_answer && "border-l-2 border-l-sage bg-sage-soft/50 pl-4")}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-ui-sm font-semibold">{name(r.author_id)}</span>
                  <span className="text-ui-xs text-ink-muted">{formatDateTime(r.created_at)}</span>
                  {r.is_answer ? <StatusLabel status="answered" label="Answer" /> : null}
                  {canTeach ? (
                    <Button variant="quiet" size="sm" className="ml-auto" onClick={() => markAnswer(r)}>
                      {r.is_answer ? "Unmark answer" : "Mark as answer"}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 max-w-measure break-words whitespace-pre-wrap">{r.body}</p>
              </li>
            ))}
            {data.replies.length === 0 ? <li className="py-4 text-ui-sm text-ink-muted">No replies yet.</li> : null}
          </ol>

          <form onSubmit={reply} className="mt-6 space-y-3">
            <TextArea label="Reply" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <Button type="submit" loading={busy} loadingText="Posting…" disabled={!body.trim()}>
              Post reply
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
