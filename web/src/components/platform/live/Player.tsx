"use client";

import { useEffect, useState } from "react";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { cx } from "@/lib/cx";
import type { ClassItem } from "@/lib/types";

/** Load the player by itself only from this long before the start, to save students' data. */
const PRELOAD_MS = 10 * 60_000;

export type ClassPhase = "before" | "live" | "after";

/** Live when marked live, or scheduled and inside its time window. After when ended or past its end. */
export function classPhase(c: Pick<ClassItem, "status" | "starts_at" | "ends_at">, now: number): ClassPhase {
  if (c.status === "live") return "live";
  if (c.status === "ended" || now >= Date.parse(c.ends_at)) return "after";
  return now >= Date.parse(c.starts_at) ? "live" : "before";
}

export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** A clock that ticks every second in the hour before the start, otherwise every 30 seconds. */
export function useNow(startsAt: string) {
  const [now, setNow] = useState(() => Date.now());
  const until = Date.parse(startsAt) - now;
  const fast = until > -60_000 && until < 3600_000;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), fast ? 1000 : 30_000);
    return () => window.clearInterval(timer);
  }, [fast]);
  return now;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function startsAtText(iso: string) {
  if (isToday(iso)) return `Class starts at ${time(iso)}`;
  const day = new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return `Class starts at ${time(iso)} on ${day}`;
}

/** "in 2 h 05 min", "in 08:42" (the last hour, to the second), "in 3 days". */
function countdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(s / 86400);
  if (days >= 2) return `in ${days} days`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `in ${h} h ${String(m).padStart(2, "0")} min`;
  return `in ${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function Frame({ id, title }: { id: string; title: string }) {
  return (
    <iframe
      src={embedUrl(id)}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      className="absolute inset-0 size-full border-0"
    />
  );
}

/**
 * The class video: a 16:9 YouTube embed (youtube-nocookie). Before the class it shows the
 * start time and a countdown, and loads the player only from 10 minutes before the start or
 * when the viewer taps. During the class: the stream and a calm "Live now" label. After: the
 * recording, or a note that it will appear. A plain "Open on YouTube" link sits underneath.
 */
/** `heading` (phones): the class title, set in the row under the player to save height. */
export function Player({ cls, compact = false, capHeight = false, heading }: { cls: ClassItem; compact?: boolean; capHeight?: boolean; heading?: React.ReactNode }) {
  const now = useNow(cls.starts_at);
  const phase = classPhase(cls, now);
  const [tapped, setTapped] = useState(false);

  const videoId = phase === "after" ? cls.recording_id : cls.youtube_id;
  const autoload = phase !== "before" || Date.parse(cls.starts_at) - now <= PRELOAD_MS;
  const showFrame = Boolean(videoId) && (autoload || tapped);
  const title = phase === "after" ? `Recording: ${cls.title}` : `Class video: ${cls.title}`;

  return (
    <div>
      {/* On phones and tablets (capHeight) the 16:9 frame is at most 34% of the screen tall, so Q&A keeps room. */}
      <div
        className={cx(
          "relative overflow-hidden bg-ink text-paper",
          compact ? "h-[min(30dvh,56.25vw)] w-full" : "aspect-video w-full",
          capHeight && !compact && "mx-auto max-w-[calc(34dvh*16/9)]",
        )}
      >
        {showFrame && videoId ? (
          <Frame id={videoId} title={title} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            {phase === "before" ? (
              <>
                <p className="font-serif text-ui-lg sm:text-[1.5rem]">{startsAtText(cls.starts_at)}</p>
                <p className="text-ui-sm text-paper/80 tabular-nums" aria-live="off">
                  {countdown(Date.parse(cls.starts_at) - now)}
                </p>
                {videoId ? (
                  <button
                    type="button"
                    onClick={() => setTapped(true)}
                    className="mt-1 h-11 cursor-pointer rounded-sm border border-paper/50 px-4 text-ui-sm font-semibold hover:border-paper"
                  >
                    Load the player now
                  </button>
                ) : (
                  <p className="text-ui-xs text-paper/70">The video link will appear here before the class starts.</p>
                )}
              </>
            ) : phase === "live" ? (
              <p className="max-w-sm text-ui-sm">The class is live, but the video link has not been added yet. Check back in a moment.</p>
            ) : (
              <p className="max-w-sm text-ui-sm">The recording will appear here after the class.</p>
            )}
          </div>
        )}
      </div>

      <div className={cx("flex items-center gap-x-3 px-4 lg:px-0", heading ? "min-h-11 py-1" : "flex-wrap justify-between gap-y-1 py-2", compact && "sr-only")}>
        {heading ? <div className="min-w-0 flex-1">{heading}</div> : null}
        <span className="flex shrink-0 items-center gap-2">
          {phase === "live" ? <StatusLabel status="live" /> : phase === "after" ? <StatusLabel status="ended" label={cls.recording_id ? "Recording" : "Ended"} /> : null}
        </span>
        {videoId ? (
          <a
            href={watchUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center text-ui-xs font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong lg:min-h-0"
          >
            Open on YouTube
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
