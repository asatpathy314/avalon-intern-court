import { NextResponse } from "next/server";
import { createRoom, GameError } from "@/lib/engine";
import { getStore } from "@/lib/store";
import { randomCode } from "@/lib/rules";

export async function POST() {
  const store = getStore();
  const hostToken = crypto.randomUUID();
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const state = createRoom(code, hostToken);
    if (await store.create(code, state)) {
      return NextResponse.json({ code, hostToken });
    }
  }
  return NextResponse.json(
    { error: new GameError("Could not seat a new court — try again").message },
    { status: 500 }
  );
}
