// RUN STATS' receiver (1 Oct 2026): a Cloudflare Worker over a D1 database. The game (js/stats.js)
// POSTs one life's report to /report and the funnel's steps (`Stats.step`) to /steps; tools/stats.html
// GETs them back from /reports and /steps with the secret READ_KEY. Nothing else is served. Deployed with wrangler (see README.md beside this file).
//
// The address is in the game's code, so anyone can post to it: everything that arrives is checked
// for shape and size, one address may post `RATE` reports a minute, and a report is stored by its
// own id once (a retry from the game is not a second life). Reading needs the key, which is never
// in the game. No IP is stored, only a salted hash of it for the rate limit, dropped after a day.

const MAX_BODY = 60000;      // bytes: a long life's report is ~10 KB
const RATE = 20;             // reports a minute from one address
const MAX_FLOORS = 20;
// The funnel's step names (js/stats.js `step`); anything else is refused.
const STEP = /^(open|start|death|restart|clear1|win|reach\d{1,2})$/;
// The ids the game writes (js/stats.js): 'p-' and 'r-' then base 36 (a random run and a clock tail).
// Anything else is a forger's, and a player id is what the funnel counts people by, so a made-up one
// is a made-up person.
const PLAYER = /^p-[a-z0-9]{4,24}$/;
const RUNID = /^r-[a-z0-9]{6,28}$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'X-Oldest-Got',
};
const reply = (status, body, type = 'application/json', extra = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': type, ...extra } });

const str = (v, n) => typeof v === 'string' && v.length > 0 && v.length <= n;
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// A report as js/stats.js writes it, or null. Every field is checked for its type and size, not
// only the few the table indexes: `tools/stats.html` rebuilds what it reads too, but nothing that is
// not the game's own shape should be stored in the first place.
const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const list = (v, n) => Array.isArray(v) && v.length <= n && v.every(obj);
const strOrNull = (v, n) => v === null || v === undefined || (typeof v === 'string' && v.length <= n);
const numOr = (v) => v === undefined || num(v);
const strs = (v, n) => v === undefined || v === null || (Array.isArray(v) && v.length <= 6 && v.every((x) => str(x, n)));
function floorOk(f) {
  if (!obj(f) || !str(f.f, 4) || !/^[LNT]\d{1,2}$/.test(f.f)) return false;
  if (!numOr(f.kills) || !numOr(f.time) || !numOr(f.room) || !strOrNull(f.name, 40)) return false;
  if (f.hurt !== undefined && !(list(f.hurt, 300) && f.hurt.every((h) => str(h.by, 24) && num(h.n) && numOr(h.hp) && numOr(h.room) && numOr(h.t)))) return false;
  if (f.blows !== undefined) {
    if (!obj(f.blows)) return false;
    const e = Object.entries(f.blows);
    if (e.length > 300 || !e.every(([k, v]) => k.length <= 60 && k.includes('|') && Array.isArray(v) && v.length === 2 && num(v[0]) && num(v[1]))) return false;
  }
  if (f.souls !== undefined && !(list(f.souls, 60) && f.souls.every((x) => strs(x.offer, 30) && strOrNull(x.took, 30)))) return false;
  if (f.shop !== undefined && !(list(f.shop, 20) && f.shop.every((x) => strs(x.offer, 30) && strOrNull(x.took, 30)))) return false;
  if (f.beasts !== undefined && !(list(f.beasts, 60) && f.beasts.every((b) => str(b.kind, 16) && str(b.ev, 8)))) return false;
  // Room by room (6 Oct 2026, `Stats.roomTick`): the game keeps at most 40 rooms and 80 steps of path a floor.
  if (f.rm !== undefined && !(list(f.rm, 60) && f.rm.every((x) => num(x.i) && strOrNull(x.r, 12) && str(x.s, 8)
    && numOr(x.t) && numOr(x.h) && numOr(x.k) && numOr(x.n) && numOr(x.d) && numOr(x.a)))) return false;
  if (f.path !== undefined && !(Array.isArray(f.path) && f.path.length <= 120
    && f.path.every((p) => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1])))) return false;
  // SOMETHING NEW (6 Oct 2026, `Novelty`): at most `TUNING.novelty.cap` (40) first sightings a floor.
  if (f.nw !== undefined && !(Array.isArray(f.nw) && f.nw.length <= 60
    && f.nw.every((p) => Array.isArray(p) && p.length === 3 && num(p[0]) && str(p[1], 40) && num(p[2])))) return false;
  if (!numOr(f.dry)) return false;
  if (f.nudge !== undefined && !(Array.isArray(f.nudge) && f.nudge.length <= 12 && f.nudge.every((x) => str(x, 40)))) return false;
  return true;
}
function check(r) {
  if (!obj(r)) return null;
  if (!str(r.id, 40) || !RUNID.test(r.id) || !str(r.player, 40) || !PLAYER.test(r.player) || !str(r.build, 16)) return null;
  if (!num(r.at) || r.at < 1e12 || r.at > 4e12) return null;
  if (!Array.isArray(r.floors) || r.floors.length < 1 || r.floors.length > MAX_FLOORS || !r.floors.every(floorOk)) return null;
  const e = r.end;
  if (!obj(e) || !['death', 'win', 'quit', 'closed'].includes(e.how) || !strOrNull(e.f, 4) || !strOrNull(e.by, 24) || !strOrNull(e.code, 160)) return null;
  if (!numOr(e.kills) || !numOr(e.t) || !strOrNull(r.flags, 8)) return null;
  if (!numOr(e.room) || !numOr(e.rooms) || !strOrNull(e.role, 12)) return null;
  if (!numOr(r.dryMax) || !numOr(r.dryEnd)) return null;
  return r;
}

// The key compared without telling a guesser, by its timing, how much of it was right.
async function sameKey(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// `{ player, release, steps: { name: { at, build } } }` as `Stats.flushSteps` writes it, or null.
function checkSteps(b) {
  if (!obj(b) || !str(b.player, 40) || !PLAYER.test(b.player) || !obj(b.steps)) return null;
  const e = Object.entries(b.steps);
  if (!e.length || e.length > 16) return null;
  for (const [k, v] of e) if (!STEP.test(k) || !obj(v) || !num(v.at) || v.at < 1e12 || v.at > 4e12 || !str(v.build, 16)) return null;
  return b;
}

async function hash(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function keyed(req, env) {
  return !!env.READ_KEY && sameKey(req.headers.get('Authorization') || '', 'Bearer ' + env.READ_KEY);
}

// One address may post `RATE` times a minute, reports and steps together. The hit is written first
// and then counted, so posts sent at once all see each other.
async function tooFast(req, env, now) {
  const ip = await hash((req.headers.get('CF-Connecting-IP') || '?') + (env.SALT || ''));
  await env.DB.prepare('INSERT INTO hits (ip, at) VALUES (?, ?)').bind(ip, now).run();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM hits WHERE ip = ? AND at > ?').bind(ip, now - 60000).first();
  return !!(recent && recent.n > RATE);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (req.method === 'POST' && url.pathname === '/report') {
      const len = +req.headers.get('Content-Length') || 0;
      if (len > MAX_BODY) return reply(413, { error: 'too big' });
      const text = await req.text();
      if (text.length > MAX_BODY) return reply(413, { error: 'too big' });
      let r = null;
      try { r = check(JSON.parse(text)); } catch (e) { r = null; }
      if (!r) return reply(400, { error: 'not a report' });

      const now = Date.now();
      if (await tooFast(req, env, now)) return reply(429, { error: 'slow down' });

      const e = r.end;
      await env.DB.batch([
        env.DB.prepare('DELETE FROM hits WHERE at < ?').bind(now - 86400000),
        env.DB.prepare(`INSERT OR IGNORE INTO reports (id, player, build, at, got, end_how, end_floor, killer, flags, release, report)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          r.id, r.player, r.build, Math.round(r.at), now, e.how, str(e.f, 4) ? e.f : null, str(e.by, 24) ? e.by : null,
          str(r.flags, 8) ? r.flags : '', r.release ? 1 : 0, text),
      ]);
      return reply(200, { ok: true });
    }

    // A player's step is kept once, the first time it arrives: a resend is not a second player.
    if (req.method === 'POST' && url.pathname === '/steps') {
      const text = await req.text();
      if (text.length > 4000) return reply(413, { error: 'too big' });
      let b = null;
      try { b = checkSteps(JSON.parse(text)); } catch (e) { b = null; }
      if (!b) return reply(400, { error: 'not steps' });
      const now = Date.now();
      if (await tooFast(req, env, now)) return reply(429, { error: 'slow down' });
      await env.DB.batch(Object.entries(b.steps).map(([k, v]) =>
        env.DB.prepare('INSERT OR IGNORE INTO steps (player, step, at, build, release, got) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(b.player, k, Math.round(v.at), v.build, b.release ? 1 : 0, now)));
      return reply(200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/steps') {
      if (!(await keyed(req, env))) return reply(401, { error: 'key' });
      const since = +url.searchParams.get('since') || 0;
      const { results } = await env.DB.prepare('SELECT player, step, at, build, release FROM steps WHERE got > ? ORDER BY got DESC LIMIT 50000').bind(since).all();
      return reply(200, results);
    }

    // Newest first: the dashboard asked for the oldest `limit` before and so never saw the latest
    // lives once a few thousand had come in. `before` pages back (a got), `X-Oldest-Got` is the next one.
    if (req.method === 'GET' && url.pathname === '/reports') {
      if (!(await keyed(req, env))) return reply(401, { error: 'key' });
      const since = +url.searchParams.get('since') || 0;
      const before = +url.searchParams.get('before') || 0;
      const build = url.searchParams.get('build');
      const asked = Math.floor(+url.searchParams.get('limit'));
      const limit = asked >= 1 && asked <= 5000 ? asked : 5000;
      const where = ['got > ?'], args = [since];
      if (before) { where.push('got <= ?'); args.push(before); }
      if (build) { where.push('build = ?'); args.push(build); }
      const { results } = await env.DB.prepare(`SELECT report, got FROM reports WHERE ${where.join(' AND ')} ORDER BY got DESC LIMIT ?`).bind(...args, limit).all();
      const oldest = results.length ? results[results.length - 1].got : 0;
      return reply(200, '[' + results.map((x) => x.report).join(',') + ']', 'application/json', { 'X-Oldest-Got': String(oldest) });
    }

    if (url.pathname === '/') return reply(200, 'goat stats: alive', 'text/plain');
    return reply(404, { error: 'nothing here' });
  },
};
