import { cx } from "@/lib/cx";

/**
 * Small square-cornered status label: a tiny dot plus text, on a quiet tint from the palette.
 * Contrast is AA for every tone (ink-muted on paper-2, sage-strong on sage-soft, clay-strong on clay-soft).
 */
type Tone = "neutral" | "ink" | "sage" | "clay";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-muted",
  ink: "bg-line/50 text-ink",
  sage: "bg-sage-soft text-sage-strong",
  clay: "bg-accent-soft text-accent-strong",
};

const statuses: Record<string, { label: string; tone: Tone }> = {
  // accounts
  invited: { label: "Not activated", tone: "neutral" },
  active: { label: "Active", tone: "sage" },
  suspended: { label: "Suspended", tone: "clay" },
  // invitations
  pending: { label: "Waiting to send", tone: "neutral" },
  sent: { label: "Invite sent", tone: "ink" },
  activated: { label: "Activated", tone: "sage" },
  expired: { label: "Invite expired", tone: "clay" },
  // submissions
  not_submitted: { label: "Not submitted", tone: "neutral" },
  submitted: { label: "Submitted", tone: "ink" },
  late: { label: "Late", tone: "clay" },
  received_paper: { label: "Paper received", tone: "ink" },
  graded: { label: "Graded", tone: "sage" },
  // classes
  scheduled: { label: "Scheduled", tone: "neutral" },
  live: { label: "Live now", tone: "sage" },
  ended: { label: "Ended", tone: "neutral" },
  // assessments and posts
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "sage" },
  question: { label: "Question", tone: "clay" },
  answered: { label: "Answered", tone: "sage" },
  pinned: { label: "Pinned", tone: "clay" },
  tutor: { label: "Tutor", tone: "ink" },
  released: { label: "Released", tone: "sage" },
  unreleased: { label: "Not released", tone: "neutral" },
};

export function StatusLabel({ status, label, tone, className }: { status: string; label?: string; tone?: Tone; className?: string }) {
  const s = statuses[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-ui-xs font-semibold whitespace-nowrap", tones[tone ?? s.tone], className)}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {label ?? s.label}
    </span>
  );
}
