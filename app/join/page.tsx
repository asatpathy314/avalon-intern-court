"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Controller } from "@/components/phone/Controller";

interface Creds {
  code: string;
  token: string;
  playerId: string;
  name: string;
}

function savedCreds(code: string): Creds | null {
  try {
    const raw = localStorage.getItem(`court:player:${code}`);
    return raw ? (JSON.parse(raw) as Creds) : null;
  } catch {
    return null;
  }
}

function JoinInner() {
  const params = useSearchParams();
  const urlCode = (params.get("code") ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  const [code, setCode] = useState(urlCode);
  const [name, setName] = useState("");
  const [creds, setCreds] = useState<Creds | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  // reconnection: a returning phone reclaims its seat without re-entering anything
  useEffect(() => {
    const tryResume = async () => {
      const candidate = urlCode ? savedCreds(urlCode) : lastCreds();
      if (!candidate) {
        setAutoTried(true);
        return;
      }
      const res = await fetch(`/api/room/${candidate.code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: candidate.token }),
      });
      if (res.ok) {
        setCreds(candidate);
      } else {
        localStorage.removeItem(`court:player:${candidate.code}`);
      }
      setAutoTried(true);
    };
    const lastCreds = (): Creds | null => {
      try {
        const last = localStorage.getItem("court:player:last");
        return last ? savedCreds(last) : null;
      } catch {
        return null;
      }
    };
    tryResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async () => {
    const c = code.toUpperCase();
    if (c.length !== 4) {
      setError("The code is four letters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const existing = savedCreds(c);
      const res = await fetch(`/api/room/${c}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, token: existing?.token }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "The court did not answer");
        return;
      }
      const next: Creds = { code: c, token: body.token, playerId: body.playerId, name };
      localStorage.setItem(`court:player:${c}`, JSON.stringify(next));
      localStorage.setItem("court:player:last", c);
      setCreds(next);
    } finally {
      setBusy(false);
    }
  };

  if (creds) {
    return (
      <Controller
        code={creds.code}
        token={creds.token}
        onLeave={() => {
          localStorage.removeItem(`court:player:${creds.code}`);
          localStorage.removeItem("court:player:last");
          setCreds(null);
        }}
      />
    );
  }

  if (!autoTried) {
    return (
      <main className="phone-screen" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="kicker">The Intern Court</div>
      </main>
    );
  }

  return (
    <main className="phone-screen" style={{ justifyContent: "center", gap: 18 }}>
      <div className="kicker" style={{ textAlign: "center" }}>
        The Intern Court
      </div>
      <h1
        className="serif"
        style={{ font: "700 32px var(--font-serif)", color: "var(--gold)", margin: 0, textAlign: "center" }}
      >
        Join the court
      </h1>
      <input
        className="court-input code-input"
        placeholder="CODE"
        value={code}
        maxLength={4}
        autoCapitalize="characters"
        autoCorrect="off"
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
      />
      <input
        className="court-input"
        placeholder="Your name"
        value={name}
        maxLength={14}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && join()}
      />
      {error && (
        <div style={{ color: "var(--evil-text)", font: "500 14px var(--font-body)", textAlign: "center" }}>
          {error}
        </div>
      )}
      <button className="btn-gold" onClick={join} disabled={busy || code.length !== 4 || !name.trim()}>
        Take your seat
      </button>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  );
}
