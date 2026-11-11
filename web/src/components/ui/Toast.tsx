"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cx } from "@/lib/cx";

type Tone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: Tone; visible: boolean };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** Show a short notice in the bottom-right corner, e.g. toast("Saved."), toast(error, "error"). */
export const useToast = () => useContext(ToastContext);

/** Small notices for saved, sent and error messages. They fade in and out; no sliding. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone, visible: false }]);
    // Next frame: fade in. Errors stay longer.
    requestAnimationFrame(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, visible: true } : x))));
    const life = tone === "error" ? 7000 : 4000;
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, visible: false } : x))), life);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), life + 300);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => setToasts((all) => all.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cx(
        "pointer-events-auto flex items-start justify-between gap-4 rounded-sm border border-line border-l-2 bg-paper px-4 py-3 text-ui-sm text-ink transition-opacity duration-200",
        toast.tone === "error" && "border-l-accent-strong",
        toast.tone === "success" && "border-l-sage",
        toast.tone === "info" && "border-l-ink-muted",
        toast.visible ? "opacity-100" : "opacity-0",
      )}
    >
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} className="cursor-pointer text-ui-xs font-semibold text-ink-muted hover:text-ink">
        Close
      </button>
    </div>
  );
}
