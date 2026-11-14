"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClassList } from "@/components/platform/ClassList";
import { useMe } from "@/components/platform/RequireRole";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { Stats } from "@/components/ui/Stats";
import { api } from "@/lib/api";
import type { ClassItem } from "@/lib/types";

type Programme = { id: string; title: string; description: string; student_count: number };
type Data = { programmes: Programme[]; upcoming: ClassItem[] };

export default function TutorDashboard() {
  const me = useMe();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Data>("/tutor/programmes").then((res) => (res.ok ? setData(res.data) : setError(res.error)));
  }, []);

  const students = data?.programmes.reduce((n, p) => n + p.student_count, 0);

  return (
    <>
      <PageHeader kicker={me.tutor_id ? `Tutor · ${me.tutor_id}` : "Teaching"} title={`Welcome, ${me.full_name.split(" ")[0]}`} description="Your programmes and the classes coming up." />
      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}

      <div className="mt-8">
        <Stats
          label="Teaching"
          items={[
            { label: "My programmes", value: data?.programmes.length ?? null },
            { label: "Students", value: students ?? null },
            { label: "Upcoming classes", value: data?.upcoming.length ?? null },
          ]}
        />
      </div>

      <section className="mt-12" aria-labelledby="upcoming-title">
        <SectionTitle id="upcoming-title">Upcoming classes</SectionTitle>
        <div className="mt-4">
          <ClassList classes={data?.upcoming ?? null} showProgramme emptyText="Classes the programme admin schedules for you will appear here." />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="programmes-title">
        <SectionTitle id="programmes-title">My programmes</SectionTitle>
        <div className="mt-4">
          <DataTable
            caption="My programmes"
            rows={data?.programmes ?? null}
            rowKey={(p) => p.id}
            onRowClick={(p) => router.push(`/tutor/programme/?id=${p.id}`)}
            empty={<EmptyState title="No programmes yet." text="The programme admin will assign you to a programme." />}
            columns={[
              {
                key: "title",
                header: "Programme",
                primary: true,
                cell: (p) => (
                  <>
                    <a href={`/tutor/programme/?id=${p.id}`} className="font-semibold text-ink hover:text-accent-strong hover:underline">
                      {p.title}
                    </a>
                    <span className="block text-ui-xs text-ink-muted">{p.description}</span>
                  </>
                ),
              },
              { key: "students", header: "Students", numeric: true, cell: (p) => p.student_count },
            ]}
          />
        </div>
      </section>
    </>
  );
}
