import { randomUUID } from "node:crypto";
import { z } from "zod";
import { admin } from "../supabase.js";

/**
 * Files live in the private "files" bucket. Browsers only ever get short-lived signed URLs.
 * The bucket also enforces the type and size limits on upload.
 */
const BUCKET = "files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const DOC_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

/** Learning materials also allow slides, spreadsheets and images. */
const MATERIAL_TYPES: Record<string, string[]> = {
  ...DOC_TYPES,
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const metaFor = (types: Record<string, string[]>, message: string) =>
  z
    .object({
      file_name: z.string().trim().min(1).max(200),
      content_type: z.string(),
      size: z.number().int().positive().max(MAX_FILE_BYTES, "Files can be up to 10 MB."),
    })
    .refine((f) => (types[f.content_type] ?? []).some((ext) => f.file_name.toLowerCase().endsWith(ext)), message);

/** Assessment briefs and submissions: PDF and Word only. */
export const fileMeta = metaFor(DOC_TYPES, "Upload a PDF or Word document (.pdf, .doc or .docx).");

export const materialFileMeta = metaFor(
  MATERIAL_TYPES,
  "Upload a PDF, Word, PowerPoint or Excel file, or a JPG or PNG image.",
);

/** Lowercase, safe file name for storage paths. Keeps the extension. */
function safeName(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned.slice(-80) || "file";
}

/** A one-time signed upload URL under `prefix/`. The browser uploads with uploadToSignedUrl. */
export async function signedUpload(prefix: string, fileName: string) {
  const path = `${prefix}/${randomUUID().slice(0, 8)}-${safeName(fileName)}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("Could not create an upload URL.");
  return { path: data.path, token: data.token, signed_url: data.signedUrl };
}

/** A download URL valid for 5 minutes, or null if the file does not exist. */
export async function signedDownload(path: string): Promise<string | null> {
  const name = path.split("/").pop()?.replace(/^[0-9a-f]{8}-/, "") ?? "file";
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 300, { download: name });
  return error || !data ? null : data.signedUrl;
}

/** True if a file was actually uploaded at `path`. */
export async function fileExists(path: string): Promise<boolean> {
  return (await signedDownload(path)) !== null;
}

/** Deletes a stored file. Missing files are ignored. */
export async function removeFile(path: string): Promise<void> {
  await admin.storage.from(BUCKET).remove([path]);
}

export const materialPrefix = (programmeId: string) => `materials/${programmeId}`;
export const assessmentPrefix = (assessmentId: string) => `assessments/${assessmentId}`;
export const submissionPrefix = (assessmentId: string, studentId: string) => `submissions/${assessmentId}/${studentId}`;
