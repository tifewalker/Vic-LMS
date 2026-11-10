import { api } from "./api";
import { supabase } from "./supabase";

/** PDF and Word only, up to 10 MB. The API and the storage bucket check this again. */
export const ACCEPT_FILES =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 10 * 1024 * 1024;
const TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function checkFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!TYPE_BY_EXT[ext]) return "Choose a PDF or Word document (.pdf, .doc or .docx).";
  if (file.size > MAX_BYTES) return "The file is larger than 10 MB.";
  return null;
}

/**
 * Asks the API for a signed upload URL (`endpoint`), then uploads straight to storage.
 * Returns the storage path to send back to the API, or an error message.
 */
export async function uploadFile(endpoint: string, file: File): Promise<{ path: string } | { error: string }> {
  const problem = checkFile(file);
  if (problem) return { error: problem };
  const ext = file.name.split(".").pop()!.toLowerCase();
  const contentType = TYPE_BY_EXT[ext];
  const res = await api<{ path: string; token: string }>(endpoint, {
    body: { file_name: file.name, content_type: contentType, size: file.size },
  });
  if (!res.ok) return { error: res.error };
  const { error } = await supabase().storage.from("files").uploadToSignedUrl(res.data.path, res.data.token, file, { contentType });
  if (error) return { error: "The upload did not finish. Please try again." };
  return { path: res.data.path };
}

/** Fetches a short-lived download link from the API and opens it. */
export async function openFile(endpoint: string): Promise<string | null> {
  const res = await api<{ url: string }>(endpoint);
  if (!res.ok) return res.error;
  window.open(res.data.url, "_blank", "noopener");
  return null;
}
