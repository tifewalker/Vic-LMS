"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AssessmentForm } from "@/components/platform/AssessmentForm";
import { AssessmentTable } from "@/components/platform/AssessmentTable";
import { Discussion } from "@/components/platform/Discussion";
import { LiveQA } from "@/components/platform/LiveQA";
import { useMe } from "@/components/platform/RequireRole";
import { StudentAssessments } from "@/components/platform/StudentAssessments";
import { ClassStatus, Tabs } from "@/components/platform/Tabs";
import { Button, buttonClass, Field, Notice, PageTitle } from "@/components/platform/ui";
import { api, homeFor } from "@/lib/api";
import { formatDateTime, formatTimeRange } from "@/lib/dates";
import type { Assessment, ClassItem, People, StudentAssessment } from "@/lib/types";

type Data = { class: ClassItem; people: People; assessments: (Assessment | StudentAssessment)[]; can_teach: boolean };
type Tab = "overview" | "live" | "discussion" | "assessments" | "recording";

function ClassPage() {
  const me = useMe();
  const id = useSearchParams().get("id") ?? "";
  const isStudent = me.role === "student";
  const base = isStudent ? "/student" : "/tutor";
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState(id ? "" : "No class was chosen.");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState("");
  const [creating, setCreating] = useState(false);
  const [recording, setRecording] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!id) return;
    api<Data>(`${base}/classes/${encodeURIComponent(id)}`).then((res) => {
      if (res.ok) {
        setData(res.data);
        setRecording(res.data.class.recording_url ?? "");
      } else setError(res.error === "Not found." ? "This class is not part of your programmes." : res.error);
    });
  }, [base, id, reloadKey]);

  if (error && !data) {
    return (
      <>
        <Notice tone="error">{error}</Notice>
        <p className="mt-6">
          <a href={homeFor(me.role)} className="text-accent-strong hover:underline">
            Back to your dashboard
          </a>
        </p>
      </>
    );
  }
  if (!data) return <p className="text-ink-muted">Loading…</p>;
  const c = data.class;
  const teach = data.can_teach;

  async function copyLink() {
    const link = `${window.location.origin}/class/?id=${c.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Some browsers block the clipboard; show the link so it can be copied by hand.
      setManualLink(link);
    }
  }
  async function setStatus(status: ClassItem["status"]) {
    const res = await api(`/tutor/classes/${c.id}`, { method: "PATCH", body: { status } });
    setNotice(res.ok ? (status === "live" ? "The class is marked live." : "The class is marked ended.") : res.error);
    reload();
  }
  async function saveRecording(e: React.FormEvent) {
    e.preventDefault();
    const res = await api(`/tutor/classes/${c.id}`, { method: "PATCH", body: { recording_url: recording } });
    setNotice(res.ok ? "Recording link saved." : res.error);
    reload();
  }

  return (
    <>
      <PageTitle kicker={c.programme?.title} title={c.title}>
        <Button variant="secondary" onClick={copyLink}>
          {copied ? "Link copied" : "Copy class link"}
        </Button>
      </PageTitle>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-muted">
        <span>
          {formatDateTime(c.starts_at)}, {formatTimeRange(c.starts_at, c.ends_at)}
        </span>
        <ClassStatus status={c.status} />
      </p>

      <div className="mt-6 space-y-3">
        {manualLink ? (
          <label className="block max-w-xl">
            <span className="block text-sm font-semibold">Copy this link</span>
            <input readOnly value={manualLink} onFocus={(e) => e.target.select()} autoFocus className="mt-1 block w-full rounded-sm border border-line bg-white px-3 py-2 text-base" />
          </label>
        ) : null}
        {notice ? <Notice>{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      <div className="mt-8">
        <Tabs
          label="Class sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "live", label: "Live Q&A" },
            { id: "discussion", label: "Discussion" },
            { id: "assessments", label: `Assessments (${data.assessments.length})` },
            { id: "recording", label: "Recording" },
          ]}
        />
      </div>

      <div className="mt-6">
        {tab === "overview" ? (
          <section aria-label="Overview" className="max-w-2xl space-y-6">
            {c.description ? <p className="whitespace-pre-wrap">{c.description}</p> : null}
            {teach ? (
              <div className="space-y-4">
                {c.zoom_url ? (
                  <>
                    <a href={c.zoom_url} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
                      Join on Zoom
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    {c.zoom_passcode ? (
                      <p>
                        Passcode: <span className="font-semibold tabular-nums">{c.zoom_passcode}</span>
                      </p>
                    ) : null}
                    <p className="text-sm text-ink-muted">Only tutors and admins see the Zoom details. Students watch on YouTube.</p>
                  </>
                ) : (
                  <p className="text-ink-muted">No Zoom link yet. The programme admin adds it on the class settings.</p>
                )}
                <div className="flex flex-wrap gap-3 border-t border-line pt-4">
                  {c.status !== "live" ? (
                    <Button size="sm" variant="secondary" onClick={() => setStatus("live")}>
                      Mark as live
                    </Button>
                  ) : null}
                  {c.status !== "ended" ? (
                    <Button size="sm" variant="secondary" onClick={() => setStatus("ended")}>
                      Mark as ended
                    </Button>
                  ) : null}
                  {me.role === "admin" || me.role === "super_admin" ? (
                    <a href={`/admin/classes/edit/?id=${c.id}`} className={buttonClass("secondary", undefined, "sm")}>
                      Class settings
                    </a>
                  ) : null}
                </div>
              </div>
            ) : c.youtube_url ? (
              <a href={c.youtube_url} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
                Join on YouTube
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p className="text-ink-muted">The YouTube link will appear here before the class starts.</p>
            )}
          </section>
        ) : null}

        {tab === "live" ? <LiveQA base={base} classId={c.id} people={data.people} canTeach={teach} /> : null}

        {tab === "discussion" ? <Discussion base={base} programmeId={c.programme_id} classId={c.id} people={data.people} canTeach={teach} /> : null}

        {tab === "assessments" ? (
          isStudent ? (
            <StudentAssessments items={data.assessments as StudentAssessment[]} onChange={reload} />
          ) : (
            <>
              {!creating ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New assessment for this class
                </Button>
              ) : (
                <AssessmentForm
                  programmeId={c.programme_id}
                  classes={[c]}
                  defaultClassId={c.id}
                  onCancel={() => setCreating(false)}
                  onCreated={() => {
                    setCreating(false);
                    setNotice("Assessment created.");
                    reload();
                  }}
                />
              )}
              <AssessmentTable items={data.assessments as Assessment[]} classes={[c]} />
            </>
          )
        ) : null}

        {tab === "recording" ? (
          <section aria-label="Recording" className="max-w-2xl space-y-5">
            {c.recording_url ? (
              <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
                Watch the recording
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p className="text-ink-muted">The recording will appear here after the class.</p>
            )}
            {teach ? (
              <form onSubmit={saveRecording} className="space-y-3 border-t border-line pt-5">
                <Field label="Recording link" type="url" placeholder="https://www.youtube.com/…" value={recording} onChange={(e) => setRecording(e.target.value)} />
                <Button type="submit" size="sm">
                  Save recording link
                </Button>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}

export default function ClassRoute() {
  return (
    <Suspense>
      <ClassPage />
    </Suspense>
  );
}
