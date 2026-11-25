"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Announcements } from "@/components/platform/Announcements";
import { AssessmentForm } from "@/components/platform/AssessmentForm";
import { AssessmentTable } from "@/components/platform/AssessmentTable";
import { Discussion } from "@/components/platform/Discussion";
import { useLiveMessages, usePolls, type Poll } from "@/components/platform/live/data";
import { classPhase, Player, useNow } from "@/components/platform/live/Player";
import { PollsPanel } from "@/components/platform/live/PollsPanel";
import { QAPanel } from "@/components/platform/live/QAPanel";
import { Materials } from "@/components/platform/Materials";
import { useMe } from "@/components/platform/RequireRole";
import { StudentAssessments } from "@/components/platform/StudentAssessments";
import { AdminBreadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/Field";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api, homeFor } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatClassTime } from "@/lib/dates";
import type { Assessment, ClassItem, People, StudentAssessment } from "@/lib/types";

type Data = { class: ClassItem; people: People; assessments: (Assessment | StudentAssessment)[]; can_teach: boolean };
type MainTab = "about" | "materials" | "assessments" | "recording";
type LiveTab = "qa" | "polls";
type MobileTab = LiveTab | "about" | "materials" | "assessments";

/* ---------- Viewport helpers ---------- */

const DESKTOP = "(min-width: 1024px)";
function useDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

/**
 * The visible height on phones. With the keyboard open, iOS shrinks the visual viewport but not
 * 100dvh, so the live screen sizes itself from visualViewport and keeps the composer above the
 * keyboard. Android (interactive-widget=resizes-content) shrinks both.
 */
function useVisualHeight(enabled: boolean) {
  const [size, setSize] = useState<{ height: number; tallest: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!enabled || !vv) return;
    let tallest = 0;
    let width = vv.width;
    const update = () => {
      // The tallest height seen at this width is the screen without a keyboard (rotation resets it).
      if (vv.width !== width) {
        width = vv.width;
        tallest = 0;
      }
      tallest = Math.max(tallest, vv.height);
      setSize({ height: vv.height, tallest });
      // iOS scrolls the page to reveal the focused field; the screen already fits, so undo it.
      if (window.scrollY !== 0 && vv.height < window.innerHeight) window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [enabled]);
  return size;
}

/* ---------- Small parts ---------- */

/** Mobile tab bar: tabs share the width by label length, 44px tall, no sideways scroll. Arrow keys move between tabs. */
function MobileTabs({ tabs, value, onChange }: { tabs: { id: MobileTab; label: string; count?: number }[]; value: MobileTab; onChange: (t: MobileTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label="Class sections" className="flex shrink-0 border-b border-line bg-paper">
      {tabs.map((t, i) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`m-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              const last = tabs.length - 1;
              const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : null;
              if (next === null) return;
              e.preventDefault();
              onChange(tabs[next].id);
              refs.current[next]?.focus();
            }}
            className={cx(
              "-mb-px flex h-11 min-w-0 flex-auto cursor-pointer items-center justify-center gap-1 border-b-2 px-1 text-[0.8125rem] whitespace-nowrap",
              selected ? "border-accent font-semibold text-ink" : "border-transparent text-ink-muted",
            )}
          >
            <span className="truncate">{t.label}</span>
            {t.count ? <span className="text-[0.6875rem] tabular-nums text-ink-muted">{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** "New poll" banner for students on another tab. Calm: no sound, no blinking. */
function PollBanner({ poll, onOpen, onDismiss }: { poll: Poll | null; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div aria-live="polite" className="shrink-0">
      {poll ? (
        <div className="flex items-stretch border-b border-line bg-accent-soft/60">
          <button type="button" onClick={onOpen} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 px-4 text-left text-ui-sm">
            <span className="font-semibold text-accent-strong">New poll</span>
            <span className="min-w-0 truncate">{poll.question}</span>
          </button>
          <button type="button" onClick={onDismiss} className="min-h-11 shrink-0 cursor-pointer px-3 text-ui-xs font-semibold text-ink-muted hover:text-ink">
            Dismiss<span className="sr-only"> the new poll notice</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Zoom details: tutors and admins only. Students never see Zoom. */
function ZoomBar({ cls }: { cls: ClassItem }) {
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(cls.zoom_passcode ?? "");
      toast("Passcode copied.");
    } catch {
      toast("Could not copy. Select the passcode and copy it by hand.", "error");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper-2 px-4 py-2 lg:border lg:px-4">
      {cls.zoom_url ? (
        <ButtonLink href={cls.zoom_url} external size="sm" className="max-lg:h-11">
          Join on Zoom
        </ButtonLink>
      ) : (
        <span className="text-ui-sm text-ink-muted">No Zoom link yet. The programme admin adds it in the class settings.</span>
      )}
      {cls.zoom_passcode ? (
        <span className="flex items-center gap-2 text-ui-sm">
          Passcode <span className="font-semibold tabular-nums select-all">{cls.zoom_passcode}</span>
          <button type="button" onClick={copy} className="min-h-11 cursor-pointer px-1 text-ui-xs font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] lg:min-h-8">
            Copy<span className="sr-only"> the Zoom passcode</span>
          </button>
        </span>
      ) : null}
      <span className="text-ui-xs text-ink-muted max-sm:hidden">Only tutors and admins see this.</span>
    </div>
  );
}

/* ---------- The live class screen ---------- */

function LiveClass({ data, reload }: { data: Data; reload: () => void }) {
  const me = useMe();
  const toast = useToast();
  const c = data.class;
  const teach = data.can_teach;
  const isStudent = me.role === "student";
  const isAdmin = me.role === "admin" || me.role === "super_admin";
  const base = isStudent ? "/student" : "/tutor";
  const desktop = useDesktop();
  // The status shown follows the clock, like the player: live inside the class window.
  const now = useNow(c.starts_at);
  const phase = classPhase(c, now);
  const shownStatus = phase === "live" ? "live" : phase === "after" ? "ended" : "scheduled";
  // Tutors and admins always get live updates; students follow the class's live mode.
  const realtime = teach || c.live_mode !== "light";

  const messages = useLiveMessages({ base, classId: c.id, realtime, seesHidden: isAdmin });
  const polls = usePolls({ base, classId: c.id, realtime, manager: teach });

  const [mainTab, setMainTab] = useState<MainTab>("about");
  const [liveTab, setLiveTab] = useState<LiveTab>("qa");
  const [mobileTab, setMobileTab] = useState<MobileTab>("qa");
  const [typing, setTyping] = useState(false);
  const visual = useVisualHeight(!desktop);
  // Toasts go to the top here, so they never cover the Q&A Send button.
  useEffect(() => {
    document.body.dataset.toasts = "top";
    return () => {
      delete document.body.dataset.toasts;
    };
  }, []);

  // A newly opened poll shows a banner for students who are on another tab. Polls already open
  // when the page loaded, or seen on the Polls tab, or dismissed, count as acknowledged.
  const onPolls = desktop ? liveTab === "polls" : mobileTab === "polls";
  const openPoll = polls.polls?.find((p) => p.status === "open") ?? null;
  const [acknowledged, setAcknowledged] = useState<Set<string> | null>(null);
  if (polls.polls && acknowledged === null) setAcknowledged(new Set(openPoll ? [openPoll.id] : []));
  if (openPoll && acknowledged && onPolls && !acknowledged.has(openPoll.id)) setAcknowledged(new Set([...acknowledged, openPoll.id]));
  const banner = !teach && openPoll && acknowledged && !acknowledged.has(openPoll.id) && !onPolls ? openPoll : null;
  const dismissBanner = () => {
    if (openPoll && acknowledged) setAcknowledged(new Set([...acknowledged, openPoll.id]));
  };
  const goToPolls = () => {
    dismissBanner();
    if (desktop) setLiveTab("polls");
    else setMobileTab("polls");
  };

  const qaCount = (messages.messages ?? []).filter((m) => !m.hidden).length;
  const pollCount = (polls.polls ?? []).length;

  async function setStatus(status: ClassItem["status"]) {
    const res = await api(`/tutor/classes/${c.id}`, { method: "PATCH", body: { status } });
    toast(res.ok ? (status === "live" ? "The class is marked live." : "The class is marked ended.") : res.error, res.ok ? "success" : "error");
    reload();
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/class/?id=${c.id}`);
      toast("Class link copied.");
    } catch {
      toast(`Copy this link: ${window.location.origin}/class/?id=${c.id}`, "error");
    }
  }

  // The on-screen keyboard is open when the visible height drops well below the full screen.
  const keyboardOpen = !desktop && typing && visual !== null && visual.height < visual.tallest * 0.8;
  const qa = <QAPanel base={base} classId={c.id} people={data.people} canTeach={teach} data={messages} onComposerFocus={setTyping} compact={keyboardOpen} dense={!desktop} />;
  const pollsPanel = <PollsPanel base={base} classId={c.id} data={polls} />;
  const about = (
    <AboutTab cls={c} status={shownStatus} people={data.people} teach={teach} isAdmin={isAdmin} base={base} showTitle={!desktop} onStatus={setStatus} onCopyLink={copyLink} withRecording={!desktop && teach} onSaved={reload} />
  );
  const materials = <Materials base={base} programmeId={c.programme_id} classId={c.id} canTeach={teach} />;
  const assessments = <AssessmentsTab data={data} isStudent={isStudent} onChange={reload} />;

  if (desktop) {
    return (
      <div className="grid grid-cols-[minmax(0,65fr)_minmax(17.5rem,35fr)] items-start gap-6 xl:gap-8">
        <div className="min-w-0">
          {isAdmin ? (
            <AdminBreadcrumbs
              items={[
                { label: "Courses", href: "/admin/programmes/" },
                { label: c.programme?.title ?? "Course", href: `/admin/programmes/view/?id=${c.programme_id}` },
                { label: c.title },
              ]}
            />
          ) : null}
          {teach ? (
            <div className="mb-4">
              <ZoomBar cls={c} />
            </div>
          ) : null}
          <Player cls={c} />
          <header className="mt-4">
            {c.programme?.title ? <p className="ui-label">{c.programme.title}</p> : null}
            <h1 className="mt-1 font-serif text-[clamp(1.75rem,2.6vw,2.5rem)] leading-tight">{c.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-ui-sm">
              <span>{formatClassTime(c.starts_at, c.ends_at)}</span>
              <StatusLabel status={shownStatus} />
            </p>
          </header>
          <div className="mt-6">
            <Tabs
              label="Class details"
              idPrefix="main-tab"
              value={mainTab}
              onChange={setMainTab}
              tabs={[
                { id: "about", label: "About" },
                { id: "materials", label: "Materials" },
                { id: "assessments", label: "Assessments", count: data.assessments.length },
                { id: "recording", label: "Recording" },
              ]}
            />
          </div>
          <div className="mt-6">
            {mainTab === "about" ? about : null}
            {mainTab === "materials" ? materials : null}
            {mainTab === "assessments" ? assessments : null}
            {mainTab === "recording" ? <RecordingTab cls={c} teach={teach} onSaved={reload} /> : null}
          </div>
        </div>

        <aside aria-label="Live" className="sticky top-6 flex h-[calc(100dvh-3rem)] min-h-[28rem] flex-col border border-line bg-paper">
          <h2 className="shrink-0 px-4 pt-3 font-serif text-ui-lg">Live</h2>
          <PollBanner poll={banner} onOpen={goToPolls} onDismiss={dismissBanner} />
          <div className="shrink-0 px-4">
            <Tabs
              label="Live"
              idPrefix="live-tab"
              value={liveTab}
              onChange={setLiveTab}
              tabs={[
                { id: "qa", label: "Q&A", count: qaCount },
                { id: "polls", label: "Polls", count: pollCount },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1">{liveTab === "qa" ? qa : pollsPanel}</div>
        </aside>
      </div>
    );
  }

  // Phones and tablets: one column sized to the visible screen. The player stays at the top,
  // one tab bar under it, and in Q&A the composer sits at the bottom, above the keyboard.
  return (
    <div
      className="-mx-4 -my-8 flex flex-col overflow-hidden md:-mx-8"
      style={{ height: visual ? `calc(${visual.height}px - 4rem)` : "calc(100dvh - 4rem)" }}
    >
      {teach && !keyboardOpen ? <ZoomBar cls={c} /> : null}
      <div className="shrink-0 border-b border-line">
        <Player cls={c} compact={keyboardOpen} capHeight heading={<h1 className="truncate font-serif text-ui-lg leading-snug">{c.title}</h1>} />
      </div>
      {keyboardOpen ? null : (
        <MobileTabs
          value={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: "qa", label: "Q&A", count: qaCount },
            { id: "polls", label: "Polls", count: pollCount },
            { id: "about", label: "About" },
            { id: "materials", label: "Materials" },
            { id: "assessments", label: "Assessments", count: data.assessments.length },
          ]}
        />
      )}
      <PollBanner poll={banner} onOpen={goToPolls} onDismiss={dismissBanner} />
      <div role="tabpanel" aria-labelledby={`m-tab-${mobileTab}`} className="min-h-0 flex-1">
        {mobileTab === "qa" ? qa : null}
        {mobileTab === "polls" ? pollsPanel : null}
        {mobileTab === "about" || mobileTab === "materials" || mobileTab === "assessments" ? (
          <div className="h-full overflow-y-auto overscroll-contain px-4 py-5">
            {mobileTab === "about" ? about : mobileTab === "materials" ? materials : assessments}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */

function AboutTab({
  cls: c,
  status,
  people,
  teach,
  isAdmin,
  base,
  showTitle,
  withRecording,
  onStatus,
  onCopyLink,
  onSaved,
}: {
  cls: ClassItem;
  status: ClassItem["status"];
  people: People;
  teach: boolean;
  isAdmin: boolean;
  base: string;
  showTitle: boolean;
  withRecording: boolean;
  onStatus: (s: ClassItem["status"]) => void;
  onCopyLink: () => void;
  onSaved: () => void;
}) {
  return (
    <section aria-label="About this class" className="max-w-measure space-y-8">
      <div className="space-y-4">
        {showTitle ? (
          <p className="flex flex-wrap items-center gap-3 text-ui-sm">
            <span>{formatClassTime(c.starts_at, c.ends_at)}</span>
            <StatusLabel status={status} />
          </p>
        ) : null}
        {c.description ? <p className="whitespace-pre-wrap">{c.description}</p> : <p className="text-ink-muted">No description for this class.</p>}
      </div>
      {teach ? (
        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          {c.status !== "live" ? (
            <Button size="sm" variant="secondary" className="max-lg:h-11" onClick={() => onStatus("live")}>
              Mark as live
            </Button>
          ) : null}
          {c.status !== "ended" ? (
            <Button size="sm" variant="secondary" className="max-lg:h-11" onClick={() => onStatus("ended")}>
              Mark as ended
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" className="max-lg:h-11" onClick={onCopyLink}>
            Copy class link
          </Button>
          {isAdmin ? (
            <ButtonLink href={`/admin/classes/edit/?id=${c.id}`} variant="secondary" size="sm" className="max-lg:h-11">
              Class settings
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
      {withRecording ? (
        <div className="border-t border-line pt-6">
          <RecordingTab cls={c} teach={teach} onSaved={onSaved} />
        </div>
      ) : null}
      <div className="border-t border-line pt-6">
        <h2 className="font-serif text-ui-lg">Announcements</h2>
        <div className="mt-4">
          <Announcements base={base} programmeId={c.programme_id} classId={c.id} canTeach={teach} />
        </div>
      </div>
      <div className="border-t border-line pt-6">
        <h2 className="font-serif text-ui-lg">Discussion</h2>
        <div className="mt-4">
          <Discussion base={base} programmeId={c.programme_id} classId={c.id} people={people} canTeach={teach} />
        </div>
      </div>
    </section>
  );
}

function RecordingTab({ cls: c, teach, onSaved }: { cls: ClassItem; teach: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState(c.recording_url ?? "");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api(`/tutor/classes/${c.id}`, { method: "PATCH", body: { recording_url: value } });
    setBusy(false);
    toast(res.ok ? "Recording link saved." : res.error, res.ok ? "success" : "error");
    if (res.ok) onSaved();
  }
  return (
    <section aria-label="Recording" className="max-w-2xl space-y-6">
      <p className="text-ink-muted">
        {c.recording_id ? "The recording plays in the player once the class has ended." : "The recording will appear here after the class."}
      </p>
      {teach ? (
        <form onSubmit={save} className="space-y-4">
          <TextField label="Recording link" hint="Any YouTube link: watch, youtu.be or /live/. The video must be Unlisted, with embedding allowed." placeholder="https://youtu.be/…" value={value} onChange={(e) => setValue(e.target.value)} />
          <Button type="submit" size="sm" className="max-lg:h-11" loading={busy} loadingText="Saving…">
            Save recording link
          </Button>
        </form>
      ) : null}
    </section>
  );
}

function AssessmentsTab({ data, isStudent, onChange }: { data: Data; isStudent: boolean; onChange: () => void }) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const c = data.class;
  if (isStudent) return <StudentAssessments items={data.assessments as StudentAssessment[]} onChange={onChange} />;
  return (
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
            onChange();
          }}
        />
      ) : data.assessments.length ? (
        <Button size="sm" onClick={() => setCreating(true)}>
          New assessment for this class
        </Button>
      ) : null}
      <AssessmentTable items={data.assessments as Assessment[]} classes={[c]} emptyAction={creating ? undefined : <Button onClick={() => setCreating(true)}>New assessment</Button>} />
    </div>
  );
}

/* ---------- Route ---------- */

function ClassPage() {
  const me = useMe();
  const id = useSearchParams().get("id") ?? "";
  const base = me.role === "student" ? "/student" : "/tutor";
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(id ? "" : "No class was chosen.");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    api<Data>(`${base}/classes/${encodeURIComponent(id)}`).then((res) => {
      if (res.ok) setData(res.data);
      else setError(res.error === "Not found." ? "This class is not part of your courses." : res.error);
    });
  }, [base, id, reloadKey]);

  if (error && !data) {
    return <EmptyState title="Class not available." text={error} action={<ButtonLink href={homeFor(me.role)} variant="secondary">Back to your dashboard</ButtonLink>} />;
  }
  if (!data) return <SkeletonPage />;
  return <LiveClass data={data} reload={() => setReloadKey((k) => k + 1)} />;
}

export default function ClassRoute() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <ClassPage />
    </Suspense>
  );
}
