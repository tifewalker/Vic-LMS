import { api } from "./api";
import { supabase } from "./supabase";

/** Up to 10 MB. The API and the storage bucket check type and size again. */
const MAX_BYTES = 10 * 1024 * 1024;
const TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** Assessments: PDF and Word. Materials: also slides, spreadsheets and images. */
const DOC_EXTS = ["pdf", "doc", "docx"];
const MATERIAL_EXTS = Object.keys(TYPE_BY_EXT);
type Kind = "document" | "material";

export const ACCEPT_FILES = DOC_EXTS.map((e) => `.${e}`).join(",");
export const ACCEPT_MATERIALS = MATERIAL_EXTS.map((e) => `.${e}`).join(",");

export function checkFile(file: File, kind: Kind = "document"): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(kind === "material" ? MATERIAL_EXTS : DOC_EXTS).includes(ext)) {
    return kind === "material"
      ? "Choose a PDF, Word, PowerPoint or Excel file, or a JPG or PNG image."
      : "Choose a PDF or Word document (.pdf, .doc or .docx).";
  }
  if (file.size > MAX_BYTES) return "The file is larger than 10 MB.";
  return null;
}

/** e.g. 2.4 MB, 380 KB */
export function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Asks the API for a signed upload URL (`endpoint`), then uploads straight to storage.
 * Returns the storage path to send back to the API, or an error message.
 */
export async function uploadFile(
  endpoint: string,
  file: File,
  kind: Kind = "document",
): Promise<{ path: string; contentType: string } | { error: string }> {
  const problem = checkFile(file, kind);
  if (problem) return { error: problem };
  const ext = file.name.split(".").pop()!.toLowerCase();
  const contentType = TYPE_BY_EXT[ext];
  const res = await api<{ path: string; token: string }>(endpoint, {
    body: { file_name: file.name, content_type: contentType, size: file.size },
  });
  if (!res.ok) return { error: res.error };
  const { error } = await supabase().storage.from("files").uploadToSignedUrl(res.data.path, res.data.token, file, { contentType });
  if (error) return { error: "The upload did not finish. Please try again." };
  return { path: res.data.path, contentType };
}

/**
 * Fetches a short-lived download link from the API and downloads the file.
 * The link is sent as an attachment, so following it saves the file and the page stays put.
 * No new tab: popups opened after waiting for the network get blocked, and would stay blank.
 */
export async function openFile(endpoint: string): Promise<string | null> {
  const res = await api<{ url: string }>(endpoint);
  if (!res.ok) return res.error;
  window.location.assign(res.data.url);
  return null;
}
