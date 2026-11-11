"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileField, RadioGroup, TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { ACCEPT_MATERIALS, formatSize, openFile, uploadFile } from "@/lib/upload";

type Material = {
  id: string;
  class_id: string | null;
  title: string;
  description: string;
  kind: "file" | "link";
  file_type: string | null;
  file_size: number | null;
  url: string | null;
  week: number | null;
  created_at: string;
};

/** Learning materials for a programme or one class: grouped by week when set, otherwise newest first. */
export function Materials({ base, programmeId, classId = null, canTeach }: { base: string; programmeId: string; classId?: string | null; canTeach: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Material[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const q = classId ? `?class_id=${classId}` : "";
    api<{ materials: Material[] }>(`${base}/programmes/${programmeId}/materials${q}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setItems(res.data.materials);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [base, programmeId, classId, reloadKey]);

  async function remove(m: Material) {
    if (!(await confirm({ title: "Remove this material?", body: `"${m.title}" will no longer be available to students.`, confirmLabel: "Remove" }))) return;
    const res = await api(`${base}/materials/${m.id}`, { method: "DELETE" });
    if (res.ok) toast("Material removed.");
    else toast(res.error, "error");
    reload();
  }
  async function download(m: Material) {
    const problem = await openFile(`${base}/materials/${m.id}/file`);
    if (problem) toast(problem, "error");
  }

  const weeks = [...new Set((items ?? []).filter((m) => m.week).map((m) => m.week!))].sort((a, b) => a - b);
  const groups: { label: string | null; items: Material[] }[] = weeks.length
    ? [...weeks.map((w) => ({ label: `Week ${w}`, items: items!.filter((m) => m.week === w) })), { label: "Other materials", items: items!.filter((m) => !m.week) }].filter((g) => g.items.length)
    : [{ label: null, items: items ?? [] }];

  const addButton = canTeach ? <Button onClick={() => setAdding(true)}>Add material</Button> : null;

  return (
    <section aria-label="Materials" className="space-y-6">
      {canTeach && !adding && items?.length ? (
        <Button size="sm" onClick={() => setAdding(true)}>
          Add material
        </Button>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {adding ? (
        <MaterialForm
          base={base}
          programmeId={programmeId}
          classId={classId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            toast("Material added.");
            reload();
          }}
        />
      ) : null}

      {items === null && !error ? <SkeletonRows rows={3} /> : null}
      {items?.length === 0 && !adding ? (
        <EmptyState title="No materials yet." text={canTeach ? "Upload slides, handouts or links for students." : "Slides, handouts and links from your tutors will appear here."} action={addButton} />
      ) : null}
      {items?.length
        ? groups.map((g) => (
            <div key={g.label ?? "all"}>
              {g.label ? <h3 className="ui-label mb-2">{g.label}</h3> : null}
              <ul className="border-t border-line">
                {g.items.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-line py-4">
                    <div className="min-w-0 flex-1">
                      {m.kind === "file" ? (
                        <button type="button" onClick={() => download(m)} className="cursor-pointer text-left font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
                          {m.title}
                        </button>
                      ) : (
                        <a href={m.url!} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
                          {m.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                      <p className="mt-1 text-ui-xs text-ink-muted">
                        {m.kind === "file" ? [m.file_type, formatSize(m.file_size)].filter(Boolean).join(", ") : "Link"} · Added {formatDate(m.created_at)}
                      </p>
                      {m.description ? <p className="mt-2 max-w-measure whitespace-pre-wrap">{m.description}</p> : null}
                    </div>
                    {canTeach ? (
                      <Button variant="quiet" onClick={() => remove(m)}>
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))
        : null}
    </section>
  );
}

function MaterialForm({ base, programmeId, classId, onSaved, onCancel }: { base: string; programmeId: string; classId: string | null; onSaved: () => void; onCancel: () => void }) {
  const [kind, setKind] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [week, setWeek] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const common = { title, description, week: week ? Number(week) : null, class_id: classId };
    let body: Record<string, unknown> = { ...common, kind: "link", url };
    if (kind === "file") {
      if (!file) {
        setBusy(false);
        return setError("Choose a file.");
      }
      const up = await uploadFile(`${base}/programmes/${programmeId}/materials/upload-url`, file, "material");
      if ("error" in up) {
        setBusy(false);
        return setError(up.error);
      }
      body = { ...common, kind: "file", file_path: up.path, file_name: file.name, content_type: up.contentType, size: file.size };
    }
    const res = await api(`${base}/programmes/${programmeId}/materials`, { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onSaved();
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6 border border-line bg-paper p-6" noValidate>
      <h2 className="text-ui-md font-semibold">{classId ? "Add material for this class" : "Add material"}</h2>
      <RadioGroup legend="Type" name="kind" value={kind} onChange={setKind} options={[{ value: "file", label: "File" }, { value: "link", label: "Link" }]} />
      <TextField label="Title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
      {kind === "file" ? (
        <FileField label="File" hint="PDF, Word, PowerPoint, Excel, JPG or PNG, up to 10 MB." accept={ACCEPT_MATERIALS} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      ) : (
        <TextField label="Link" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
      )}
      <TextArea label="Description" optional rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <TextField label="Week" optional type="number" min={1} max={260} value={week} onChange={(e) => setWeek(e.target.value)} className="max-w-40" />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} loadingText="Saving…" disabled={!title.trim() || (kind === "file" ? !file : !url.trim())}>
          Add material
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
