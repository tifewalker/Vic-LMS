import webpush from "web-push";
import { env } from "../env.js";
import { admin } from "../supabase.js";
import { logError } from "./errors.js";

/**
 * Browser push notifications (Web Push with VAPID keys). Free: the browser makers deliver them.
 * Off unless VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set.
 */

export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (pushEnabled) webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);

export type PushMessage = { title: string; body: string; url: string; tag?: string };

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Sends a message to every device of these people. Devices that are gone are forgotten. Returns how many got it. */
export async function pushTo(profileIds: string[], message: PushMessage): Promise<number> {
  if (!pushEnabled || !profileIds.length) return 0;
  const subs: Sub[] = [];
  for (let i = 0; i < profileIds.length; i += 200) {
    const { data, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, profile:profiles!inner(status)")
      .in("profile_id", profileIds.slice(i, i + 200))
      .eq("profile.status", "active");
    if (error) throw error;
    subs.push(...(data as unknown as Sub[]));
  }

  const payload = JSON.stringify(message);
  const gone: string[] = [];
  const sent: string[] = [];
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.all(
      subs.slice(i, i + 50).map(async (s) => {
        try {
          // A reminder an hour late is useless: let the push service drop it after 50 minutes.
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 50 * 60, urgency: "high" });
          sent.push(s.id);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.id);
          else logError("push send", err);
        }
      }),
    );
  }
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  if (sent.length) await admin.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).in("id", sent);
  return sent.length;
}
