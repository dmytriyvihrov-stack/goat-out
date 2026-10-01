// RUN STATS' receiver (1 Oct 2026): a Cloudflare Worker over a D1 database. The game (js/stats.js)
// POSTs one life's report to /report; tools/stats.html GETs them back from /reports with the secret
// READ_KEY. Nothing else is served. Deployed with wrangler (see README.md beside this file).
//
// The address is in the game's code, so anyone can post to it: everything that arrives is checked
// for shape and size, one address may post `RATE` reports a minute, and a report is stored by its
// own id once (a retry from the game is not a second life). Reading needs the key, which is never
// in the game. No IP is stored, only a salted hash of it for the rate limit, dropped after a day.

const MAX_BODY = 60000;      // bytes: a long life's report is ~10 KB
const RATE = 20;             // reports a minute from one address
const MAX_FLOORS = 20;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
const reply = (status, body, type = 'application/json') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': type } });

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
  return true;
}
function check(r) {
  if (!obj(r)) return null;
  if (!str(r.id, 40) || !str(r.player, 40) || !str(r.build, 16)) return null;
  if (!num(r.at) || r.at < 1e12 || r.at > 4e12) return null;
  if (!Array.isArray(r.floors) || r.floors.length < 1 || r.floors.length > MAX_FLOORS || !r.floors.every(floorOk)) return null;
  const e = r.end;
  if (!obj(e) || !['death', 'win', 'quit', 'closed'].includes(e.how) || !strOrNull(e.f, 4) || !strOrNull(e.by, 24) || !strOrNull(e.code, 160)) return null;
  if (!numOr(e.kills) || !numOr(e.t) || !strOrNull(r.flags, 8)) return null;
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

async function hash(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
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
      const ip = await hash((req.headers.get('CF-Connecting-IP') || '?') + (env.SALT || ''));
      // The hit is written first and then counted, so posts sent at once all see each other.
      await env.DB.prepare('INSERT INTO hits (ip, at) VALUES (?, ?)').bind(ip, now).run();
      const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM hits WHERE ip = ? AND at > ?').bind(ip, now - 60000).first();
      if (recent && recent.n > RATE) return reply(429, { error: 'slow down' });

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

    if (req.method === 'GET' && url.pathname === '/reports') {
      const auth = req.headers.get('Authorization') || '';
      if (!env.READ_KEY || !(await sameKey(auth, 'Bearer ' + env.READ_KEY))) return reply(401, { error: 'key' });
      const since = +url.searchParams.get('since') || 0;
      const build = url.searchParams.get('build');
      const asked = Math.floor(+url.searchParams.get('limit'));
      const limit = asked >= 1 && asked <= 5000 ? asked : 5000;
      const q = build
        ? env.DB.prepare('SELECT report FROM reports WHERE got > ? AND build = ? ORDER BY got LIMIT ?').bind(since, build, limit)
        : env.DB.prepare('SELECT report FROM reports WHERE got > ? ORDER BY got LIMIT ?').bind(since, limit);
      const { results } = await q.all();
      return reply(200, '[' + results.map((x) => x.report).join(',') + ']');
    }

    if (url.pathname === '/') return reply(200, 'goat stats: alive', 'text/plain');
    return reply(404, { error: 'nothing here' });
  },
};
