import { NextRequest, NextResponse } from "next/server";
import { GameError, addPlayer } from "@/lib/engine";
import { getStore, mutateRoom } from "@/lib/store";

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await ctx.params;
  const code = rawCode.toUpperCase();
  try {
    const body = await req.json();
    const store = getStore();
    const row = await store.get(code);
    if (!row) {
      return NextResponse.json(
        { error: "No court answers to that code" },
        { status: 404 }
      );
    }
    // rejoin: a returning token reclaims its seat in any phase
    if (body.token) {
      const existing = row.state.players.find((p) => p.token === body.token);
      if (existing) {
        return NextResponse.json({ playerId: existing.id, token: existing.token, code });
      }
    }
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    await mutateRoom(code, (s) => addPlayer(s, { id, token, name: String(body.name ?? "") }));
    return NextResponse.json({ playerId: id, token, code });
  } catch (e) {
    if (e instanceof GameError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
