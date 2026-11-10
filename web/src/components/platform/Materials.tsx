"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { ACCEPT_MATERIALS, formatSize, openFile, uploadFile } from "@/lib/upload";
import { ConfirmButton } from "./ConfirmButton";
import { Button, Field, Notice } from "./ui";

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

/**
 * Learning materials for a programme, or one class when classId is set.
 * Grouped by week when weeks are set, otherwise newest first. Tutors and admins add and remove.
 */
export function Materials({ base, programmeId, classId = null, canTeach }: { base: string; programmeId: string; classId?: string | null; canTeach: boolean }) {
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
    const res = await api(`${base}/materials/${m.id}`, { method: "DELETE" });
    if (!res.ok) setError(res.error);
    reload();
  }

  // Group by week (ascending); materials without a week go last, newest first.
  const weeks = [...new Set((items ?? []).filter((m) => m.week).map((m) => m.week!))].sort((a, b) => a - b);
  const groups: { label: string | null; items: Material[] }[] = weeks.length
    ? [
        ...weeks.map((w) => ({ label: `Week ${w}`, items: items!.filter((m) => m.week === w) })),
        { label: "Other materials", items: items!.filter((m) => !m.week) },
      ].filter((g) => g.items.length)
    : [{ label: null, items: items ?? [] }];

  return (
    <section aria-label="Materials">
      {canTeach && !adding ? (
        <Button size="sm" onClick={() => setAdding(true)}>
          Add material
        </Button>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      {adding ? (
        <MaterialForm
          base={base}
          programmeId={programmeId}
          classId={classId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
        />
      ) : null}

      {items === null && !error ? <p className="mt-4 text-ink-muted">Loading…</p> : null}
      {items?.length === 0 ? <p className="mt-4 border-t border-line py-4 text-ink-muted">No materials yet.</p> : null}
      {groups.map((g) =>
        g.items.length ? (
          <div key={g.label ?? "all"} className="mt-5">
            {g.label ? <h3 className="text-lg">{g.label}</h3> : null}
            <ul className="mt-2 border-t border-line">
              {g.items.map((m) => (
                <li key={m.id} className="grid gap-1 border-b border-line py-3 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                  <div className="min-w-0">
                    {m.kind === "file" ? (
                      <Button variant="quiet" className="text-left" onClick={async () => setError((await openFile(`${base}/materials/${m.id}/file`)) ?? "")}>
                        {m.title}
                      </Button>
                    ) : (
                      <a href={m.url!} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-strong underline decoration-accent/45 underline-offset-[0.22em]">
                        {m.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    )}
                    <p className="text-sm text-ink-muted">
                      {m.kind === "file" ? [m.file_type, formatSize(m.file_size)].filter(Boolean).join(", ") : "Link"} · Added {formatDate(m.created_at)}
                    </p>
                    {m.description ? <p className="mt-1 max-w-measure text-[0.9375rem] whitespace-pre-wrap">{m.description}</p> : null}
                  </div>
                  {canTeach ? <ConfirmButton label="Remove" question="Remove this material?" confirmLabel="Remove" onConfirm={() => remove(m)} /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}

function MaterialForm({
  base,
  programmeId,
  classId,
  onSaved,
  onCancel,
}: {
  base: string;
  programmeId: string;
  classId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
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
    <form onSubmit={save} className="mt-4 max-w-2xl space-y-4 border border-line p-4" noValidate>
      <h3 className="text-xl">{classId ? "Add material for this class" : "Add material"}</h3>
      <fieldset>
        <legend className="text-[0.9375rem] font-semibold">Type</legend>
        <div className="mt-2 flex gap-6">
          {(["file", "link"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} className="size-4 accent-[var(--accent)]" />
              {k === "file" ? "File" : "Link"}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      {kind === "file" ? (
        <label className="block">
          <span className="block text-[0.9375rem] font-semibold">File</span>
          <span className="block text-sm text-ink-muted">PDF, Word, PowerPoint, Excel, JPG or PNG, up to 10 MB.</span>
          <input
            type="file"
            accept={ACCEPT_MATERIALS}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-[0.9375rem] file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-paper file:px-4 file:py-2 file:font-semibold file:text-ink"
          />
        </label>
      ) : (
        <Field label="Link" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
      )}
      <label className="block">
        <span className="block text-[0.9375rem] font-semibold">Description (optional)</span>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 block w-full rounded-sm border border-line bg-white px-3 py-2.5 text-base" />
      </label>
      <Field label="Week (optional)" type="number" min={1} max={260} value={week} onChange={(e) => setWeek(e.target.value)} className="max-w-40" />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={busy || !title.trim() || (kind === "file" ? !file : !url.trim())}>
          {busy ? "Saving…" : "Add material"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
