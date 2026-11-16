import { z } from "zod";

/**
 * YouTube links. Admins paste whatever YouTube gives them; we keep the 11-character video ID
 * and a canonical watch link. Accepted:
 *   https://www.youtube.com/watch?v=ID (plus any other query parameters)
 *   https://youtu.be/ID
 *   https://www.youtube.com/live/ID
 *   https://www.youtube.com/embed/ID, https://www.youtube-nocookie.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   m.youtube.com and music.youtube.com variants, links without https://, or a bare ID
 */
const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be", "www.youtu.be"]);

export function youtubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;
  if (host.endsWith("youtu.be")) candidate = parts[0] ?? null;
  else if (parts[0] === "watch") candidate = url.searchParams.get("v");
  else if (["live", "embed", "shorts", "v"].includes(parts[0] ?? "")) candidate = parts[1] ?? null;
  return candidate && ID.test(candidate) ? candidate : null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const YOUTUBE_LINK_ERROR = "That is not a YouTube video link. Paste the link from the video's Share button, e.g. https://youtu.be/…";

/** A form field holding a YouTube link: "" clears it, anything else must be a YouTube video. Parses to the video ID. */
export const youtubeField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const id = youtubeId(v);
    if (!id) {
      ctx.addIssue({ code: "custom", message: YOUTUBE_LINK_ERROR });
      return z.NEVER;
    }
    return id;
  });

/** Column values for a parsed YouTube field: the video ID and a canonical watch link. */
export function youtubeColumns(kind: "youtube" | "recording", id: string | null | undefined): Record<string, string | null> {
  if (id === undefined) return {};
  return { [`${kind}_id`]: id, [`${kind}_url`]: id ? youtubeWatchUrl(id) : null };
}
