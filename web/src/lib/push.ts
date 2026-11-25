/** Browser push for class reminders: service worker registration and the device's subscription. */

import { api } from "./api";

export type PushSupport = "supported" | "ios-install-first" | "unsupported";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const apis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // iPhones only allow push for sites added to the Home Screen (iOS 16.4 and later).
  if (ios && !standalone) return "ios-install-first";
  return apis ? "supported" : "unsupported";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** This device's current subscription, if reminders are on here. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Asks for permission, subscribes this device and saves it on the API. Returns an error message or "". */
export async function turnOnReminders(): Promise<string> {
  const key = await api<{ publicKey: string | null }>("/push/key");
  if (!key.ok) return key.error;
  if (!key.data.publicKey) return "Reminders are not switched on yet. Please try again later.";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied"
      ? "Notifications are blocked for this site. Allow them in your browser's site settings, then try again."
      : "Notifications were not allowed. Try again and choose Allow.";
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key.data.publicKey) }));
    const res = await api("/me/push", { body: sub.toJSON() });
    return res.ok ? "" : res.error;
  } catch {
    return "This browser could not turn on reminders. Try Chrome, or add the site to your home screen first.";
  }
}

export async function turnOffReminders(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await api("/me/push", { method: "DELETE", body: { endpoint: sub.endpoint } });
  await sub.unsubscribe().catch(() => undefined);
}
