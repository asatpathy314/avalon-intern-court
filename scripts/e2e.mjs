// End-to-end game flow test against a running server (in-memory store).
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

const { code, hostToken } = await post("/api/rooms");
console.log("room", code);

const names = ["Dana", "Miles", "Priya", "Sam", "Jordan"];
const players = [];
for (const name of names) {
  const j = await post(`/api/room/${code}/join`, { name });
  players.push({ name, ...j });
}
assert(players.length === 5, "5 players joined");

// duplicate name rejected
let dup = false;
try { await post(`/api/room/${code}/join`, { name: "dana" }); } catch { dup = true; }
assert(dup, "duplicate name rejected");

// rejoin with token reclaims seat
const re = await post(`/api/room/${code}/join`, { token: players[0].token });
assert(re.playerId === players[0].playerId, "token rejoin reclaims seat");

const act = (token, action, payload) =>
  post(`/api/room/${code}/action`, { token, action, ...payload });

await act(hostToken, "startSetup");
await act(hostToken, "beginCourt");

let tv = await readView(code, hostToken);
assert(tv.phase === "reveal", "phase reveal after deal");
assert(tv.rolesInPlay.length === 5, "5 roles in play");
assert(!JSON.stringify(tv).match(/"roles":\{/), "TV view carries no role map");

// each player checks their private view; collect roles for driving the game
const roleOf = {};
for (const p of players) {
  const pv = await readView(code, p.token);
  roleOf[p.playerId] = pv.role.key;
  assert(pv.role && pv.role.key, `${p.name} sees own role (${pv.role.key})`);
  if (pv.role.key === "merlin")
    assert(pv.role.knowledge.names.length >= 1, "merlin sees evil names");
}
const evils = players.filter((p) => ["mordred", "morgana", "assassin", "minion", "oberon"].includes(roleOf[p.playerId]));
const goods = players.filter((p) => !evils.includes(p));
console.log("cast:", players.map((p) => `${p.name}=${roleOf[p.playerId]}`).join(" "));
assert(evils.length === 2, "2 evil at 5 players");

for (const p of players) await act(p.token, "ready");
tv = await readView(code, hostToken);
assert(tv.phase === "proposal", "all sworn in -> proposal");

async function runMission(fails) {
  tv = await readView(code, hostToken);
  const n = tv.missionSizes[tv.mission];
  const leaderId = tv.leaderId;
  const leaderTok = players.find((p) => p.playerId === leaderId).token;
  // team: enough evil to supply `fails`, rest good
  const team = [...evils.slice(0, fails), ...goods].slice(0, n).map((p) => p.playerId);
  while (team.length < n) team.push(players.find((p) => !team.includes(p.playerId)).playerId);
  await act(leaderTok, "propose", { team });
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  tv = await readView(code, hostToken);
  assert(tv.phase === "voteReveal", "all votes -> voteReveal");
  assert(tv.voteReveal.approved, "approved");
  // early ack must be refused
  let early = false;
  try { await act(hostToken, "ack"); } catch { early = true; }
  assert(early, "early ack refused");
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "quest", "ack -> quest");
  let failsLeft = fails;
  for (const id of team) {
    const p = players.find((q) => q.playerId === id);
    const isEvil = evils.includes(p);
    const card = isEvil && failsLeft-- > 0 ? "fail" : "success";
    await act(p.token, "questCard", { card });
  }
  tv = await readView(code, hostToken);
  assert(tv.phase === "questReveal", "all cards -> questReveal");
  assert(tv.questReveal.fails === fails, `quest shows ${fails} fails`);
  await sleep(1600 + tv.questReveal.cards.length * 1200 + 2100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  console.log(`mission done -> ${tv.phase}, results:`, JSON.stringify(tv.questResults));
}

// a good player trying to fail must be refused
{
  tv = await readView(code, hostToken);
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  const team = [goods[0], goods[1]].map((p) => p.playerId);
  await act(leaderTok, "propose", { team });
  // reject the vote to also test rejection counter
  for (const p of players) await act(p.token, "vote", { vote: "reject" });
  tv = await readView(code, hostToken);
  assert(tv.voteReveal && !tv.voteReveal.approved, "rejection tallied");
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.rejections === 1, "rejection counter at 1");
  assert(tv.phase === "proposal", "crown passed");
}

await runMission(0); // M1 success
await runMission(0); // M2 success

// good player cannot fail
{
  tv = await readView(code, hostToken);
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  const n = tv.missionSizes[tv.mission];
  const team = goods.slice(0, n).map((p) => p.playerId);
  await act(leaderTok, "propose", { team });
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");
  let refused = false;
  try { await act(goods[0].token, "questCard", { card: "fail" }); } catch { refused = true; }
  assert(refused, "good player cannot play fail");
  for (const id of team) {
    const p = players.find((q) => q.playerId === id);
    await act(p.token, "questCard", { card: "success" });
  }
  tv = await readView(code, hostToken);
  await sleep(1600 + tv.questReveal.cards.length * 1200 + 2100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "assassination", "3 wins -> assassination");
}

// assassination: flag holder strikes merlin
{
  const holder = players.find((p) => ["morgana", "assassin", "mordred", "minion", "oberon"].includes(roleOf[p.playerId]) );
  // find who actually has the choosing view
  let chooser = null;
  for (const p of evils) {
    const pv = await readView(code, p.token);
    if (pv.assassin?.choosing) chooser = { p, pv };
  }
  assert(chooser, "exactly one flag holder is choosing");
  const merlinP = players.find((p) => roleOf[p.playerId] === "merlin");
  const targetIds = chooser.pv.assassin.targets.map((t) => t.id);
  assert(targetIds.includes(merlinP.playerId), "merlin among targets");
  assert(!targetIds.includes(evils[0].playerId) && !targetIds.includes(evils[1].playerId), "known evil excluded from targets");
  await act(chooser.p.token, "assassinate", { targetId: merlinP.playerId });
  tv = await readView(code, hostToken);
  assert(tv.phase === "assassinationReveal" && tv.assassinReveal.hit, "blade lands on merlin");
  await sleep(5300);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "gameover" && tv.gameover.winner === "evil", "evil wins by assassination");
  assert(tv.gameover.cast.length === 5, "full unmasking");
  assert(tv.gameover.recap.length === 3, "recap has 3 missions");
}

// play again
await act(hostToken, "playAgain");
tv = await readView(code, hostToken);
assert(tv.phase === "setup" && tv.playerCount === 5, "play again -> setup, players kept");

console.log("\nALL PASSED");
process.exit(0);
