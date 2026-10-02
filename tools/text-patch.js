// TEXT EDIT's server half (js/text-edit.js, POST /text-edit in tools/serve.js). An edited text is
// looked for inside a string literal of js/*.js: found exactly once, it is rewritten there and the
// source is the edit; anywhere else (built out of pieces, or said in several places) it goes into
// `TEXT_EDITS` in js/text-edit.js, which every build draws over the original.
const fs = require('fs');
const path = require('path');

// Generated or data files: never searched, never written.
const SKIP = /(-assets|decal-pixels|text-edit)\.js$/;

// The ways a string can stand in a literal: as is, or with its quotes escaped for the quote round it.
const forms = (s) => [
  { find: s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"), q: "'" },
  { find: s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'), q: '"' },
  { find: s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${'), q: '`' },
];
const escFor = (s, q) => q === "'" ? s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  : q === '"' ? s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

// Whether position `at` of `src` is inside a literal opened by quote `q` on its own line.
function inLiteral(src, at, q) {
  const ls = src.lastIndexOf('\n', at - 1) + 1;
  let open = null;
  for (let i = ls; i < at; i++) {
    const c = src[i];
    if (open) { if (c === '\\') { i++; continue; } if (c === open) open = null; continue; }
    if (c === '/' && src[i + 1] === '/') return false;
    if (c === "'" || c === '"' || c === '`') open = c;
  }
  return open === q;
}

// Every place the text stands in a literal, over js/*.js.
function findAll(root, text) {
  const out = [];
  if (!text || text.length < 2) return out;
  const dir = path.join(root, 'js');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || SKIP.test(f)) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const { find, q } of forms(text)) {
      let i = -1;
      // A short text counts only as a whole literal: "CHAMPION" found once inside a long note is not the
      // CHAMPION on screen, and rewriting it changed someone else's text. A longer one may be one wrapped
      // line of a long literal, which is how the renderer draws it.
      while ((i = src.indexOf(find, i + 1)) >= 0) {
        const whole = src[i - 1] === q && src[i + find.length] === q;
        if (inLiteral(src, i, q) && (whole || text.length >= 16) && !out.some((o) => o.file === f && o.at === i)) out.push({ file: f, at: i, len: find.length, q });
      }
    }
  }
  return out;
}

// `TEXT_EDITS` written back whole, one entry a line.
function writeEdits(root, edits) {
  const file = path.join(root, 'js', 'text-edit.js');
  let src = fs.readFileSync(file, 'utf8');
  const head = 'const TEXT_EDITS = {', a = src.indexOf(head), b = src.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error('TEXT_EDITS not found in js/text-edit.js');
  const body = Object.keys(edits).sort().map((k) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(edits[k]) + ',').join('\n');
  src = src.slice(0, a) + head + (body ? '\n' + body : '') + src.slice(b);
  fs.writeFileSync(file, src);
}

// { from, to, edits }: `to` null is "back to the original" (only ever in TEXT_EDITS).
function applyText(root, edit) {
  const { from, to } = edit, edits = Object.assign({}, edit.edits || {});
  if (typeof from !== 'string') throw new Error('no text');
  if (to !== null && typeof to === 'string') {
    const hits = findAll(root, from);
    if (hits.length === 1) {
      const h = hits[0], file = path.join(root, 'js', h.file), src = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, src.slice(0, h.at) + escFor(to, h.q) + src.slice(h.at + h.len));
      delete edits[from];
      writeEdits(root, edits);
      return { ok: true, where: 'source', file: 'js/' + h.file, line: src.slice(0, h.at).split('\n').length };
    }
  }
  writeEdits(root, edits);
  return { ok: true, where: 'edits' };
}

// One spoken line in one file (the TALK page's animals, js/tuning.js): `to` rewrites it, `del`
// takes it out of its list (or empties it where it is a single value, so nothing that reads it breaks).
// The line must stand as a whole literal exactly once in that file.
function editLine(root, { file, from, to, del }) {
  if (!/^js\/[\w-]+\.js$/.test(file || '')) throw new Error('bad file');
  const full = path.join(root, file);
  let src = fs.readFileSync(full, 'utf8');
  const spans = [];
  for (const q of ["'", '"', '`']) {
    const lit = q + escFor(from, q) + q;
    let i = -1;
    while ((i = src.indexOf(lit, i + 1)) >= 0) if (!inLiteral(src, i, q) && !inLiteral(src, i, "'") && !inLiteral(src, i, '"') && !inLiteral(src, i, '`')) spans.push({ a: i, b: i + lit.length, q });
  }
  if (spans.length !== 1) throw new Error(spans.length ? `said ${spans.length} times in ${file}: edit it there` : 'not found in ' + file);
  let { a, b, q } = spans[0];
  if (!del) { src = src.slice(0, a) + q + escFor(to || '', q) + q + src.slice(b); }
  else {
    let before = a; while (before > 0 && /\s/.test(src[before - 1])) before--;
    let after = b; while (after < src.length && / |\t/.test(src[after])) after++;
    const prev = src[before - 1];
    if (prev === ':') src = src.slice(0, a) + "''" + src.slice(b);              // a single value: emptied
    else if (src[after] === ',') {                                               // in a list, with a comma after
      let end = after + 1; while (end < src.length && / |\t/.test(src[end])) end++;
      let start = a;
      // alone on its line: the line goes
      const ls = src.lastIndexOf('\n', a - 1) + 1;
      if (!src.slice(ls, a).trim() && src[end] === '\n') { start = ls; end++; }
      else if (src[end] === '\n') while (start > 0 && / |\t/.test(src[start - 1])) start--;   // no space left at the line's end
      src = src.slice(0, start) + src.slice(end);
    } else if (prev === ',') src = src.slice(0, before - 1) + src.slice(b);       // the last of a list
    else src = src.slice(0, a) + src.slice(b);                                   // the only one
  }
  fs.writeFileSync(full, src);
  return { ok: true };
}

module.exports = { applyText, findAll, editLine };
