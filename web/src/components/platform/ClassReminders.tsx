"use client";

import { useEffect, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { currentSubscription, pushSupport, turnOffReminders, turnOnReminders, type PushSupport } from "@/lib/push";

/**
 * Two free ways to be reminded of classes, since the platform sends no email or SMS:
 * the phone's own calendar (a private timetable feed) and push notifications on this device.
 */
export function ClassReminders() {
  const toast = useToast();
  const [feed, setFeed] = useState<string | null>(null);
  const [feedError, setFeedError] = useState("");
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [on, setOn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState<"" | "on" | "off" | "test" | "reset">("");
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    api<{ url: string }>("/me/calendar").then((res) => (res.ok ? setFeed(res.data.url) : setFeedError(res.error)));
    // What this browser can do, and whether reminders are already on here.
    (async () => {
      const s = pushSupport();
      const sub = s === "supported" ? await currentSubscription() : null;
      return { s, sub, blocked: s === "supported" && Notification.permission === "denied" };
    })().then(({ s, sub, blocked }) => {
      setSupport(s);
      setOn(Boolean(sub));
      setBlocked(blocked);
    });
  }, []);

  const webcal = feed?.replace(/^https?:/, "webcal:") ?? "";
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;

  async function copy() {
    if (!feed) return;
    try {
      await navigator.clipboard.writeText(feed);
      toast("Calendar link copied.");
    } catch {
      toast("Could not copy. Press and hold the link to copy it.", "error");
    }
  }

  async function resetFeed() {
    setBusy("reset");
    const res = await api<{ url: string }>("/me/calendar/reset", { body: {} });
    setBusy("");
    if (!res.ok) return toast(res.error, "error");
    setFeed(res.data.url);
    toast("New link made. The old one no longer works: add the new one to your calendar.");
  }

  async function enable() {
    setBusy("on");
    setPushError("");
    const error = await turnOnReminders();
    setBusy("");
    if (error) {
      setPushError(error);
      setBlocked(Notification.permission === "denied");
      return;
    }
    setOn(true);
    toast("Reminders are on for this device.");
  }

  async function disable() {
    setBusy("off");
    await turnOffReminders();
    setBusy("");
    setOn(false);
    toast("Reminders are off for this device.");
  }

  async function test() {
    setBusy("test");
    const res = await api("/me/push/test", { body: {} });
    setBusy("");
    if (!res.ok) return setPushError(res.error);
    toast("Test sent. It should appear in a few seconds.");
  }

  return (
    <section aria-labelledby="reminders-title" className="border-y border-line py-6">
      <h2 id="reminders-title" className="text-ui-md font-semibold">
        Class reminders
      </h2>
      <p className="mt-1 max-w-measure text-ui-sm text-ink-muted">We do not send emails or text messages. Use one or both of these so you never miss a lecture.</p>

      <div className="mt-6 grid gap-y-8 lg:grid-cols-2 lg:gap-x-10">
        <div>
          <h3 className="font-semibold">Add the timetable to your phone&apos;s calendar</h3>
          <p className="mt-1 text-ui-sm text-ink-muted">
            Every class appears in your calendar with a reminder an hour before. New or moved classes update by themselves. Do this once.
          </p>
          {feedError ? (
            <Notice tone="error" className="mt-4">
              {feedError}
            </Notice>
          ) : !feed ? (
            <p className="mt-4 text-ui-sm text-ink-muted">Loading your calendar link…</p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={google} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
                  Add to Google Calendar
                </a>
                <a href={webcal} className={buttonClass("secondary")}>
                  Add to iPhone or Outlook calendar
                </a>
              </div>
              <p className="mt-4 text-ui-xs text-ink-muted">
                Or copy the link and add it in any calendar app as a calendar &ldquo;from URL&rdquo; or &ldquo;subscription&rdquo;. It is private to you; do not share it.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="secondary" onClick={copy}>
                  Copy link
                </Button>
                <Button size="sm" variant="quiet" onClick={resetFeed} loading={busy === "reset"} loadingText="Making a new link…">
                  Shared it by mistake? Make a new link
                </Button>
              </div>
              <p className="mt-3 text-ui-xs text-ink-muted">Google Calendar uses your own reminder setting (often 30 minutes) and can take a few hours to show changes.</p>
            </>
          )}
        </div>

        <div>
          <h3 className="font-semibold">Notifications on this device</h3>
          <p className="mt-1 text-ui-sm text-ink-muted">A notification about an hour before each class, even when this site is closed. Turn it on for each phone or computer you use.</p>
          <div className="mt-4">
            {support === null ? null : support === "ios-install-first" ? (
              <Notice>
                On an iPhone or iPad, first add this site to your Home Screen: tap the Share button in Safari, then &ldquo;Add to Home Screen&rdquo;. Open it from the Home Screen,
                log in and come back here to turn reminders on.
              </Notice>
            ) : support === "unsupported" ? (
              <Notice>This browser cannot show notifications. Use the calendar option, or open the site in Chrome.</Notice>
            ) : on ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-ui-sm font-semibold text-sage">Reminders are on for this device.</span>
                <Button size="sm" variant="secondary" onClick={test} loading={busy === "test"} loadingText="Sending…">
                  Send a test
                </Button>
                <Button size="sm" variant="quiet" onClick={disable} loading={busy === "off"} loadingText="Turning off…">
                  Turn off
                </Button>
              </div>
            ) : blocked ? (
              <Notice>Notifications are blocked for this site. Allow them in your browser&apos;s site settings (the icon beside the address), then reload this page.</Notice>
            ) : (
              <Button onClick={enable} loading={busy === "on"} loadingText="Turning on…">
                Turn on reminders
              </Button>
            )}
            {pushError ? (
              <Notice tone="error" className="mt-4">
                {pushError}
              </Notice>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
