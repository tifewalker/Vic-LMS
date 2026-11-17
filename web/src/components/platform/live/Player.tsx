"use client";

import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

/* ---- YouTube IFrame API, loaded once per page ---- */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host: string;
      videoId: string;
      playerVars: Record<string, number>;
      events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: () => void };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const BUFFERING = 3;
let apiLoading: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiLoading ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiLoading = null;
      reject(new Error("YouTube player did not load"));
    };
    document.head.appendChild(script);
  });
  return apiLoading;
}

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const mm = String(Math.floor((t % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const controlButton = "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-paper/15 focus-visible:outline-2 focus-visible:outline-paper";

/**
 * The YouTube player with YouTube's own controls switched off and a layer on top that takes
 * every click, so students cannot use YouTube's title link, "Copy link", share or logo to
 * leave the app with the link. Our own controls sit at the bottom: play or pause, sound,
 * a seek bar for recordings, and full screen. Note: the video ID still reaches the browser,
 * so a determined person with developer tools can find it; this removes the easy ways.
 */
function Frame({ id, title, live }: { id: string; title: string; live: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [state, setState] = useState(-1);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Frame renders only in the browser (class data is fetched there), so document is available.
  const [canFullscreen] = useState(() => typeof document !== "undefined" && Boolean(document.fullscreenEnabled));
  const [fullscreen, setFullscreen] = useState(false);
  const playing = state === PLAYING || state === BUFFERING;

  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;
    const mount = document.createElement("div");
    hostRef.current?.appendChild(mount);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId: id,
          // controls 0: no YouTube control bar or logo link. disablekb: no YouTube shortcuts.
          playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: () => {
              if (cancelled || !player) return;
              playerRef.current = player;
              setReady(true);
              setDuration(player.getDuration());
            },
            onStateChange: (e) => setState(e.data),
            onError: () => setFailed(true),
          },
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      playerRef.current = null;
      player?.destroy();
      mount.remove();
    };
  }, [id]);

  // The iframe YouTube creates gets a proper title for screen readers, and cannot take focus:
  // keyboard users use our controls instead.
  useEffect(() => {
    const frame = ready ? playerRef.current?.getIframe() : null;
    if (!frame) return;
    frame.title = title;
    frame.tabIndex = -1;
  }, [ready, title]);

  // Recording position, once a second while it plays.
  useEffect(() => {
    if (live || state !== PLAYING) return;
    const timer = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setTime(p.getCurrentTime());
      setDuration(p.getDuration());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [live, state]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === PLAYING) return p.pauseVideo();
    p.playVideo();
    // Some phones only start a video from outside the frame when it is muted. If it has not
    // started after a moment, start it muted; the sound button turns it back on.
    window.setTimeout(() => {
      const q = playerRef.current;
      if (!q || [PLAYING, BUFFERING].includes(q.getPlayerState())) return;
      q.mute();
      setMuted(true);
      q.playVideo();
    }, 1500);
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) p.unMute();
    else p.mute();
    setMuted(!p.isMuted());
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else wrapRef.current?.requestFullscreen().catch(() => {});
  }

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
        <p className="max-w-sm text-ui-sm">This video cannot play here. Refresh the page, or ask the tutor to check the video allows embedding.</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-ink text-paper">
      <div ref={hostRef} aria-hidden={!ready || undefined} className="absolute inset-0 [&>iframe]:size-full [&>iframe]:border-0" />

      {/* Takes every click on the video, so nothing inside YouTube's frame can be used. */}
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} aria-hidden="true" />

      {/* While stopped YouTube shows its title bar with "Copy link" at the top: cover it. */}
      {!playing ? <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-ink" aria-hidden="true" /> : null}

      {ready && !playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={state === -1 || state === 5 ? "Play" : "Resume"}
          className="absolute top-1/2 left-1/2 z-20 flex size-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm bg-ink/80 hover:bg-ink focus-visible:outline-2 focus-visible:outline-paper"
        >
          <Play aria-hidden="true" className="size-8" fill="currentColor" />
        </button>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-20 flex h-11 items-center gap-1 bg-ink/85 px-1">
        <button type="button" onClick={togglePlay} disabled={!ready} aria-label={playing ? "Pause" : "Play"} className={controlButton}>
          {playing ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5" />}
        </button>
        <button type="button" onClick={toggleMute} disabled={!ready} aria-label={muted ? "Turn sound on" : "Mute"} aria-pressed={muted} className={controlButton}>
          {muted ? <VolumeX aria-hidden="true" className="size-5" /> : <Volume2 aria-hidden="true" className="size-5" />}
        </button>
        {live ? (
          <span className="flex-1 px-2 text-ui-xs font-semibold tracking-wide uppercase">Live</span>
        ) : (
          <>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(duration))}
              step={1}
              value={Math.floor(time)}
              disabled={!ready || !duration}
              onChange={(e) => {
                const s = Number(e.target.value);
                setTime(s);
                playerRef.current?.seekTo(s, true);
              }}
              aria-label="Position in the recording"
              aria-valuetext={`${clock(time)} of ${clock(duration)}`}
              className="h-11 min-w-0 flex-1 cursor-pointer accent-paper"
            />
            <span className="shrink-0 px-1 text-ui-xs tabular-nums">
              {clock(time)} / {clock(duration)}
            </span>
          </>
        )}
        {canFullscreen ? (
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"} className={controlButton}>
            {fullscreen ? <Minimize aria-hidden="true" className="size-5" /> : <Maximize aria-hidden="true" className="size-5" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The class video: a 16:9 YouTube embed (youtube-nocookie) with our own controls. Before the
 * class it shows the start time and a countdown, and loads the player only from 10 minutes
 * before the start or when the viewer taps. During the class: the stream and a calm "Live now"
 * label. After: the recording, or a note that it will appear. No link to YouTube is shown.
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
          <Frame key={videoId} id={videoId} title={title} live={phase !== "after"} />
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
      </div>
    </div>
  );
}
