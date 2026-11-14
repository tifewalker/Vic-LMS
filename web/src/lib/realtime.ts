"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Moderation signals. After an admin hides a message or mutes someone, the API broadcasts a
 * content-free "changed" event on these channels so open pages reload from the API. Row events
 * alone cannot do this: a student is no longer allowed to read a hidden row, so its update never
 * reaches them.
 *   mod:class:<id>, mod:programme:<id>, mod:thread:<id>, mod:user:<id>
 *
 * Several components can listen to the same topic, so there is one channel per topic,
 * shared and closed when the last listener leaves.
 */
const shared = new Map<string, { channel: RealtimeChannel; listeners: Set<() => void> }>();

function listen(topic: string, fn: () => void): () => void {
  let entry = shared.get(topic);
  if (!entry) {
    const listeners = new Set<() => void>();
    const channel = supabase()
      .channel(topic)
      .on("broadcast", { event: "changed" }, () => listeners.forEach((l) => l()))
      .subscribe();
    entry = { channel, listeners };
    shared.set(topic, entry);
  }
  entry.listeners.add(fn);
  return () => {
    const e = shared.get(topic);
    if (!e) return;
    e.listeners.delete(fn);
    if (!e.listeners.size) {
      shared.delete(topic);
      supabase().removeChannel(e.channel);
    }
  };
}

export function useModerationSignal(topics: (string | null | undefined)[], onChange: () => void) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });
  const key = topics.filter(Boolean).join("|");

  useEffect(() => {
    if (!key) return;
    const fn = () => handler.current();
    const stops = key.split("|").map((topic) => listen(topic, fn));
    return () => stops.forEach((stop) => stop());
  }, [key]);
}
