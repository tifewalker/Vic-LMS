"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useModerationSignal } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

/**
 * Data for the live class screen. Tutors and admins always get live updates. Students follow
 * the class's live_mode: "realtime" (Supabase Realtime) or "light" (a refresh every 25 seconds,
 * no open socket, for weak connections).
 */
export const LIGHT_REFRESH_MS = 25_000;

export type LiveMessage = {
  id: string;
  class_id: string;
  author_id: string;
  body: string;
  is_question: boolean;
  answered: boolean;
  pinned: boolean;
  pinned_at: string | null;
  reply_to: string | null;
  created_at: string;
  hidden?: boolean;
};

export type PollOption = { id: string; label: string; position: number; votes: number | null; percent: number | null };
export type Poll = {
  id: string;
  class_id: string;
  question: string;
  status: "draft" | "open" | "closed";
  show_results: "after_vote" | "after_close";
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
  my_vote: string | null;
  results_visible: boolean;
  total_votes: number | null;
  options: PollOption[];
};

/** Runs `fn` every LIGHT_REFRESH_MS while the tab is visible, and once when it becomes visible again. */
function useLightRefresh(enabled: boolean, fn: () => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    const timer = window.setInterval(tick, LIGHT_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled]);
}

const byTime = (a: LiveMessage, b: LiveMessage) => a.created_at.localeCompare(b.created_at);

export function useLiveMessages({ base, classId, realtime, seesHidden }: { base: string; classId: string; realtime: boolean; seesHidden: boolean }) {
  const [messages, setMessages] = useState<LiveMessage[] | null>(null);
  const [muted, setMuted] = useState(false);
  const [mutedIds, setMutedIds] = useState<string[]>([]);

  const load = useCallback(() => {
    api<{ messages: LiveMessage[]; muted: boolean; muted_ids?: string[] }>(`${base}/classes/${classId}/messages`).then((res) => {
      if (!res.ok) return setMessages((m) => m ?? []);
      setMessages([...res.data.messages].sort(byTime));
      setMuted(res.data.muted);
      setMutedIds(res.data.muted_ids ?? []);
    });
  }, [base, classId]);

  useEffect(() => {
    load();
    if (!realtime) return;
    // New and updated messages arrive straight from Supabase Realtime (RLS applies).
    const channel = supabase()
      .channel(`live-${classId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages", filter: `class_id=eq.${classId}` }, (payload) => {
        const row = payload.new as LiveMessage;
        if (!row?.id) return;
        setMessages((prev) => {
          const list = prev ?? [];
          if (row.hidden && !seesHidden) return list.filter((m) => m.id !== row.id);
          const i = list.findIndex((m) => m.id === row.id);
          if (i === -1) return [...list, row].sort(byTime);
          const next = [...list];
          next[i] = row;
          return next;
        });
      })
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [classId, seesHidden, load, realtime]);

  // Hides, unhides and mutes: reload, because a hidden row's update never reaches students.
  useModerationSignal(realtime ? [`mod:class:${classId}`] : [], load);
  useLightRefresh(!realtime, load);

  return { messages, muted, mutedIds, reload: load };
}

export function usePolls({ base, classId, realtime, manager }: { base: string; classId: string; realtime: boolean; manager: boolean }) {
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const pending = useRef<number | null>(null);

  const load = useCallback(() => {
    api<{ polls: Poll[]; can_manage: boolean }>(`${base}/classes/${classId}/polls`).then((res) => {
      if (!res.ok) return setPolls((p) => p ?? []);
      setPolls(res.data.polls);
      setCanManage(res.data.can_manage);
    });
  }, [base, classId]);

  /**
   * A broadcast arrives after every vote. Tutors reload almost at once; students wait a random
   * 0.5 to 3 seconds and fold several events into one request, so a class voting together does
   * not hit the API all at the same moment.
   */
  const onSignal = useCallback(() => {
    if (pending.current !== null) return;
    const delay = manager ? 400 : 500 + Math.random() * 2500;
    pending.current = window.setTimeout(() => {
      pending.current = null;
      load();
    }, delay);
  }, [load, manager]);

  useEffect(() => {
    load();
    return () => {
      if (pending.current !== null) window.clearTimeout(pending.current);
    };
  }, [load]);

  useModerationSignal(realtime ? [`polls:class:${classId}`] : [], onSignal);
  useLightRefresh(!realtime, load);

  return { polls, canManage, reload: load };
}
