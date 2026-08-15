import { Redis } from "@upstash/redis";
import type { GameState } from "./types";
import { ROOM_TTL_SECONDS } from "./rules";
import { GameError } from "./engine";

export interface RoomStore {
  get(code: string): Promise<{ state: GameState; version: number } | null>;
  /** create iff absent; false if the code is taken */
  create(code: string, state: GameState): Promise<boolean>;
  /** compare-and-set; false on version conflict */
  update(code: string, expectedVersion: number, state: GameState): Promise<boolean>;
  touchSeen(code: string, clientId: string, now: number): Promise<void>;
  getSeen(code: string): Promise<Record<string, number>>;
}

/* ---------- in-memory store (local dev, single process) ---------- */

interface MemRoom {
  state: GameState;
  version: number;
  seen: Record<string, number>;
}

const g = globalThis as unknown as { __courtRooms?: Map<string, MemRoom> };
const memRooms = (g.__courtRooms ??= new Map<string, MemRoom>());

const memoryStore: RoomStore = {
  async get(code) {
    const r = memRooms.get(code);
    return r ? { state: r.state, version: r.version } : null;
  },
  async create(code, state) {
    if (memRooms.has(code)) return false;
    memRooms.set(code, { state, version: 1, seen: {} });
    return true;
  },
  async update(code, expectedVersion, state) {
    const r = memRooms.get(code);
    if (!r || r.version !== expectedVersion) return false;
    r.state = state;
    r.version = expectedVersion + 1;
    return true;
  },
  async touchSeen(code, clientId, now) {
    const r = memRooms.get(code);
    if (r) r.seen[clientId] = now;
  },
  async getSeen(code) {
    return memRooms.get(code)?.seen ?? {};
  },
};

/* ---------- Upstash Redis store ---------- */

const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[2])
if (cur == false and ARGV[1] == '0') or cur == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
  redis.call('SET', KEYS[2], ARGV[4], 'EX', tonumber(ARGV[3]))
  return 1
end
return 0
`;

function redisStore(redis: Redis): RoomStore {
  const kState = (c: string) => `court:${c}:state`;
  const kVer = (c: string) => `court:${c}:ver`;
  const kSeen = (c: string) => `court:${c}:seen`;
  return {
    async get(code) {
      const [state, ver] = await Promise.all([
        redis.get<GameState>(kState(code)),
        redis.get<string | number>(kVer(code)),
      ]);
      if (!state || ver == null) return null;
      return { state, version: Number(ver) };
    },
    async create(code, state) {
      const ok = await redis.eval(
        CAS_SCRIPT,
        [kState(code), kVer(code)],
        ["0", JSON.stringify(state), String(ROOM_TTL_SECONDS), "1"]
      );
      return ok === 1;
    },
    async update(code, expectedVersion, state) {
      const ok = await redis.eval(
        CAS_SCRIPT,
        [kState(code), kVer(code)],
        [
          String(expectedVersion),
          JSON.stringify(state),
          String(ROOM_TTL_SECONDS),
          String(expectedVersion + 1),
        ]
      );
      return ok === 1;
    },
    async touchSeen(code, clientId, now) {
      await redis.hset(kSeen(code), { [clientId]: now });
      await redis.expire(kSeen(code), ROOM_TTL_SECONDS);
    },
    async getSeen(code) {
      const h = await redis.hgetall<Record<string, number>>(kSeen(code));
      return h ?? {};
    },
  };
}

let _store: RoomStore | null = null;
export function getStore(): RoomStore {
  if (!_store) {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      _store = redisStore(Redis.fromEnv({ enableAutoPipelining: true }));
    } else {
      _store = memoryStore;
    }
  }
  return _store;
}

/** Load-mutate-CAS with retries. Throws GameError('Room not found') if absent. */
export async function mutateRoom(
  code: string,
  fn: (state: GameState) => GameState
): Promise<GameState> {
  const store = getStore();
  for (let attempt = 0; attempt < 6; attempt++) {
    const row = await store.get(code);
    if (!row) throw new GameError("Room not found — it may have expired");
    const next = { ...fn(row.state), updatedAt: Date.now() };
    if (await store.update(code, row.version, next)) return next;
    await new Promise((r) => setTimeout(r, 40 + attempt * 60));
  }
  throw new GameError("The court is crowded — try again");
}
