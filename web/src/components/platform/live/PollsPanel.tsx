"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { Poll, usePolls } from "./data";

type Polls = ReturnType<typeof usePolls>;

/** Result bars: label and percentage on one line, a 6px bar under it. The chosen option is marked. */
function Results({ poll }: { poll: Poll }) {
  return (
    <div>
      <ul className="space-y-3">
        {poll.options.map((o) => {
          const mine = poll.my_vote === o.id;
          return (
            <li key={o.id}>
              <div className="flex items-baseline justify-between gap-3 text-ui-sm">
                <span className={cx("min-w-0 break-words", mine && "font-semibold")}>
                  {o.label}
                  {mine ? <span className="ml-2 text-ui-xs font-semibold text-accent-strong">Your vote</span> : null}
                </span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {o.percent}%<span className="sr-only">, {o.votes} vote{o.votes === 1 ? "" : "s"}</span>
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1.5 bg-line/60">
                <div className={cx("h-full", mine ? "bg-accent" : "bg-ink-muted")} style={{ width: `${o.percent ?? 0}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-ui-xs text-ink-muted tabular-nums">
        {poll.total_votes} vote{poll.total_votes === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function NewPollForm({ base, classId, onDone }: { base: string; classId: string; onDone: () => void }) {
  const toast = useToast();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [showResults, setShowResults] = useState<Poll["show_results"]>("after_vote");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"open" | "draft" | null>(null);
  const filled = options.filter((o) => o.trim()).length;

  async function save(open: boolean) {
    setBusy(open ? "open" : "draft");
    setError("");
    const res = await api(`${base}/classes/${classId}/polls`, { body: { question, options, show_results: showResults, open } });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    toast(open ? "Poll opened. Students can vote now." : "Poll saved as a draft.");
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(true);
      }}
      className="space-y-4 border-b border-line p-4"
      aria-label="New poll"
    >
      <label className="block">
        <span className="block text-ui-sm font-semibold">Question</span>
        <input value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} className={cx(controlClass, "mt-1.5 h-11")} autoFocus />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-ui-sm font-semibold">Options (2 to 5)</legend>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Option {i + 1}</span>
              <input
                value={o}
                maxLength={120}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                className={cx(controlClass, "h-11")}
              />
            </label>
            {options.length > 2 ? (
              <button
                type="button"
                onClick={() => setOptions(options.filter((_, j) => j !== i))}
                className="min-h-11 shrink-0 cursor-pointer px-2 text-ui-xs font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em]"
              >
                Remove<span className="sr-only"> option {i + 1}</span>
              </button>
            ) : null}
          </div>
        ))}
        {options.length < 5 ? (
          <button
            type="button"
            onClick={() => setOptions([...options, ""])}
            className="min-h-11 cursor-pointer text-ui-sm font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em]"
          >
            Add an option
          </button>
        ) : null}
      </fieldset>
      <fieldset>
        <legend className="text-ui-sm font-semibold">Students see results</legend>
        <div className="mt-1 flex flex-wrap gap-x-5">
          {(
            [
              ["after_vote", "After they vote"],
              ["after_close", "When the poll closes"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 text-ui-sm">
              <input type="radio" name="show_results" checked={showResults === v} onChange={() => setShowResults(v)} className="size-5 cursor-pointer accent-[var(--accent)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy === "open"} loadingText="Opening…" disabled={!question.trim() || filled < 2 || busy !== null}>
          Open now
        </Button>
        <Button variant="secondary" onClick={() => save(false)} loading={busy === "draft"} loadingText="Saving…" disabled={!question.trim() || filled < 2 || busy !== null}>
          Save as draft
        </Button>
        <Button variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Polls in a live class. The open poll is at the top as big options; after voting the student
 * sees "You voted" and the results bars when allowed. Closed polls follow with final results.
 * Tutors and admins also get "New poll", drafts, Open and Close, and always see live results.
 */
export function PollsPanel({ base, classId, data }: { base: string; classId: string; data: Polls }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { polls, canManage, reload } = data;
  const [creating, setCreating] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  const open = polls?.find((p) => p.status === "open") ?? null;
  const drafts = (polls ?? []).filter((p) => p.status === "draft");
  const closed = (polls ?? []).filter((p) => p.status === "closed");

  async function vote(poll: Poll, optionId: string) {
    setVoting(optionId);
    const res = await api(`${base}/polls/${poll.id}/vote`, { body: { option_id: optionId } });
    setVoting(null);
    if (!res.ok) toast(res.error, "error");
    reload();
  }
  async function act(poll: Poll, action: "open" | "close" | "delete") {
    if (action === "delete" && !(await confirm({ title: "Delete this poll?", body: "Its votes are deleted too. This cannot be undone.", confirmLabel: "Delete poll" }))) return;
    if (action === "open" && open && !(await confirm({ title: "Open this poll?", body: `The open poll, “${open.question}”, will close first.`, confirmLabel: "Open poll" }))) return;
    const res = action === "delete" ? await api(`${base}/polls/${poll.id}`, { method: "DELETE" }) : await api(`${base}/polls/${poll.id}/${action}`, { body: {} });
    if (!res.ok) return toast(res.error, "error");
    toast(action === "open" ? "Poll opened." : action === "close" ? "Poll closed. Students now see the final results." : "Poll deleted.");
    reload();
  }

  const manageRow = (p: Poll) =>
    canManage ? (
      <div className="mt-3 flex flex-wrap gap-2">
        {p.status !== "open" ? (
          <Button size="sm" variant={p.status === "draft" ? "primary" : "secondary"} className="max-lg:h-11" onClick={() => act(p, "open")}>
            {p.status === "draft" ? "Open" : "Reopen"}
          </Button>
        ) : (
          <Button size="sm" className="max-lg:h-11" onClick={() => act(p, "close")}>
            Close poll
          </Button>
        )}
        <Button size="sm" variant="secondary" className="max-lg:h-11" onClick={() => act(p, "delete")}>
          Delete
        </Button>
      </div>
    ) : null;

  return (
    <section aria-label="Polls" className="h-full overflow-y-auto overscroll-contain">
      {canManage ? (
        creating ? (
          <NewPollForm
            base={base}
            classId={classId}
            onDone={() => {
              setCreating(false);
              reload();
            }}
          />
        ) : (
          <div className="border-b border-line p-4">
            <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
              New poll
            </Button>
          </div>
        )
      ) : null}

      {polls === null ? (
        <div className="p-4">
          <SkeletonLines lines={4} />
        </div>
      ) : null}

      {polls && !open && !drafts.length && !closed.length && !creating ? (
        <div className="px-4 py-10">
          <p className="font-serif text-ui-lg">No polls yet.</p>
          <p className="mt-1 text-ui-sm text-ink-muted">{canManage ? "Create a poll to ask the whole class a quick question." : "When your tutor opens a poll, it appears here."}</p>
        </div>
      ) : null}

      {open ? (
        <article aria-labelledby={`poll-${open.id}`} className="border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusLabel status="live" label="Open poll" />
            {open.my_vote ? <StatusLabel status="answered" label="You voted" /> : null}
          </div>
          <h3 id={`poll-${open.id}`} className="mt-2 font-serif text-[1.375rem] leading-snug">
            {open.question}
          </h3>
          <div className="mt-4">
            {!canManage && !open.my_vote ? (
              <ul className="space-y-2">
                {open.options.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={voting !== null}
                      onClick={() => vote(open, o.id)}
                      className="flex min-h-14 w-full cursor-pointer items-center rounded-sm border border-line bg-paper px-4 py-3 text-left text-ui-md hover:border-accent focus-visible:border-accent disabled:cursor-wait disabled:opacity-60"
                    >
                      {voting === o.id ? "Voting…" : o.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : open.results_visible ? (
              <Results poll={open} />
            ) : (
              <p className="text-ui-sm text-ink-muted">Results appear when the poll closes.</p>
            )}
          </div>
          {canManage ? <p className="mt-3 text-ui-xs text-ink-muted">{open.show_results === "after_vote" ? "Students see results after they vote." : "Students see results when you close the poll."}</p> : null}
          {manageRow(open)}
        </article>
      ) : null}

      {canManage && drafts.length ? (
        <div className="border-b border-line p-4">
          <h3 className="ui-label">Drafts</h3>
          <ul className="mt-2 divide-y divide-line">
            {drafts.map((p) => (
              <li key={p.id} className="py-3">
                <p className="font-semibold">{p.question}</p>
                <p className="mt-0.5 text-ui-xs text-ink-muted">{p.options.map((o) => o.label).join(" · ")}</p>
                {manageRow(p)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {closed.length ? (
        <div className="p-4">
          <h3 className="ui-label">Closed polls</h3>
          <ul className="mt-2 divide-y divide-line">
            {closed.map((p) => (
              <li key={p.id} className="py-4">
                <p className="font-serif text-ui-lg leading-snug">{p.question}</p>
                <div className="mt-3">
                  <Results poll={p} />
                </div>
                {manageRow(p)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
