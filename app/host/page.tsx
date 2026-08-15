"use client";

import { useEffect, useState } from "react";
import { TvApp } from "@/components/tv/TvApp";

interface HostCreds {
  code: string;
  hostToken: string;
}

export default function HostPage() {
  const [creds, setCreds] = useState<HostCreds | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not raise a court");
        return;
      }
      const next = { code: body.code, hostToken: body.hostToken };
      localStorage.setItem("court:host", JSON.stringify(next));
      setCreds(next);
    } catch {
      setError("Could not reach the realm — check the connection.");
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("court:host");
      if (raw) {
        setCreds(JSON.parse(raw));
        return;
      }
    } catch {}
    createRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main className="tv-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", display: "grid", gap: 16 }}>
          <div className="serif" style={{ font: "600 32px var(--font-serif)" }}>{error}</div>
          <button className="btn-gold" onClick={createRoom}>
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (!creds) {
    return (
      <main className="tv-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="kicker flame" style={{ color: "var(--gold)" }}>Raising the court…</div>
      </main>
    );
  }
  return (
    <TvApp
      code={creds.code}
      hostToken={creds.hostToken}
      onRoomLost={() => {
        localStorage.removeItem("court:host");
        setCreds(null);
        createRoom();
      }}
    />
  );
}
