import { webUrl } from "../env.js";
import { admin } from "../supabase.js";
import { logError } from "./errors.js";
import { pushEnabled, pushTo } from "./push.js";

/**
 * Class reminders: about an hour before each class, a push notification goes to the students
 * and tutors of its course. Runs inside the API every minute (one API instance, see
 * deploy/aws/README.md). classes.reminder_sent_at makes each reminder go out once; moving a
 * class clears it so the new time gets a reminder too.
 */

export const REMINDER_MINUTES = 60;
const CHECK_EVERY_MS = 60 * 1000;

/** "14:00" in Nigeria time. */
export const lagosTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });

type Due = { id: string; title: string; topic: string | null; starts_at: string; ends_at: string; programme_id: string };

export async function sendDueReminders(now = new Date()): Promise<number> {
  const until = new Date(now.getTime() + REMINDER_MINUTES * 60 * 1000).toISOString();
  // Classes that started more than 10 minutes ago get no reminder (for example, the API was down).
  const since = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("classes")
    .select("id, title, topic, starts_at, ends_at, programme_id")
    .is("reminder_sent_at", null)
    .neq("status", "ended")
    .gt("starts_at", since)
    .lte("starts_at", until)
    .limit(50);
  if (error) throw error;

  let sent = 0;
  for (const c of data as Due[]) {
    // Claim the class first, so a reminder never goes out twice.
    const { data: claimed } = await admin.from("classes").update({ reminder_sent_at: now.toISOString() }).eq("id", c.id).is("reminder_sent_at", null).select("id");
    if (!claimed?.length) continue;

    const [{ data: students }, { data: tutors }] = await Promise.all([
      admin.from("programme_students").select("student_id").eq("programme_id", c.programme_id),
      admin.from("programme_tutors").select("tutor_id").eq("programme_id", c.programme_id),
    ]);
    const people = [...(students ?? []).map((s) => s.student_id), ...(tutors ?? []).map((t) => t.tutor_id)];
    const minutes = Math.max(0, Math.round((Date.parse(c.starts_at) - now.getTime()) / 60000));
    const when = minutes <= 1 ? "now" : minutes >= 55 ? "in 1 hour" : `in ${minutes} minutes`;
    sent += await pushTo(people, {
      title: `Class ${when}: ${c.title}`,
      body: `${c.topic ? `${c.topic}. ` : ""}${lagosTime(c.starts_at)} to ${lagosTime(c.ends_at)}. Tap to open the class.`,
      url: `${webUrl}/class/?id=${c.id}`,
      tag: `class-${c.id}`,
    });
  }
  return sent;
}

/** Starts the minute-by-minute check. Does nothing when push is not configured. */
export function startReminderLoop() {
  if (!pushEnabled) {
    console.log("[reminders] Push reminders are off: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to turn them on.");
    return;
  }
  let running = false;
  let lastError = 0;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const n = await sendDueReminders();
      if (n) console.log(`[reminders] Sent ${n} class reminder${n === 1 ? "" : "s"}.`);
    } catch (err) {
      // At most one log line an hour (for example, while a migration is not yet applied).
      if (Date.now() - lastError > 60 * 60 * 1000) {
        logError("class reminders", err);
        lastError = Date.now();
      }
    } finally {
      running = false;
    }
  };
  setInterval(tick, CHECK_EVERY_MS).unref();
  setTimeout(tick, 5000).unref();
}
