# Avalon — The Intern Court

A mobile-first, two-screen web implementation of *The Resistance: Avalon*, played
Jackbox-style: one TV/desktop screen everyone watches, and each player's phone as a
private controller. Built from the design handoff in
`design_handoff_avalon_intern_court/` (not committed).

**Live:** https://avalon-intern-court.vercel.app

## How to play

1. Open the site on the TV / biggest browser in the room → **Create a Court**.
2. Players scan the QR (or go to `/join`) and enter the 4-letter code.
3. 5–10 players. The Game Master configures roles on the TV and begins the court.

## Architecture

- **Next.js (App Router)** on Vercel, **Upstash Redis** (Vercel Marketplace) for room
  state with compare-and-set versioning, in-memory store fallback for local dev.
- **Server-authoritative**: the full role map never leaves the server. Every client —
  including the TV — receives a per-viewer filtered view (`lib/views.ts`), so a photo
  of the TV can't leak anything.
- **Realtime** via Server-Sent Events (`/api/room/[code]/stream`); actions are POSTs
  reconciled server-side. Scripted TV beats (vote flip, quest card turns, the blade)
  are server-timestamped; the server refuses early advancement and auto-advances if
  the TV disappears.
- **Reconnection**: session tokens in `localStorage` reclaim the same seat after
  lock/refresh; a vanished TV pauses the game with a rejoin path.

## Key files

- `lib/engine.ts` — pure game rules (deal, propose, vote, quest, assassination)
- `lib/views.ts` — per-role information filtering (Merlin/Mistress/evil knowledge)
- `lib/store.ts` — Redis CAS store + dev memory store
- `components/tv/*` — TV screens (lobby, setup, round table, the dramatic beats)
- `components/phone/*` — one-decision-per-screen phone controllers

## Development

```bash
pnpm install
vercel env pull   # Upstash credentials (optional — falls back to in-memory)
pnpm dev
```

End-to-end flow test (drives a full 5-player game through the HTTP API):
see `scripts/e2e.mjs` — run a local server on :3999, then `node scripts/e2e.mjs`.
