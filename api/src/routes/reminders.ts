import { randomBytes } from "node:crypto";
import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { env, webUrl } from "../env.js";
import { buildCalendar } from "../lib/ics.js";
import { studentProgrammeIds, tutorProgrammeIds } from "../lib/nav.js";
import { pushEnabled, pushTo } from "../lib/push.js";
import { REMINDER_MINUTES } from "../lib/reminders.js";
import { requireAuth } from "../middleware/auth.js";
import { admin } from "../supabase.js";

/**
 * Class reminders without email:
 * - GET /calendar/<token>.ics: a private timetable feed that phone calendars subscribe to.
 * - /me/calendar: the signed-in user's feed link (and a way to replace it).
 * - /push/key and /me/push: browser push notifications, an hour before each class.
 */
export const remindersRouter = Router();

const limited = (limit: number) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: "draft-8", legacyHeaders: false });

/* ---------- Calendar feed ---------- */

const newToken = () => randomBytes(24).toString("base64url"); // 32 characters

function apiBase(req: Request) {
  return (env.API_PUBLIC_URL ?? `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

async function calendarToken(profileId: string, replace = false): Promise<string> {
  if (!replace) {
    const { data } = await admin.from("calendar_tokens").select("token").eq("profile_id", profileId).maybeSingle();
    if (data) return data.token;
  }
  const token = newToken();
  const { error } = await admin.from("calendar_tokens").upsert({ profile_id: profileId, token, created_at: new Date().toISOString() }, { onConflict: "profile_id" });
  if (error) throw error;
  return token;
}

remindersRouter.get("/me/calendar", requireAuth, async (req, res) => {
  const token = await calendarToken(req.profile!.id);
  res.json({ url: `${apiBase(req)}/calendar/${token}.ics` });
});

/** A new link stops the old one working (for a link shared by mistake). */
remindersRouter.post("/me/calendar/reset", requireAuth, limited(20), async (req, res) => {
  const token = await calendarToken(req.profile!.id, true);
  res.json({ url: `${apiBase(req)}/calendar/${token}.ics` });
});

/** Calendar apps poll this without signing in; the token in the address is the key. */
remindersRouter.get("/calendar/:file", limited(300), async (req, res) => {
  const token = /^([A-Za-z0-9_-]{32,64})\.ics$/.exec(String(req.params.file))?.[1];
  if (!token) return res.status(404).type("text/plain").send("Not found.");
  const { data: row } = await admin.from("calendar_tokens").select("profile:profiles!inner(id, role, status)").eq("token", token).maybeSingle();
  const profile = row?.profile as unknown as { id: string; role: string; status: string } | undefined;
  if (!profile || profile.status !== "active") return res.status(404).type("text/plain").send("Not found.");

  let programmeIds: string[] | null = null; // null: every course (admins)
  if (profile.role === "student") programmeIds = await studentProgrammeIds(profile.id);
  else if (profile.role === "tutor") programmeIds = await tutorProgrammeIds(profile.id);

  // From two months back, so recent classes stay visible, up to the end of the programme.
  const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  let classes: { id: string; title: string; topic: string | null; starts_at: string; ends_at: string; programme: unknown }[] = [];
  if (programmeIds === null || programmeIds.length) {
    let q = admin.from("classes").select("id, title, topic, starts_at, ends_at, programme:programmes(title)").gte("ends_at", from).order("starts_at").limit(1000);
    if (programmeIds) q = q.in("programme_id", programmeIds);
    const { data, error } = await q;
    if (error) return res.status(500).type("text/plain").send("Could not load the timetable.");
    classes = data;
  }

  const ics = buildCalendar({
    name: "OAUSTECH training timetable",
    events: classes.map((c) => {
      const course = (c.programme as { title: string } | null)?.title;
      const link = `${webUrl}/class/?id=${c.id}`;
      return {
        uid: `${c.id}@crystalinnovationhub.com.ng`,
        start: c.starts_at,
        end: c.ends_at,
        title: c.title,
        description: [course, c.topic && `Topic: ${c.topic}`, `Open the class: ${link}`].filter(Boolean).join("\n"),
        url: link,
        alarmMinutes: REMINDER_MINUTES,
      };
    }),
  });
  res.set("Cache-Control", "private, max-age=300");
  res.type("text/calendar; charset=utf-8").send(ics);
});

/* ---------- Push notifications ---------- */

remindersRouter.get("/push/key", (_req, res) => {
  res.json({ publicKey: pushEnabled ? env.VAPID_PUBLIC_KEY : null });
});

const subscription = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith("https://"), "Push endpoint must be https."),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

remindersRouter.post("/me/push", requireAuth, limited(60), async (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: "Reminders are not switched on yet. Please try again later." });
  const body = subscription.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "This browser sent an invalid subscription. Try again." });
  const { endpoint, keys } = body.data;
  // One row per device; a device that signs in as someone else moves to that person.
  const { error } = await admin
    .from("push_subscriptions")
    .upsert({ profile_id: req.profile!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, created_at: new Date().toISOString() }, { onConflict: "endpoint" });
  if (error) return res.status(500).json({ error: "Could not turn on reminders. Please try again." });
  res.status(201).json({ on: true });
});

remindersRouter.delete("/me/push", requireAuth, async (req, res) => {
  const body = z.object({ endpoint: z.string().max(1000) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request." });
  await admin.from("push_subscriptions").delete().eq("endpoint", body.data.endpoint).eq("profile_id", req.profile!.id);
  res.json({ on: false });
});

/** A test notification to the signed-in user's own devices. */
remindersRouter.post("/me/push/test", requireAuth, limited(10), async (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: "Reminders are not switched on yet." });
  const sent = await pushTo([req.profile!.id], {
    title: "Reminders are on",
    body: `You will get a notification about ${REMINDER_MINUTES} minutes before each class.`,
    url: `${webUrl}/`,
    tag: "test",
  });
  if (!sent) return res.status(404).json({ error: "No device with reminders turned on was found. Turn them on again." });
  res.json({ sent });
});
