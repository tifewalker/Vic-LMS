import type { Response } from "express";
import { env } from "../env.js";
import { admin, type Profile } from "../supabase.js";
import { isAdmin } from "./access.js";

/** Shown when a muted user tries to post. */
export const MUTED_MESSAGE =
  "Posting is paused on your account for now. You can still read everything. Contact the programme admin if you think this is a mistake.";

/** Replies 403 and returns true when the user is muted. Admins are never muted. */
export function refuseIfMuted(profile: Profile, res: Response): boolean {
  if (profile.chat_muted && !isAdmin(profile)) {
    res.status(403).json({ error: MUTED_MESSAGE, muted: true });
    return true;
  }
  return false;
}

export type ModerationAction =
  | "hide" | "unhide" | "mark_answered" | "mark_unanswered" | "pin" | "unpin" | "reply" | "mute" | "unmute";
export type TargetType = "live_message" | "thread" | "reply" | "user";

/** Writes one moderation_log row. Failures are logged, never thrown, so the action itself stands. */
export async function logModeration(adminId: string, action: ModerationAction, targetType: TargetType, targetId: string, reason?: string | null) {
  const { error } = await admin
    .from("moderation_log")
    .insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, reason: reason || null });
  if (error) console.error("moderation_log insert failed", error.message);
}

/**
 * Tells open pages to reload. Realtime row events cannot reach students for a row they are no
 * longer allowed to read (a hidden message), so after moderation we also send a broadcast on
 * a public channel. The payload carries no content, only what changed.
 *   topics: "mod:class:<id>", "mod:programme:<id>", "mod:thread:<id>", "mod:user:<id>"
 */
export async function broadcast(topics: string[], payload: Record<string, unknown>) {
  if (!topics.length) return;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: topics.map((topic) => ({ topic, event: "changed", payload, private: false })) }),
    });
    if (!res.ok) console.error("broadcast failed", res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.error("broadcast failed", e);
  }
}

/** "Live now": marked live, or scheduled and inside its time window. */
export function isLive(c: { status: string; starts_at: string; ends_at: string }, now = Date.now()) {
  if (c.status === "live") return true;
  return c.status === "scheduled" && Date.parse(c.starts_at) <= now && now < Date.parse(c.ends_at);
}
