"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Announcements } from "@/components/platform/Announcements";
import { AssessmentForm } from "@/components/platform/AssessmentForm";
import { AssessmentTable } from "@/components/platform/AssessmentTable";
import { Discussion } from "@/components/platform/Discussion";
import { LiveQA } from "@/components/platform/LiveQA";
import { Materials } from "@/components/platform/Materials";
import { useMe } from "@/components/platform/RequireRole";
import { StudentAssessments } from "@/components/platform/StudentAssessments";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { controlClass, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { AdminBreadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api, homeFor } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatClassTime } from "@/lib/dates";
import type { Assessment, ClassItem, People, StudentAssessment } from "@/lib/types";

type Data = { class: ClassItem; people: People; assessments: (Assessment | StudentAssessment)[]; can_teach: boolean };
type Tab = "overview" | "live" | "discussion" | "announcements" | "materials" | "assessments" | "recording";

const joinClass = "h-12 px-6 text-ui-md";

function ClassPage() {
  const me = useMe();
  const toast = useToast();
  const id = useSearchParams().get("id") ?? "";
  const isStudent = me.role === "student";
  const base = isStudent ? "/student" : "/tutor";
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState(id ? "" : "No class was chosen.");
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
    return <EmptyState title="Class not available." text={error} action={<ButtonLink href={homeFor(me.role)} variant="secondary">Back to your dashboard</ButtonLink>} />;
  }
  if (!data) return <SkeletonPage />;
  const c = data.class;
  const teach = data.can_teach;

  async function copyLink() {
    const link = `${window.location.origin}/class/?id=${c.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast("Class link copied.");
    } catch {
      // Some browsers block the clipboard; show the link so it can be copied by hand.
      setManualLink(link);
    }
  }
  async function setStatus(status: ClassItem["status"]) {
    const res = await api(`/tutor/classes/${c.id}`, { method: "PATCH", body: { status } });
    toast(res.ok ? (status === "live" ? "The class is marked live." : "The class is marked ended.") : res.error, res.ok ? "success" : "error");
    reload();
  }
  async function saveRecording(e: React.FormEvent) {
    e.preventDefault();
    const res = await api(`/tutor/classes/${c.id}`, { method: "PATCH", body: { recording_url: recording } });
    toast(res.ok ? "Recording link saved." : res.error, res.ok ? "success" : "error");
    reload();
  }

  // The main action at the top: YouTube for students, Zoom for tutors and admins.
  const join = teach ? (
    c.zoom_url ? (
      <ButtonLink href={c.zoom_url} external className={joinClass}>
        Join on Zoom
      </ButtonLink>
    ) : null
  ) : c.youtube_url ? (
    <ButtonLink href={c.youtube_url} external className={joinClass}>
      Join on YouTube
    </ButtonLink>
  ) : null;

  return (
    <>
      <AdminBreadcrumbs
        items={[
          { label: "Programmes", href: "/admin/programmes/" },
          { label: c.programme?.title ?? "Programme", href: `/admin/programmes/view/?id=${c.programme_id}` },
          { label: c.title },
        ]}
      />
      <PageHeader
        kicker={c.programme?.title}
        title={c.title}
        meta={
          <>
            <span className="text-ink">{formatClassTime(c.starts_at, c.ends_at)}</span>
            <StatusLabel status={c.status} />
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={copyLink}>
              Copy class link
            </Button>
            {join}
          </>
        }
      />
      {manualLink ? (
        <label className="mt-4 block max-w-xl">
          <span className="block text-ui-sm font-semibold">Copy this link</span>
          <input readOnly value={manualLink} onFocus={(e) => e.target.select()} autoFocus className={cx(controlClass, "mt-2 h-11")} />
        </label>
      ) : null}
      {teach && c.zoom_passcode ? (
        <p className="mt-4 text-ui-sm">
          Zoom passcode: <span className="font-semibold tabular-nums">{c.zoom_passcode}</span>
          <span className="text-ink-muted"> · Only tutors and admins see the Zoom details.</span>
        </p>
      ) : null}

      <div className="mt-6">
        <Tabs
          label="Class sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "live", label: "Live Q&A" },
            { id: "discussion", label: "Discussion" },
            { id: "announcements", label: "Announcements" },
            { id: "materials", label: "Materials" },
            { id: "assessments", label: "Assessments", count: data.assessments.length },
            { id: "recording", label: "Recording" },
          ]}
        />
      </div>

      <div className="mt-8">
        {tab === "overview" ? (
          <section aria-label="Overview" className="max-w-measure space-y-6">
            {c.description ? <p className="whitespace-pre-wrap">{c.description}</p> : <p className="text-ink-muted">No description for this class.</p>}
            {!join ? (
              <Notice>{teach ? "No Zoom link yet. The programme admin adds it in the class settings." : "The YouTube link will appear here before the class starts."}</Notice>
            ) : null}
            {teach ? (
              <div className="flex flex-wrap gap-3 border-t border-line pt-6">
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
                  <ButtonLink href={`/admin/classes/edit/?id=${c.id}`} variant="secondary" size="sm">
                    Class settings
                  </ButtonLink>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === "live" ? <LiveQA base={base} classId={c.id} people={data.people} canTeach={teach} /> : null}
        {tab === "discussion" ? <Discussion base={base} programmeId={c.programme_id} classId={c.id} people={data.people} canTeach={teach} /> : null}
        {tab === "announcements" ? <Announcements base={base} programmeId={c.programme_id} classId={c.id} canTeach={teach} /> : null}
        {tab === "materials" ? <Materials base={base} programmeId={c.programme_id} classId={c.id} canTeach={teach} /> : null}

        {tab === "assessments" ? (
          isStudent ? (
            <StudentAssessments items={data.assessments as StudentAssessment[]} onChange={reload} />
          ) : (
            <div className="space-y-6">
              {creating ? (
                <AssessmentForm
                  programmeId={c.programme_id}
                  classes={[c]}
                  defaultClassId={c.id}
                  onCancel={() => setCreating(false)}
                  onCreated={() => {
                    setCreating(false);
                    toast("Assessment created.");
                    reload();
                  }}
                />
              ) : data.assessments.length ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New assessment for this class
                </Button>
              ) : null}
              <AssessmentTable items={data.assessments as Assessment[]} classes={[c]} emptyAction={creating ? undefined : <Button onClick={() => setCreating(true)}>New assessment</Button>} />
            </div>
          )
        ) : null}

        {tab === "recording" ? (
          <section aria-label="Recording" className="max-w-2xl space-y-6">
            {c.recording_url ? (
              <ButtonLink href={c.recording_url} external className={joinClass}>
                Watch the recording
              </ButtonLink>
            ) : (
              <EmptyState title="No recording yet." text="The recording will appear here after the class." />
            )}
            {teach ? (
              <form onSubmit={saveRecording} className="space-y-4 border-t border-line pt-6">
                <TextField label="Recording link" type="url" placeholder="https://www.youtube.com/…" value={recording} onChange={(e) => setRecording(e.target.value)} />
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
    <Suspense fallback={<SkeletonPage />}>
      <ClassPage />
    </Suspense>
  );
}
