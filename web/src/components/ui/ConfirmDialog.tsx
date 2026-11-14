"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "./Button";

type Request = { title: string; body?: string; confirmLabel: string };
type Pending = Request & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(r: Request) => Promise<boolean>>(async () => false);

/** const confirm = useConfirm(); if (await confirm({ title, body, confirmLabel })) { ... } */
export const useConfirm = () => useContext(ConfirmContext);

/**
 * One shared confirmation dialog (suspend, delete, release grades). A native modal <dialog>:
 * the page behind is inert, Escape cancels, focus is kept inside and returns afterwards.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const confirm = useCallback(
    (r: Request) =>
      new Promise<boolean>((resolve) => {
        returnFocus.current = document.activeElement as HTMLElement | null;
        setPending({ ...r, resolve });
      }),
    [],
  );

  useEffect(() => {
    const d = dialogRef.current;
    if (pending && d && !d.open) d.showModal();
  }, [pending]);

  function close(ok: boolean) {
    pending?.resolve(ok);
    dialogRef.current?.close();
    setPending(null);
    returnFocus.current?.focus();
  }

  // Keep Tab inside the dialog.
  function onKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab") return;
    const focusable = [...e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        aria-describedby={pending?.body ? "confirm-body" : undefined}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        onKeyDown={onKeyDown}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-sm border border-line bg-paper p-0 text-ink"
      >
        {pending ? (
          <div className="p-6">
            <h2 id="confirm-title" className="text-ui-md font-semibold">
              {pending.title}
            </h2>
            {pending.body ? (
              <p id="confirm-body" className="mt-2 text-ui-sm text-ink-muted">
                {pending.body}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => close(false)} autoFocus>
                Cancel
              </Button>
              <Button onClick={() => close(true)}>{pending.confirmLabel}</Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}
