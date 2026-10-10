// THE BOT LAB (10 Oct 2026, his ask: "a bot that plays by itself, on Ilya's, at three levels, strong, middling and
// weak, taking different skills, and I want to see over many runs how it plays, what it picks and when it dies").
// It drives tools/autoplay-bot.js (the friend's bot, which plays through keys and the pointer only) and lays over it:
//   - a hand: `LEVELS_OF_PLAY` strong / medium / weak, as how many of its looks at the world it skips (`bot.skip`, a
//     slower reaction) and how far off the pointer lands (`bot.aimErr`, px);
//   - a taste: `pick` 'variety' takes the card (and the mouse's ware) this lab has taken least at that level, so over
//     runs every soul and talisman is played; 'bot' leaves it to the bot's own priors; 'random' throws a die;
//   - a diary: every run (one life, since PERMADEATH) is written to localStorage `goatlab.v1`: the hand, the seed, each
//     floor reached and when, every card offered and taken, the talismans and the cape, the floor it ended on and what
//     killed it. tools/bot-lab.html on the same server reads it back as tables and bars.
// Load on a served page (localhost) like the harness:
//   const s = document.createElement('script'); s.src = '/tools/bot-lab.js'; document.body.appendChild(s);
//   LAB.start({ level: 'rotate', pick: 'variety', runs: 30 });   // 'strong' | 'medium' | 'weak' | 'rotate'
//   LAB.stop();  LAB.summary();  LAB.export();  LAB.clear();
// It writes nothing into the run but what a player's hands would, with three harness exceptions: the opening is
// skipped (SKIP THE OPENING), a run with no new floor in `stuckMin` minutes is given up (PAUSE → ABANDON RUN does
// the same), and a won run starts the next one (RUN AGAIN). Runs here are flagged as the bot's in RUN STATS.
window.LAB = (() => {
  const KEY = 'goatlab.v1';
  const LEVELS_OF_PLAY = {
    strong: { skip: 0, aimErr: 0 },
    medium: { skip: 0.3, aimErr: 12 },
    weak: { skip: 0.55, aimErr: 26 },
  };
  const ORDER = ['strong', 'medium', 'weak'];
  const L = {
    cfg: { level: 'rotate', pick: 'variety', runs: 0, stuckMin: 12, lane: 0 },
    db: null, run: null, iv: null, n: 0, on: false,
  };
  const load = () => { try { L.db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { L.db = null; } if (!L.db || !L.db.runs) L.db = { v: 1, runs: [] }; };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L.db)); } catch (e) { L.db.runs.splice(0, 50); try { localStorage.setItem(KEY, JSON.stringify(L.db)); } catch (e2) { } } };
  load();

  // Served by tools/serve.js, every run also goes to tools/lab/runs.jsonl (POST /lab), and a heartbeat every
  // `beatMs` to tools/lab/beat.json, which tools/lab-run.js watches: the diary outlives the browser profile.
  const post = (m) => { try { fetch('/lab', { method: 'POST', body: JSON.stringify(m) }).catch(() => {}); } catch (e) { } };
  const g = () => window.game;
  const floorName = () => { const d = g().level && g().level.def; return d ? (d.name || '?') : '?'; };
  const floorNo = () => (g().levelIndex | 0) + 1;
  const ids = (list) => (list || []).map((x) => x && (x.id || x)).filter(Boolean);

  // How many times this lab has had each id taken at this hand (cards and wares share the count).
  function counts(level) {
    const c = {};
    for (const r of L.db.runs) if (r.skill === level) {
      for (const b of r.boons || []) c[b.id] = (c[b.id] || 0) + 1;
      for (const a of r.arts || []) c[a.id] = (c[a.id] || 0) + 1;
    }
    if (L.run) { for (const b of L.run.boons) c[b.id] = (c[b.id] || 0) + 1; for (const a of L.run.arts) c[a.id] = (c[a.id] || 0) + 1; }
    return c;
  }
  // The least-taken of a list, ties broken by a die.
  function least(list, level) {
    const c = counts(level); let best = null, bv = 1e9;
    list.forEach((id, i) => { const v = (c[id] || 0) + Math.random() * 0.9; if (v < bv) { bv = v; best = i; } });
    return best;
  }
  function chooseCard(ch) {
    if (L.run) L.run.offers.push({ f: floorNo(), of: ids(ch) });
    if (L.cfg.pick === 'bot') return null;
    if (L.cfg.pick === 'random') return Math.floor(Math.random() * ch.length);
    return least(ids(ch), L.run ? L.run.skill : 'strong');
  }
  function chooseWare() {
    const G = g(); if (!G.shopDlg || typeof Codex === 'undefined' || !Codex.shopOffers) return 0;
    const offers = Codex.shopOffers(G, G.shopDlg.id).map((w) => w.ware && w.ware.id);
    if (L.cfg.pick === 'bot') return 0;
    if (L.cfg.pick === 'random') return Math.floor(Math.random() * offers.length);
    return least(offers, L.run ? L.run.skill : 'strong') || 0;
  }

  function nextSkill() {
    if (L.cfg.level !== 'rotate') return L.cfg.level;
    // the hand with the fewest runs so far goes next, so the three stay level
    const c = { strong: 0, medium: 0, weak: 0 }; for (const r of L.db.runs) if (c[r.skill] != null) c[r.skill]++;
    return ORDER.slice().sort((a, b) => c[a] - c[b])[0];
  }
  function hand(skill) { const H = LEVELS_OF_PLAY[skill], B = window.bot; if (B) { B.skip = H.skip; B.aimErr = H.aimErr; } }

  function beginRecord() {
    const G = g(), skill = nextSkill(); hand(skill);
    L.run = { n: (L.db.runs.length ? L.db.runs[L.db.runs.length - 1].n : 0) + 1, skill, pick: L.cfg.pick, build: typeof BUILD !== 'undefined' ? BUILD : '?',
      seed: (G.runSeed >>> 0).toString(36), at: new Date().toISOString(), t0: performance.now(), floors: [{ f: floorNo(), name: floorName(), t: 0 }],
      boons: [], offers: [], arts: [], cape: null, end: null, killer: null, kills: 0, hearts: [] };
    L.lastBoons = ids(G.boons); L.lastArts = ids(G.artifacts); L.lastFloorT = performance.now(); L.lastFloor = G.levelIndex;
  }
  function endRecord(end) {
    const G = g(), R = L.run; if (!R) return;
    R.end = end; R.dur = Math.round((performance.now() - R.t0) / 1000);
    R.reached = Math.max(...R.floors.map((f) => f.f)); R.lastName = R.floors[R.floors.length - 1].name;
    R.kills = (G.totalKills | 0) + (G.kills | 0);
    if (end === 'death') { try { R.killer = G.killedBy(G.goat.hurtBy) || '?'; } catch (e) { R.killer = '?'; } }
    if (end === 'stuck') R.killer = 'STUCK';
    R.cape = G.cape ? G.cape.id : R.cape;
    delete R.t0; L.db.runs.push(R); post({ type: 'run', run: Object.assign({ lane: L.cfg.lane }, R) }); if (L.db.runs.length > 600) L.db.runs.splice(0, L.db.runs.length - 600); save();
    L.n++; L.run = null;
    console.log(`[LAB] run ${R.n} ${R.skill}: ${R.end} on floor ${R.reached} (${R.lastName}) by ${R.killer || '-'} after ${R.dur}s; souls ${R.boons.map((b) => b.id).join(', ') || '-'}; talismans ${R.arts.map((a) => a.id).join(', ') || '-'}`);
    if (L.cfg.runs && L.n >= L.cfg.runs) { console.log('[LAB] done: ' + L.n + ' runs'); LAB.stop(); }
  }

  function poll() {
    const G = g(), B = window.bot; if (!G || !B) return;
    const st = G.state;
    if (!L.beatAt || performance.now() - L.beatAt > 20000) { L.beatAt = performance.now(); const o = G.goat || {};
      post({ type: 'beat', lane: L.cfg.lane, state: st, floor: floorNo(), run: L.run ? L.run.n : null, hand: L.run ? L.run.skill : null, session: L.n,
        hp: o.hp, room: G.goatRoom, rooms: G.level && G.level.rooms ? G.level.rooms.length : null, kills: (G.totalKills | 0) + (G.kills | 0), x: o.x | 0, y: o.y | 0, goal: B.goal || null,
        souls: L.run ? L.run.boons.map((b) => b.id) : [], log: (B.log || []).slice(-4) });
      // a picture of the page every minute (tools/shots/lab.png), so a headless run can be looked at
      if (!L.shotAt || performance.now() - L.shotAt > 60000) { L.shotAt = performance.now(); try { const c = document.createElement('canvas'), src = G.canvas; c.width = 640; c.height = Math.round(640 * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); fetch('/shot?name=lab' + (L.cfg.lane || ''), { method: 'POST', body: c.toDataURL('image/png') }).catch(() => {}); } catch (e) { } }
    }
    // a run starts the first time the goat is on a floor with no run open
    if (!L.run && (st === 'play' || st === 'boon') && G.levelIndex === 0) beginRecord();
    const R = L.run;
    if (R) {
      if (G.levelIndex !== L.lastFloor && (st === 'play' || st === 'boon')) {
        L.lastFloor = G.levelIndex; L.lastFloorT = performance.now();
        R.floors.push({ f: floorNo(), name: floorName(), t: Math.round((performance.now() - R.t0) / 1000) });
      }
      const nb = ids(G.boons); for (const id of nb) if (!L.lastBoons.includes(id)) R.boons.push({ id, f: floorNo() }); L.lastBoons = nb;
      const na = ids(G.artifacts); for (const id of na) if (!L.lastArts.includes(id)) R.arts.push({ id, f: floorNo() }); L.lastArts = na;
      if (G.cape) R.cape = G.cape.id;
      if (G.goat && st === 'play') { const h = G.goat.hp; if (R.hpWas != null && h < R.hpWas) R.hearts.push(floorNo()); R.hpWas = h; }
      if (st === 'dead') endRecord('death');
      else if (st === 'win') { endRecord('win'); setTimeout(() => { if (L.on) { B.won = false; G.beginRun(false); } }, 2500); }
      else if (st === 'play' && performance.now() - L.lastFloorT > L.cfg.stuckMin * 60000) { endRecord('stuck'); try { G.abandonRun(); } catch (e) { G.beginRun(false); } }
    }
    // the title (a quit, a fresh page): start a run
    if (st === 'title' && L.on && (!L.titleAt || performance.now() - L.titleAt > 3000)) { L.titleAt = performance.now(); G.beginRun(false); }
  }

  // ---- the panel ----
  function panelText() {
    const by = {}; for (const r of L.db.runs) { const s = by[r.skill] || (by[r.skill] = { n: 0, f: 0, max: 0, win: 0 }); s.n++; s.f += r.reached || 1; s.max = Math.max(s.max, r.reached || 1); if (r.end === 'win') s.win++; }
    const line = (k) => { const s = by[k]; return s ? `${k.padEnd(6)} ${String(s.n).padStart(3)} runs  avg floor ${(s.f / s.n).toFixed(1)}  best ${s.max}  escaped ${s.win}` : `${k.padEnd(6)}   0 runs`; };
    const R = L.run;
    return `BOT LAB ${L.on ? 'ON' : 'OFF'}  hand ${R ? R.skill : '-'}  pick ${L.cfg.pick}  this session ${L.n}${L.cfg.runs ? '/' + L.cfg.runs : ''}\n` +
      (R ? `run ${R.n}: floor ${floorNo()} ${floorName()}  souls ${R.boons.map((b) => b.id).join(' ') || '-'}  talismans ${R.arts.map((a) => a.id).join(' ') || '-'}\n` : '\n') +
      ORDER.map(line).join('\n') + '\nreport: /tools/bot-lab.html';
  }
  function panel() {
    let el = document.getElementById('labov');
    if (!el) { el = document.createElement('div'); el.id = 'labov'; el.style.cssText = 'position:fixed;right:8px;top:40px;z-index:99;font:12px/1.4 monospace;color:#e8f3c9;background:rgba(10,30,10,.72);padding:6px 9px;max-width:560px;pointer-events:none;white-space:pre-wrap'; document.body.appendChild(el); }
    el.textContent = panelText();
  }

  return {
    LEVELS_OF_PLAY, get db() { return L.db; }, get run() { return L.run; }, cfg: L.cfg,
    async start(opts) {
      Object.assign(L.cfg, opts || {});
      const G = g(); G.autoPause = false;
      // the opening is skipped for every run the lab starts (SKIP THE OPENING), as a player who has seen it would
      if (G.settings) G.settings.skipIntro = true;
      // the friend's bot waits for a goat, and the title has none: a run first
      if (G.state === 'title') { G.beginRun(false); for (let i = 0; i < 40 && !G.goat; i++) await new Promise((r) => setTimeout(r, 250)); }
      if (!window.bot || !window.bot.iv) {
        await new Promise((r) => { const s = document.createElement('script'); s.src = '/tools/autoplay-bot.js?' + Date.now(); s.onload = r; document.body.appendChild(s); });
        for (let i = 0; i < 40 && !(window.bot && window.bot.iv); i++) await new Promise((r) => setTimeout(r, 250));
      }
      const B = window.bot; if (!B) return 'the bot did not start (no goat on the page?)';
      B.on = true; B.choose = chooseCard; B.chooseShop = chooseWare;
      L.on = true; clearInterval(L.iv); L.iv = setInterval(() => { try { poll(); } catch (e) { console.warn('[LAB]', e); } }, 250);
      clearInterval(L.pv); L.pv = setInterval(panel, 500);
      if (G.state === 'play' && !L.run) beginRecord();
      if (L.run) hand(L.run.skill);
      return 'lab on: ' + JSON.stringify(L.cfg);
    },
    stop() { L.on = false; clearInterval(L.iv); const B = window.bot; if (B) { B.on = false; B.release && B.release(); } panel(); return 'lab off'; },
    summary() { return panelText(); },
    export() { const blob = new Blob([JSON.stringify(L.db, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'goat-bot-lab.json'; a.click(); return L.db.runs.length + ' runs'; },
    clear() { L.db = { v: 1, runs: [] }; save(); return 'cleared'; },
  };
})();
