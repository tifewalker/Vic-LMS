"use client";

import { useEffect, useRef, useState } from "react";
import { useModeration } from "@/components/platform/useModeration";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckboxField, SelectField, TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { cx } from "@/lib/cx";
import { formatTimeRange } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { useLoad } from "@/lib/useLoad";

type Author = { full_name: string; role: string; chat_muted: boolean } | null;
type Message = {
  id: string;
  class_id: string;
  author_id: string;
  body: string;
  is_question: boolean;
  answered: boolean;
  created_at: string;
  hidden: boolean;
  class: { id: string; title: string } | null;
  programme: { id: string; title: string } | null;
  author: Author;
};
type ClassRow = { id: string; title: string; programme_id: string; programme_title: string; starts_at?: string; ends_at?: string };
type Data = {
  live: ClassRow[];
  upcoming: ClassRow[];
  messages: Message[];
  queue: Omit<Message, "answered" | "hidden" | "is_question">[];
  programmes: { id: string; title: string }[];
  classes: { id: string; title: string }[];
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const roleTag = (a: Author) => (a?.role === "tutor" ? "tutor" : a?.role === "admin" || a?.role === "super_admin" ? "admin" : null);

/**
 * Admin live monitor: classes live now and later today, a realtime stream of live Q&A from every
 * programme with moderation actions, and the unanswered questions as a queue.
 */
export default function LiveMonitorPage() {
  const mod = useModeration();
  const [programme, setProgramme] = useState("");
  const [klass, setKlass] = useState("");
  const [questions, setQuestions] = useState(false);
  const [unanswered, setUnanswered] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams();
  if (programme) params.set("programme_id", programme);
  if (klass) params.set("class_id", klass);
  if (questions) params.set("questions", "1");
  if (unanswered) params.set("unanswered", "1");
  const { data, error, reload } = useLoad<Data>(`/admin/live?${params.toString()}`);

  // Every insert, edit, hide or answer in any class: reload (briefly debounced, so a burst is one request).
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const channel = supabase()
      .channel("admin-live-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages" }, () => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(reload, 300);
      })
      .subscribe();
    return () => {
      window.clearTimeout(timer.current);
      supabase().removeChannel(channel);
    };
  }, [reload]);

  // Keep the newest message in view.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages.length]);

  async function sendReply(e: React.FormEvent, id: string) {
    e.preventDefault();
    setBusy(true);
    const okay = await mod.reply("live_messages", id, reply);
    setBusy(false);
    if (okay) {
      setReply("");
      setReplyTo(null);
      reload();
    }
  }
  const after = (p: Promise<boolean>) => p.then((okay) => okay && reload());

  return (
    <>
      <PageHeader kicker="Live and community" title="Live monitor" description="Live Q&A from every programme as it happens. Hide, answer, reply or mute without leaving this page." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section aria-labelledby="live-now-title">
          <SectionTitle id="live-now-title">Live now</SectionTitle>
          <ClassLines rows={data?.live ?? null} empty="No classes are live right now." live />
        </section>
        <section aria-labelledby="today-title">
          <SectionTitle id="today-title">Coming up today</SectionTitle>
          <ClassLines rows={data?.upcoming ?? null} empty="Nothing else is scheduled for today." />
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-end gap-x-6 gap-y-4 border-y border-line py-4">
        <SelectField
          label="Programme"
          value={programme}
          onChange={(e) => {
            setProgramme(e.target.value);
            setKlass("");
          }}
          className="w-full sm:w-64"
        >
          <option value="">All programmes</option>
          {data?.programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </SelectField>
        <SelectField label="Class" value={klass} onChange={(e) => setKlass(e.target.value)} disabled={!programme} className="w-full sm:w-64">
          <option value="">{programme ? "All classes" : "Choose a programme first"}</option>
          {data?.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pb-2.5">
          <CheckboxField label="Questions only" checked={questions} onChange={(e) => setQuestions(e.target.checked)} />
          <CheckboxField label="Unanswered only" checked={unanswered} onChange={(e) => setUnanswered(e.target.checked)} />
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-8">
        <section aria-labelledby="stream-title" className="lg:col-span-8">
          <div className="flex items-baseline justify-between gap-4">
            <SectionTitle id="stream-title">Stream</SectionTitle>
            <p className="text-ui-xs text-ink-muted">Updates as messages arrive</p>
          </div>
          {!data ? (
            <div className="mt-4">
              <SkeletonRows rows={4} />
            </div>
          ) : data.messages.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No messages." text="Messages from live Q&A in every programme appear here." />
            </div>
          ) : (
            <ol ref={listRef} aria-live="polite" className="mt-4 max-h-[44rem] overflow-y-auto border-y border-line">
              {data.messages.map((m) => {
                const tag = roleTag(m.author);
                const canMute = m.author && tag !== "admin";
                return (
                  <li
                    key={m.id}
                    className={cx(
                      "border-b border-line py-4 last:border-b-0",
                      m.is_question && !m.answered && !m.hidden && "border-l-2 border-l-accent pl-4",
                      m.hidden && "bg-paper-2/60 pl-4 text-ink-muted",
                    )}
                  >
                    <p className="text-ui-xs text-ink-muted">
                      {m.programme?.title} ·{" "}
                      <a href={`/class/?id=${m.class_id}`} className="underline decoration-line underline-offset-[0.22em] hover:text-ink">
                        {m.class?.title}
                      </a>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={cx("text-ui-sm font-semibold", m.hidden ? "text-ink-muted" : "text-ink")}>{tag === "admin" ? "Programme admin" : (m.author?.full_name ?? "Unknown")}</span>
                      {tag ? <StatusLabel status={tag} /> : m.author ? <span className="text-ui-xs text-ink-muted">Student</span> : null}
                      {m.author?.chat_muted ? <StatusLabel status="muted" /> : null}
                      <span className="text-ui-xs text-ink-muted">{time(m.created_at)}</span>
                      {m.is_question ? <StatusLabel status={m.answered ? "answered" : "question"} /> : null}
                      {m.hidden ? <StatusLabel status="hidden" /> : null}
                    </div>
                    <p className={cx("mt-1 max-w-measure break-words whitespace-pre-wrap", m.hidden && "line-through decoration-ink-muted/40")}>{m.body}</p>
                    <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
                      {m.is_question ? (
                        <Button variant="quiet" size="sm" onClick={() => after(mod.answered("live_messages", m.id, !m.answered))}>
                          {m.answered ? "Mark unanswered" : "Mark answered"}
                        </Button>
                      ) : null}
                      <Button variant="quiet" size="sm" onClick={() => after(mod.hide("live_messages", m.id, !m.hidden))}>
                        {m.hidden ? "Unhide" : "Hide"}
                      </Button>
                      <Button variant="quiet" size="sm" aria-expanded={replyTo === m.id} onClick={() => setReplyTo(replyTo === m.id ? null : m.id)}>
                        Reply
                      </Button>
                      {canMute ? (
                        <Button variant="quiet" size="sm" onClick={() => after(mod.mute(m.author_id, m.author!.full_name, !m.author!.chat_muted))}>
                          {m.author!.chat_muted ? "Unmute author" : "Mute author"}
                        </Button>
                      ) : null}
                    </div>
                    {replyTo === m.id ? (
                      <form onSubmit={(e) => sendReply(e, m.id)} className="mt-3 max-w-xl space-y-3">
                        <TextArea label={`Reply as Admin in ${m.class?.title ?? "the class"}`} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} />
                        <div className="flex gap-3">
                          <Button type="submit" size="sm" loading={busy} loadingText="Sending…" disabled={!reply.trim()}>
                            Send reply
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setReplyTo(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside aria-labelledby="queue-title" className="lg:col-span-4">
          <div className="lg:sticky lg:top-8">
            <SectionTitle id="queue-title">
              Unanswered questions{data ? <span className="ml-2 text-ui-sm font-normal text-ink-muted tabular-nums">{data.queue.length}</span> : null}
            </SectionTitle>
            {!data ? (
              <div className="mt-4">
                <SkeletonRows rows={3} />
              </div>
            ) : data.queue.length === 0 ? (
              <p className="mt-4 text-ui-sm text-ink-muted">Every live question has been answered.</p>
            ) : (
              <ol className="mt-4 max-h-[40rem] overflow-y-auto border-t border-line">
                {data.queue.map((q) => (
                  <li key={q.id} className="border-b border-line py-3">
                    <p className="text-ui-xs text-ink-muted">
                      {time(q.created_at)} · {q.class?.title} · {q.author?.full_name ?? "Unknown"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-ui-sm break-words">{q.body}</p>
                    <div className="mt-1 flex flex-wrap gap-x-1">
                      <Button variant="quiet" size="sm" onClick={() => after(mod.answered("live_messages", q.id, true))}>
                        Mark answered
                      </Button>
                      <a href={`/class/?id=${q.class_id}`} className="inline-flex h-8 items-center px-2 text-ui-sm font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
                        Open class
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function ClassLines({ rows, empty, live = false }: { rows: ClassRow[] | null; empty: string; live?: boolean }) {
  if (!rows) return <div className="mt-3"><SkeletonRows rows={2} /></div>;
  if (!rows.length) return <p className="mt-3 text-ui-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="mt-3 border-t border-line">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3">
          <span className="min-w-0">
            <a href={`/class/?id=${c.id}`} className="font-semibold text-ink hover:text-accent-strong hover:underline">
              {c.title}
            </a>
            <span className="block text-ui-xs text-ink-muted">{c.programme_title}</span>
          </span>
          {live ? <StatusLabel status="live" /> : c.starts_at && c.ends_at ? <span className="text-ui-xs text-ink-muted tabular-nums">{formatTimeRange(c.starts_at, c.ends_at)}</span> : null}
        </li>
      ))}
    </ul>
  );
}
