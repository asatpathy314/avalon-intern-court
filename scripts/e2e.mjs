// End-to-end game flow test against a running server.
const BASE = process.env.BASE ?? "http://localhost:3999";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${json.error ?? ""}`);
  return json;
}

async function readView(code, token) {
  // grab the first SSE event then abort
  const ctrl = new AbortController();
  const res = await fetch(`${BASE}/api/room/${code}/stream?token=${token}`, {
    signal: ctrl.signal,
  });
  if (!res.ok) throw new Error(`stream ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const m = buf.match(/data: (.+)\n\n/);
    if (m) {
      ctrl.abort();
      return JSON.parse(m[1]);
    }
  }
  throw new Error("no event");
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT: " + msg);
  console.log("  ok:", msg);
}

const EVIL = ["mordred", "morgana", "assassin", "minion", "oberon"];

const { code, hostToken } = await post("/api/rooms");
console.log("room", code);
const act = (token, action, payload) =>
  post(`/api/room/${code}/action`, { token, action, ...payload });

const names = ["Dana", "Miles", "Priya", "Sam", "Jordan"];
const players = [];
for (const name of names) {
  const j = await post(`/api/room/${code}/join`, { name });
  players.push({ name, ...j });
}
assert(players.length === 5, "5 players joined");

let dup = false;
try { await post(`/api/room/${code}/join`, { name: "dana" }); } catch { dup = true; }
assert(dup, "duplicate name rejected");

const re = await post(`/api/room/${code}/join`, { token: players[0].token });
assert(re.playerId === players[0].playerId, "token rejoin reclaims seat");

async function dealAndSwearIn() {
  await act(hostToken, "beginCourt");
  const roleOf = {};
  for (const p of players) {
    const pv = await readView(code, p.token);
    roleOf[p.playerId] = pv.role.key;
  }
  for (const p of players) await act(p.token, "ready");
  const tv = await readView(code, hostToken);
  assert(tv.phase === "proposal", "all sworn in -> proposal");
  console.log("cast:", players.map((p) => `${p.name}=${roleOf[p.playerId]}`).join(" "));
  return roleOf;
}

/** Propose a team, approve unanimously, play the given number of fail cards, ride out the beats. */
async function runMission(roleOf, failers) {
  let tv = await readView(code, hostToken);
  const n = tv.missionSizes[tv.mission];
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  const team = [...failers];
  for (const p of players) {
    if (team.length >= n) break;
    if (!team.includes(p)) team.push(p);
  }
  await act(leaderTok, "propose", { team: team.map((p) => p.playerId) });
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "quest", "vote acked -> quest");
  for (const p of team) {
    await act(p.token, "questCard", { card: failers.includes(p) ? "fail" : "success" });
  }
  tv = await readView(code, hostToken);
  assert(tv.phase === "questReveal", "all cards -> questReveal");
  assert(tv.questReveal.fails === failers.length, `quest shows ${failers.length} fails`);
  await sleep(1600 + tv.questReveal.cards.length * 1200 + 2100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  console.log(`mission done -> ${tv.phase}`, JSON.stringify(tv.questResults));
  return tv;
}

/* ---- game 1: assassination on, good players may fail ---- */
await act(hostToken, "startSetup");
let roleOf = await dealAndSwearIn();
let evils = players.filter((p) => EVIL.includes(roleOf[p.playerId]));
let goods = players.filter((p) => !evils.includes(p));
assert(evils.length === 2, "2 evil at 5 players");

// rejected vote passes the crown and lights a candle
{
  let tv = await readView(code, hostToken);
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  await act(leaderTok, "propose", { team: [goods[0].playerId, goods[1].playerId] });
  for (const p of players) await act(p.token, "vote", { vote: "reject" });
  tv = await readView(code, hostToken);
  assert(tv.voteReveal && !tv.voteReveal.approved, "rejection tallied");
  let early = false;
  try { await act(hostToken, "ack"); } catch { early = true; }
  assert(early, "early ack refused");
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.rejections === 1 && tv.phase === "proposal", "crown passed, candle snuffed");
}

let tv = await runMission(roleOf, []); // M1 ✓
tv = await runMission(roleOf, []); // M2 ✓
tv = await runMission(roleOf, [goods[0]]); // M3 ✗ — a LOYAL player throws the fail
assert(tv.questResults[2] && !tv.questResults[2].success, "good player's fail card counted");
tv = await runMission(roleOf, []); // M4 ✓ -> three wins
assert(tv.phase === "assassination", "3 wins -> assassination");

{
  let chooser = null;
  for (const p of evils) {
    const pv = await readView(code, p.token);
    if (pv.assassin?.choosing) chooser = { p, pv };
  }
  assert(chooser, "flag holder is choosing");
  const merlinP = players.find((p) => roleOf[p.playerId] === "merlin");
  const targetIds = chooser.pv.assassin.targets.map((t) => t.id);
  assert(targetIds.includes(merlinP.playerId), "merlin among targets");
  await act(chooser.p.token, "assassinate", { targetId: merlinP.playerId });
  tv = await readView(code, hostToken);
  assert(tv.phase === "assassinationReveal" && tv.assassinReveal.hit, "blade lands on merlin");
  await sleep(5300);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "gameover" && tv.gameover.winner === "evil", "evil wins by assassination");
  assert(tv.gameover.recap.length === 4, "recap has 4 missions");
}

/* ---- game 2: assassination toggled off -> three quests decide it outright ---- */
await act(hostToken, "playAgain");
tv = await readView(code, hostToken);
assert(tv.phase === "setup" && tv.playerCount === 5, "play again -> setup, players kept");
await act(hostToken, "updateConfig", { config: { assassination: false } });
tv = await readView(code, hostToken);
assert(tv.config.assassination === false, "assassination toggled off");

roleOf = await dealAndSwearIn();
await runMission(roleOf, []);
await runMission(roleOf, []);
tv = await runMission(roleOf, []);
assert(
  tv.phase === "gameover" && tv.gameover.winner === "good",
  "3 wins with blade sheathed -> good wins outright, no assassination"
);

console.log("\nALL PASSED");
process.exit(0);
