"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClassForm } from "@/components/platform/ClassForm";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatClassTime } from "@/lib/dates";
import type { ClassItem } from "@/lib/types";

function EditClass() {
  const id = useSearchParams().get("id") ?? "";
  const toast = useToast();
  const confirm = useConfirm();
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [error, setError] = useState(id ? "" : "No class was chosen.");

  useEffect(() => {
    if (!id) return;
    api<{ class: ClassItem }>(`/admin/classes/${encodeURIComponent(id)}`).then((res) => (res.ok ? setCls(res.data.class) : setError(res.error)));
  }, [id]);

  if (error && !cls) return <Notice tone="error">{error}</Notice>;
  if (!cls) return <SkeletonPage />;
  const back = `/admin/programmes/view/?id=${cls.programme_id}`;

  async function remove() {
    if (!(await confirm({ title: "Delete this class?", body: "Its live Q&A, discussion and links are deleted too. This cannot be undone.", confirmLabel: "Delete class" }))) return;
    const res = await api(`/admin/classes/${cls!.id}`, { method: "DELETE" });
    if (res.ok) window.location.replace(back);
    else toast(res.error, "error");
  }

  return (
    <>
      <PageHeader
        kicker={cls.programme?.title ?? "Class"}
        title={cls.title}
        meta={
          <>
            <span>{formatClassTime(cls.starts_at, cls.ends_at)}</span>
            <StatusLabel status={cls.status} />
          </>
        }
        actions={
          <ButtonLink href={`/class/?id=${cls.id}`} variant="secondary">
            Open class page
          </ButtonLink>
        }
      />
      <div className="mt-8">
        <ClassForm existing={cls} onSaved={() => toast("Class saved.")} />
      </div>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-6">
        <a href={back} className="text-ui-sm font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
          Back to the programme
        </a>
        <Button variant="secondary" onClick={remove}>
          Delete this class
        </Button>
      </div>
    </>
  );
}

export default function EditClassPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <EditClass />
    </Suspense>
  );
}
