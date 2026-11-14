"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/platform/RequireRole";
import { ButtonLink } from "@/components/ui/Button";
import { useNavData } from "@/components/ui/NavData";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { Stats } from "@/components/ui/Stats";
import { api } from "@/lib/api";

type Summary = {
  students: number;
  tutors: number;
  invited: number;
  active: number;
  suspended: number;
  pendingInvites: number;
  emailsRemainingToday: number;
  programmes: number;
  studentsNotEnrolled: number;
  upcomingClasses: number;
  email: {
    provider: "smtp" | "resend" | "console";
    cap: number;
    warmupDay: number | null;
    sentToday: number;
    remainingToday: number;
    ratePerMinute: number;
    queued: { activation: number; other: number };
    failed24h: number;
    bounced24h: number;
  };
};

const PROVIDER = { smtp: "SMTP", resend: "Resend", console: "Console (not sending)" } as const;

export default function AdminDashboard() {
  const me = useMe();
  const [s, setS] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const { data: nav } = useNavData();
  const e = s?.email;

  useEffect(() => {
    api<Summary>("/admin/summary").then((res) => (res.ok ? setS(res.data) : setError(res.error)));
  }, []);

  return (
    <>
      <PageHeader
        kicker={me.role === "super_admin" ? "Super admin" : "Admin"}
        title={`Welcome, ${me.full_name.split(" ")[0]}`}
        description="Programmes, people and invitations at a glance."
        actions={
          <>
            <ButtonLink href="/admin/users/import/" variant="secondary">
              Import students
            </ButtonLink>
            <ButtonLink href="/admin/programmes/">Programmes</ButtonLink>
          </>
        }
      />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}

      <section className="mt-8" aria-labelledby="now-title">
        <SectionTitle id="now-title">Right now</SectionTitle>
        <div className="mt-4">
          <Stats
            label="Right now"
            items={[
              { label: "Live now", value: nav.loaded ? nav.live.length : null, href: "/admin/live/" },
              { label: "Unanswered questions", value: nav.loaded ? nav.unanswered_live + nav.unanswered_threads : null, href: nav.unanswered_live || !nav.unanswered_threads ? "/admin/live/" : "/admin/discussions/" },
              { label: "Ungraded submissions", value: nav.loaded ? nav.ungraded : null, href: "/admin/assessments/" },
            ]}
          />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="teaching-title">
        <SectionTitle id="teaching-title">Teaching</SectionTitle>
        <div className="mt-4">
          <Stats
            label="Teaching"
            items={[
              { label: "Active programmes", value: s?.programmes ?? null, href: "/admin/programmes/" },
              { label: "Upcoming classes", value: s?.upcomingClasses ?? null },
              { label: "Students not in a programme", value: s?.studentsNotEnrolled ?? null, href: "/admin/users/?role=student" },
            ]}
          />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="people-title">
        <SectionTitle id="people-title">People</SectionTitle>
        <div className="mt-4">
          <Stats
            label="People"
            items={[
              { label: "Students", value: s?.students ?? null, href: "/admin/users/?role=student" },
              { label: "Tutors", value: s?.tutors ?? null, href: "/admin/users/?role=tutor" },
              { label: "Active", value: s?.active ?? null },
              { label: "Not activated", value: s?.invited ?? null, href: "/admin/users/?status=invited" },
              { label: "Suspended", value: s?.suspended ?? null, href: "/admin/users/?status=suspended" },
            ]}
          />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="email-title">
        <SectionTitle id="email-title">Email</SectionTitle>
        <p className="mt-1 text-ui-sm text-ink-muted">
          {e
            ? `${PROVIDER[e.provider]}. ${e.warmupDay ? `Warm-up day ${e.warmupDay} of 10, so today's cap is ${e.cap}.` : `Daily cap ${e.cap}.`} Up to ${e.ratePerMinute} a minute. Activation emails go first.`
            : " "}
        </p>
        <div className="mt-4">
          <Stats
            label="Email"
            items={[
              { label: "Sent today", value: e ? `${e.sentToday} / ${e.cap}` : null },
              { label: "Activation emails queued", value: e?.queued.activation ?? null, href: "/admin/users/?status=invited" },
              { label: "Other emails queued", value: e?.queued.other ?? null },
              { label: "Failed, last 24 hours", value: e?.failed24h ?? null },
              { label: "Bounced, last 24 hours", value: e?.bounced24h ?? null },
            ]}
          />
        </div>
        {e && e.failed24h + e.bounced24h > 0 ? (
          <Notice tone="info" className="mt-4">
            Some emails did not go through in the last 24 hours. Failed sends are retried automatically. Bounced addresses need checking: fix the email on the person&apos;s account, then resend their invite.
          </Notice>
        ) : null}
      </section>
    </>
  );
}
