"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface RoomConnection<T> {
  view: T | null;
  fatal: string | null;
  toast: string | null;
  act: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
  clockOffset: number;
}

/** Subscribe to the room's SSE stream and expose an action poster. */
export function useRoom<T extends { serverNow: number }>(
  code: string | null,
  token: string | null
): RoomConnection<T> {
  const [view, setView] = useState<T | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!code || !token) return;
    let es: EventSource | null = null;
    let stopped = false;
    let failures = 0;

    const connect = () => {
      if (stopped) return;
      es = new EventSource(`/api/room/${code}/stream?token=${encodeURIComponent(token)}`);
      es.onopen = () => (failures = 0);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.error === "expired") {
            setFatal("This court has dissolved — the room expired.");
            es?.close();
            return;
          }
          offsetRef.current = data.serverNow - Date.now();
          setView(data as T);
        } catch {}
      };
      es.onerror = () => {
        // EventSource retries transient errors itself; a CLOSED stream (403/404) will not
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          failures++;
          if (failures > 4) {
            setFatal("Lost the court — the room may have expired.");
            return;
          }
          setTimeout(connect, 700 * failures);
        }
      };
    };
    connect();
    return () => {
      stopped = true;
      es?.close();
    };
  }, [code, token]);

  const act = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      if (!code || !token) return false;
      try {
        const res = await fetch(`/api/room/${code}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action, ...payload }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (toastTimer.current) clearTimeout(toastTimer.current);
          setToast(body.error ?? "The court refused that");
          toastTimer.current = setTimeout(() => setToast(null), 2600);
          return false;
        }
        return true;
      } catch {
        setToast("Connection faltered — try again");
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2600);
        return false;
      }
    },
    [code, token]
  );

  return { view, fatal, toast, act, clockOffset: offsetRef.current };
}
