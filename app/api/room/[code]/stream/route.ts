import { NextRequest } from "next/server";
import { autoAdvance } from "@/lib/engine";
import { getStore } from "@/lib/store";
import { playerView, tvView } from "@/lib/views";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const STREAM_LIFETIME_MS = 55000;
const POLL_MS = 450;
const PRESENCE_EVERY_MS = 5000;

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await ctx.params;
  const code = rawCode.toUpperCase();
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const store = getStore();

  const first = await store.get(code);
  if (!first) return new Response("room not found", { status: 404 });
  const isHost = token === first.state.hostToken;
  const playerId = isHost
    ? null
    : first.state.players.find((p) => p.token === token)?.id ?? null;
  if (!isHost && !playerId) return new Response("not seated", { status: 403 });
  const clientId = isHost ? "host" : playerId!;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      controller.enqueue(encoder.encode("retry: 800\n\n"));
      let lastPayload = "";
      let lastPresence = 0;
      const startedAt = Date.now();
      let aborted = false;
      req.signal.addEventListener("abort", () => (aborted = true));

      try {
        while (!aborted && Date.now() - startedAt < STREAM_LIFETIME_MS) {
          const now = Date.now();
          if (now - lastPresence > PRESENCE_EVERY_MS) {
            lastPresence = now;
            await store.touchSeen(code, clientId, now);
          }
          const row = await store.get(code);
          if (!row) {
            send(JSON.stringify({ error: "expired" }));
            break;
          }
          let state = row.state;
          // lazily advance scripted beats whose TV never acked
          const advanced = autoAdvance(state, now);
          if (advanced) {
            if (await store.update(code, row.version, { ...advanced, updatedAt: now })) {
              state = advanced;
            }
          }
          const seen = await store.getSeen(code);
          const view = isHost ? tvView(state, seen, now) : playerView(state, playerId!, seen, now);
          if (view) {
            // serverNow churns every tick; only resend when the rest changed
            const { serverNow, ...rest } = view as unknown as {
              serverNow: number;
            } & Record<string, unknown>;
            const payload = JSON.stringify(rest);
            if (payload !== lastPayload) {
              lastPayload = payload;
              send(JSON.stringify(view));
            }
          }
          await new Promise((r) => setTimeout(r, POLL_MS));
        }
      } catch {
        // client went away mid-write — nothing to do
      }
      try {
        controller.close();
      } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
