"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** GETs an API path. Re-fetches when the path changes or reload() is called. */
export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData(res.data);
        setError("");
      } else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, error, reload };
}
