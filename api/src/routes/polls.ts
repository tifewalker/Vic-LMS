import type { Router } from "express";
import { z } from "zod";
import { canTeach, idParam, programmeAccess, zodMessage, type ProgrammeAccess } from "../lib/access.js";
import { broadcast } from "../lib/moderation.js";
import { admin } from "../supabase.js";

/**
 * Polls in a live class. Registered on both the tutor and the student routers.
 * The programme's tutors and admins create, open, close and delete polls; students vote once
 * while a poll is open. Results follow show_results: after_vote (once you have voted) or
 * after_close. Tutors and admins always see live results. Drafts never reach students.
 *
 * After every change the API broadcasts a content-free "changed" event on polls:class:<id>,
 * so open pages reload from here (students cannot read other students' votes, so row events
 * could not carry the counts).
 */

const POLL_COLUMNS = "id, class_id, question, status, show_results, created_at, opened_at, closed_at";

const pollBody = z.object({
  question: z.string().trim().min(1, "Write the question.").max(300, "Keep the question to 300 characters."),
  options: z
    .array(z.string().trim().max(120, "Keep each option to 120 characters."))
    .transform((list) => list.filter(Boolean))
    .pipe(z.array(z.string()).min(2, "Add at least 2 options.").max(5, "Use at most 5 options.")),
  show_results: z.enum(["after_vote", "after_close"]).default("after_vote"),
  open: z.boolean().default(false),
});

type PollRow = { id: string; class_id: string; question: string; status: "draft" | "open" | "closed"; show_results: "after_vote" | "after_close"; created_at: string; opened_at: string | null; closed_at: string | null };

const topic = (classId: string) => `polls:class:${classId}`;
/** Fire and forget: broadcast() logs its own failures, and the caller need not wait for it. */
const changed = (classId: string) => broadcast([topic(classId)], { kind: "poll" });

async function classAccess(profile: Parameters<typeof programmeAccess>[0], classId: string): Promise<ProgrammeAccess | null> {
  const { data } = await admin.from("classes").select("programme_id").eq("id", classId).maybeSingle();
  return data ? programmeAccess(profile, data.programme_id) : null;
}

async function pollWithAccess(profile: Parameters<typeof programmeAccess>[0], pollId: string) {
  const { data: poll } = await admin.from("polls").select(POLL_COLUMNS).eq("id", pollId).maybeSingle<PollRow>();
  if (!poll) return { poll: null, access: null };
  return { poll, access: await classAccess(profile, poll.class_id) };
}

/** Closes any open poll in the class, so a new one can open (one open poll per class). */
async function closeOpen(classId: string, except?: string) {
  let q = admin.from("polls").update({ status: "closed", closed_at: new Date().toISOString() }).eq("class_id", classId).eq("status", "open");
  if (except) q = q.neq("id", except);
  await q;
}

export function registerPollRoutes(router: Router) {
  router.get("/classes/:id/polls", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const access = await classAccess(req.profile!, id);
    if (!access) return res.status(404).json({ error: "Not found." });
    const teach = canTeach(access);

    let q = admin.from("polls").select(`${POLL_COLUMNS}, poll_options(id, label, position)`).eq("class_id", id).order("created_at", { ascending: false }).limit(50);
    if (!teach) q = q.neq("status", "draft");
    const { data: polls, error } = await q;
    if (error) throw error;
    const ids = (polls ?? []).map((p) => p.id);

    const [{ data: votes, error: vErr }, { data: mine, error: mErr }] = await Promise.all([
      ids.length ? admin.from("poll_votes").select("poll_id, option_id").in("poll_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? admin.from("poll_votes").select("poll_id, option_id").in("poll_id", ids).eq("student_id", req.profile!.id) : Promise.resolve({ data: [], error: null }),
    ]);
    if (vErr) throw vErr;
    if (mErr) throw mErr;
    const counts = new Map<string, number>();
    for (const v of votes ?? []) counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
    const myVote = new Map((mine ?? []).map((v) => [v.poll_id, v.option_id]));

    res.json({
      can_manage: teach,
      polls: (polls ?? []).map(({ poll_options, ...p }) => {
        const options = [...(poll_options as { id: string; label: string; position: number }[])].sort((a, b) => a.position - b.position);
        const my_vote = myVote.get(p.id) ?? null;
        const results_visible = teach || p.status === "closed" || (p.show_results === "after_vote" && my_vote !== null);
        const total = options.reduce((n, o) => n + (counts.get(o.id) ?? 0), 0);
        return {
          ...p,
          my_vote,
          results_visible,
          total_votes: results_visible ? total : null,
          options: options.map((o) => {
            const votes = counts.get(o.id) ?? 0;
            return results_visible ? { ...o, votes, percent: total ? Math.round((votes / total) * 100) : 0 } : { ...o, votes: null, percent: null };
          }),
        };
      }),
    });
  });

  router.post("/classes/:id/polls", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    if (!canTeach(await classAccess(req.profile!, id))) return res.status(403).json({ error: "Only tutors can create polls." });
    const body = pollBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    const { question, options, show_results, open } = body.data;

    if (open) await closeOpen(id);
    const now = new Date().toISOString();
    const { data: poll, error } = await admin
      .from("polls")
      .insert({ class_id: id, question, show_results, created_by: req.profile!.id, status: open ? "open" : "draft", opened_at: open ? now : null })
      .select("id")
      .single();
    if (error) throw error;
    const { error: oErr } = await admin.from("poll_options").insert(options.map((label, position) => ({ poll_id: poll.id, label, position })));
    if (oErr) {
      await admin.from("polls").delete().eq("id", poll.id);
      throw oErr;
    }
    void changed(id);
    res.status(201).json({ id: poll.id });
  });

  router.post("/polls/:id/open", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { poll, access } = await pollWithAccess(req.profile!, id);
    if (!poll || !canTeach(access)) return res.status(403).json({ error: "Only tutors can open polls." });
    if (poll.status !== "open") {
      await closeOpen(poll.class_id, id);
      const { error } = await admin.from("polls").update({ status: "open", opened_at: new Date().toISOString(), closed_at: null }).eq("id", id);
      if (error) throw error;
      void changed(poll.class_id);
    }
    res.json({ status: "open" });
  });

  router.post("/polls/:id/close", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { poll, access } = await pollWithAccess(req.profile!, id);
    if (!poll || !canTeach(access)) return res.status(403).json({ error: "Only tutors can close polls." });
    if (poll.status === "open") {
      const { error } = await admin.from("polls").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      void changed(poll.class_id);
    }
    res.json({ status: "closed" });
  });

  router.delete("/polls/:id", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const { poll, access } = await pollWithAccess(req.profile!, id);
    if (!poll || !canTeach(access)) return res.status(403).json({ error: "Only tutors can delete polls." });
    const { error } = await admin.from("polls").delete().eq("id", id);
    if (error) throw error;
    void changed(poll.class_id);
    res.json({ removed: true });
  });

  router.post("/polls/:id/vote", async (req, res) => {
    const id = idParam(req.params.id, res);
    if (!id) return;
    const body = z.object({ option_id: z.uuid("Choose an option.") }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: zodMessage(body.error) });
    const { poll, access } = await pollWithAccess(req.profile!, id);
    if (!poll || !access || poll.status === "draft") return res.status(404).json({ error: "Not found." });
    if (access !== "student") return res.status(403).json({ error: "Only students vote in polls." });
    if (poll.status !== "open") return res.status(409).json({ error: "This poll has closed." });

    const { error } = await admin.from("poll_votes").insert({ poll_id: id, option_id: body.data.option_id, student_id: req.profile!.id });
    if (error?.code === "23505") return res.status(409).json({ error: "You have already voted in this poll." });
    // The option must belong to this poll (composite foreign key).
    if (error?.code === "23503") return res.status(400).json({ error: "That option is not part of this poll." });
    if (error) throw error;
    void changed(poll.class_id);
    res.status(201).json({ option_id: body.data.option_id });
  });
}
