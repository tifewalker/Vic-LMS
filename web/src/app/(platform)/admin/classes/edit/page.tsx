"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClassForm } from "@/components/platform/ClassForm";
import { ConfirmButton } from "@/components/platform/ConfirmButton";
import { Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import type { ClassItem } from "@/lib/types";

function EditClass() {
  const id = useSearchParams().get("id") ?? "";
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [error, setError] = useState(id ? "" : "No class was chosen.");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ class: ClassItem }>(`/admin/classes/${encodeURIComponent(id)}`).then((res) => (res.ok ? setCls(res.data.class) : setError(res.error)));
  }, [id]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!cls) return <p className="text-ink-muted">Loading…</p>;
  const back = `/admin/programmes/view/?id=${cls.programme_id}`;

  return (
    <>
      <PageTitle kicker={cls.programme?.title ?? "Class"} title={`Edit: ${cls.title}`}>
        <a href={`/class/?id=${cls.id}`} className="text-[0.9375rem] font-semibold text-accent-strong hover:underline">
          Open class page
        </a>
      </PageTitle>
      {saved ? (
        <div className="mt-6">
          <Notice tone="success">Class saved.</Notice>
        </div>
      ) : null}
      <div className="mt-8">
        <ClassForm existing={cls} onSaved={() => setSaved(true)} />
      </div>
      <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-line pt-6">
        <a href={back} className="text-accent-strong hover:underline">
          Back to the programme
        </a>
        <ConfirmButton
          label="Delete this class"
          question="Delete the class, its live Q&A and discussion?"
          confirmLabel="Delete"
          onConfirm={async () => {
            const res = await api(`/admin/classes/${cls.id}`, { method: "DELETE" });
            if (res.ok) window.location.replace(back);
            else setError(res.error);
          }}
        />
      </div>
    </>
  );
}

export default function EditClassPage() {
  return (
    <Suspense>
      <EditClass />
    </Suspense>
  );
}
