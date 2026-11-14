import type { Request, Response, Router } from "express";
import { z } from "zod";
import { canTeach, idParam, programmeAccess, zodMessage } from "../lib/access.js";
import { fileExists, materialFileMeta, materialPrefix, removeFile, signedDownload, signedUpload } from "../lib/files.js";
import { admin } from "../supabase.js";

/**
 * Announcements and learning materials. Registered on both the tutor and the student routers:
 * reading needs enrolment (or admin); writing needs to teach the programme (or admin).
 */

const ANNOUNCEMENT_COLUMNS = "id, programme_id, class_id, author_id, title, body, pinned, created_at";
const MATERIAL_COLUMNS = "id, programme_id, class_id, title, description, kind, file_type, file_size, url, week, created_at";

async function readable(req: Request, res: Response, programmeId: string | null | undefined) {
  if (!programmeId || !(await programmeAccess(req.profile!, programmeId))) {
    res.status(404).json({ error: "Not found." });
    return false;
  }
  return true;
}
async function writable(req: Request, res: Response, programmeId: string | null | undefined) {
  if (!programmeId || !canTeach(await programmeAccess(req.profile!, programmeId))) {
    res.status(403).json({ error: "Only the programme's tutors and admins can change this." });
    return false;
  }
  return true;
}
async function classBelongs(classId: string | null | undefined, programmeId: string) {
  if (!classId) return true;
  const { data } = await admin.from("classes").select("programme_id").eq("id", classId).maybeSingle();
  return data?.programme_id === programmeId;
}
/** ?class_id=<id> limits to one class; otherwise everything in the programme. */
const classFilter = (req: Request) => {
  const c = z.uuid().safeParse(req.query.class_id);
  return c.success ? c.data : null;
};

const announcementFields = z.object({
  title: z.string().trim().min(1, "Add a title.").max(200),
  body: z.string().trim().min(1, "Write the announcement.").max(10000),
  pinned: z.boolean(),
  class_id: z.uuid().nullable(),
});

const url = z.url("Use a full link starting with https://").refine((u) => /^https?:\/\//i.test(u), "Use a full link starting with https://");
const materialBase = z.object({
  title: z.string().trim().min(1, "Add a title.").max(200),
  description: z.string().trim().max(2000),
  week: z.coerce.number().int().min(1).max(260).nullable(),
  class_id: z.uuid().nullable(),
});
const materialCreate = z.discriminatedUnion("kind", [
  materialBase.partial().required({ title: true }).extend({
    kind: z.literal("file"),
    file_path: z.string().max(500),
    file_name: z.string().max(200),
    content_type: z.string(),
    size: z.number().int().positive(),
  }),
  materialBase.partial().required({ title: true }).extend({ kind: z.literal("link"), url }),
]);

export function registerContentRoutes(router: Router) {
  /* ---------- Announcements ---------- */

  router.get("/programmes/:id/announcements", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id || !(await readable(req, res, id))) return;
    let q = admin
      .from("announcements")
      .select(ANNOUNCEMENT_COLUMNS)
      .eq("programme_id", id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    const classId = classFilter(req);
    if (classId) q = q.eq("class_id", classId);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: "Could not load announcements." });
    res.json({ announcements: data });
  });

  router.post("/programmes/:id/announcements", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id || !(await writable(req, res, id))) return;
    const body = announcementFields.partial().required({ title: true, body: true }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    if (!(await classBelongs(body.data.class_id, id))) return res.status(400).json({ error: "That class is not part of this programme." });
    const { data, error } = await admin
      .from("announcements")
      .insert({ pinned: false, class_id: null, ...body.data, programme_id: id, author_id: req.profile!.id })
      .select("id")
      .single();
    if (error) return res.status(500).json({ error: "Could not post the announcement." });
    res.status(201).json({ id: data.id });
  });

  router.patch("/announcements/:id", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { data: a } = await admin.from("announcements").select("programme_id").eq("id", id).maybeSingle();
    if (!(await writable(req, res, a?.programme_id))) return;
    const body = announcementFields.partial().safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    if (!(await classBelongs(body.data.class_id, a!.programme_id))) return res.status(400).json({ error: "That class is not part of this programme." });
    await admin.from("announcements").update(body.data).eq("id", id);
    res.json({ id });
  });

  router.delete("/announcements/:id", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { data: a } = await admin.from("announcements").select("programme_id").eq("id", id).maybeSingle();
    if (!(await writable(req, res, a?.programme_id))) return;
    await admin.from("announcements").delete().eq("id", id);
    res.json({ removed: true });
  });

  /* ---------- Materials ---------- */

  router.get("/programmes/:id/materials", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id || !(await readable(req, res, id))) return;
    let q = admin.from("materials").select(MATERIAL_COLUMNS).eq("programme_id", id).order("created_at", { ascending: false }).limit(300);
    const classId = classFilter(req);
    if (classId) q = q.eq("class_id", classId);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: "Could not load materials." });
    res.json({ materials: data });
  });

  router.post("/programmes/:id/materials/upload-url", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id || !(await writable(req, res, id))) return;
    const meta = materialFileMeta.safeParse(req.body);
    if (!meta.success) return res.status(400).json({ error: zodMessage(meta.error) });
    res.json(await signedUpload(materialPrefix(id), meta.data.file_name));
  });

  router.post("/programmes/:id/materials", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id || !(await writable(req, res, id))) return;
    const body = materialCreate.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    const m = body.data;
    if (!(await classBelongs(m.class_id, id))) return res.status(400).json({ error: "That class is not part of this programme." });

    const row: Record<string, unknown> = {
      programme_id: id,
      class_id: m.class_id ?? null,
      title: m.title,
      description: m.description ?? "",
      week: m.week ?? null,
      kind: m.kind,
      uploaded_by: req.profile!.id,
    };
    if (m.kind === "file") {
      const meta = materialFileMeta.safeParse({ file_name: m.file_name, content_type: m.content_type, size: m.size });
      if (!meta.success) return res.status(400).json({ error: zodMessage(meta.error) });
      if (!m.file_path.startsWith(`${materialPrefix(id)}/`) || !(await fileExists(m.file_path))) {
        return res.status(400).json({ error: "Upload the file first." });
      }
      Object.assign(row, { file_path: m.file_path, file_type: m.file_name.split(".").pop()!.toUpperCase(), file_size: m.size });
    } else {
      row.url = m.url;
    }
    const { data, error } = await admin.from("materials").insert(row).select("id").single();
    if (error) return res.status(500).json({ error: "Could not save the material." });
    res.status(201).json({ id: data.id });
  });

  router.patch("/materials/:id", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { data: m } = await admin.from("materials").select("programme_id").eq("id", id).maybeSingle();
    if (!(await writable(req, res, m?.programme_id))) return;
    const body = materialBase.partial().safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    if (!(await classBelongs(body.data.class_id, m!.programme_id))) return res.status(400).json({ error: "That class is not part of this programme." });
    await admin.from("materials").update(body.data).eq("id", id);
    res.json({ id });
  });

  router.delete("/materials/:id", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { data: m } = await admin.from("materials").select("programme_id, file_path").eq("id", id).maybeSingle();
    if (!(await writable(req, res, m?.programme_id))) return;
    await admin.from("materials").delete().eq("id", id);
    if (m!.file_path) await removeFile(m!.file_path);
    res.json({ removed: true });
  });

  router.get("/materials/:id/file", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { data: m } = await admin.from("materials").select("programme_id, file_path").eq("id", id).maybeSingle();
    if (!(await readable(req, res, m?.programme_id))) return;
    const link = m!.file_path ? await signedDownload(m!.file_path) : null;
    if (!link) return res.status(404).json({ error: "File not found." });
    res.json({ url: link });
  });
}
