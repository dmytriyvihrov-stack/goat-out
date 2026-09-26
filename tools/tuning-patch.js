// A small source-preserving patcher for js/tuning.js. The dev tool's BOONS tab edits a boon's
// `params` or `minLevel` live in the running game (see Game.applyBoons) and also asks the dev
// server to write the same number into the source file — so an edit lands where CLAUDE.md says
// every number has to live, comments and formatting untouched, rather than in a second place that
// rule would then be lying about. Used only by tools/serve.js; the game itself never requires this.
'use strict';

// Index of the closing quote of the string opening at `i`. A template literal's `${...}` is code,
// and may hold strings and templates of its own (the talismans' `tell` lines do), so it is walked
// as code up to its matching brace.
function skipString(text, i) {
  const q = text[i];
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === '\\') { j += 2; continue; }
    if (text[j] === q) return j;
    if (q === '`' && text[j] === '$' && text[j + 1] === '{') {
      let depth = 1; j += 2;
      while (j < text.length && depth) {
        const c = text[j];
        if (c === '"' || c === "'" || c === '`') { j = skipString(text, j) + 1; continue; }
        if (c === '{') depth++; else if (c === '}') depth--;
        j++;
      }
      continue;
    }
    j++;
  }
  return j;
}

function skipComment(text, i, limit) {
  if (text[i] === '/' && text[i + 1] === '/') { const nl = text.indexOf('\n', i); return nl === -1 || nl > limit ? limit : nl + 1; }
  if (text[i] === '/' && text[i + 1] === '*') { const cl = text.indexOf('*/', i + 2); return cl === -1 ? limit : cl + 2; }
  return -1;
}

// Index of the matching close bracket for the open bracket at `openIdx`. JS brackets of different
// kinds always nest properly with respect to each other, so counting just the one bracket
// character being matched is enough — strings, templates and comments are skipped so a stray
// `{`/`}`/`:` inside a quoted line never confuses the depth count.
function matchBracket(text, openIdx) {
  const openChar = text[openIdx], closeChar = openChar === '{' ? '}' : openChar === '[' ? ']' : ')';
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(text, i); continue; }
    const skip = skipComment(text, i, text.length);
    if (skip !== -1) { i = skip - 1; continue; }
    if (c === openChar) depth++;
    else if (c === closeChar) { depth--; if (depth === 0) return i; }
  }
  throw new Error('unbalanced brackets from ' + openIdx);
}

// Scans one `name: value,` at a time from `i`, stopping at `end` or a top-level `,`/closing
// bracket. Returns { i, name, valueStart, valueEnd } for a property, or null past the last one.
function nextValue(text, i, end) {
  while (i < end) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(text, i) + 1; continue; }
    const cs = skipComment(text, i, end);
    if (cs !== -1) { i = cs; continue; }
    if (c === '{' || c === '[' || c === '(') { i = matchBracket(text, i) + 1; continue; }
    if (c === ',' || c === '}' || c === ']') { i++; continue; }
    if (/[A-Za-z_$]/.test(c)) break;
    i++;
  }
  if (i >= end) return null;
  let j = i;
  while (j < end && /[A-Za-z0-9_$]/.test(text[j])) j++;
  const name = text.slice(i, j);
  let k = j;
  while (k < end && /\s/.test(text[k])) k++;
  if (text[k] !== ':') return nextValue(text, j, end);
  let vs = k + 1;
  while (vs < end && /\s/.test(text[vs])) vs++;
  let vi = vs;
  while (vi < end) {
    const vc = text[vi];
    if (vc === '"' || vc === "'" || vc === '`') { vi = skipString(text, vi) + 1; continue; }
    const cs2 = skipComment(text, vi, end);
    if (cs2 !== -1) { vi = cs2; continue; }
    if (vc === '{' || vc === '[' || vc === '(') { vi = matchBracket(text, vi) + 1; continue; }
    if (vc === ',' || vc === '}' || vc === ']') break;
    vi++;
  }
  return { i: vi, name, valueStart: vs, valueEnd: vi };
}

// Every direct property of the object literal spanning [start,end) (braces included) as a Map of
// name -> { valueStart, valueEnd }. Does not look inside nested objects/arrays/functions.
function topLevelProps(text, start, end) {
  const props = new Map();
  let i = start + 1;
  for (;;) {
    const found = nextValue(text, i, end);
    if (!found) break;
    props.set(found.name, { valueStart: found.valueStart, valueEnd: found.valueEnd });
    i = found.i;
  }
  return props;
}

// Every top-level `{...}` element of an array literal spanning [start,end).
function arrayElements(text, start, end) {
  const els = [];
  let i = start + 1;
  while (i < end) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(text, i) + 1; continue; }
    const cs = skipComment(text, i, end);
    if (cs !== -1) { i = cs; continue; }
    if (c === '{') { const close = matchBracket(text, i); els.push({ start: i, end: close }); i = close + 1; continue; }
    if (c === '[' || c === '(') { i = matchBracket(text, i) + 1; continue; }
    i++;
  }
  return els;
}

function findConst(text, name) {
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*([\\[{])');
  const m = re.exec(text);
  if (!m) throw new Error('const not found: ' + name);
  const openIdx = m.index + m[0].length - 1;
  return { start: openIdx, end: matchBracket(text, openIdx) };
}

function formatValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('not a finite number: ' + value);
  return String(n);
}

// Apply one edit to the full text of js/tuning.js and return the patched text.
//   { root: 'BOONS', id: 'horns', path: ['params', 'reachMul'], value: 1.6 }
//     — a field inside one BOONS entry, found by its `id`, descending through nested object
//       literals named in `path` (all but the last segment) to the last segment's leaf value.
//   { root: 'BOON_BASE', path: ['maxHp'], value: 5 }
//     — a field of a plain nested object; no `id` since there is only one of it.
//   { root: 'LEVELS', id: 'THE ALTAR', path: ['hint'], value: 'WATCH THE ARM' }
//     — LEVELS entries carry no `id` field of their own, so the lookup falls back to `name`.
function applyEdit(text, edit) {
  const { root, id, path, value } = edit;
  if (!Array.isArray(path) || !path.length) throw new Error('empty path');
  let block = findConst(text, root);
  if (id !== undefined) {
    const els = arrayElements(text, block.start, block.end);
    const found = els.find((el) => {
      const props = topLevelProps(text, el.start, el.end);
      const idProp = props.get('id') || props.get('name');
      if (!idProp) return false;
      const raw = text.slice(idProp.valueStart, idProp.valueEnd).trim();
      return raw === "'" + id + "'" || raw === '"' + id + '"';
    });
    if (!found) throw new Error('no ' + root + ' entry with id ' + id);
    block = found;
  }
  for (let i = 0; i < path.length - 1; i++) {
    // A number steps into an array by position: `['tiers', 1, 'params', 'rooms']` on an ARTIFACTS entry.
    if (typeof path[i] === 'number') {
      const els = arrayElements(text, block.start, block.end);
      if (!els[path[i]]) throw new Error('no element ' + path[i]);
      block = els[path[i]];
      continue;
    }
    const props = topLevelProps(text, block.start, block.end);
    const p = props.get(path[i]);
    if (!p) throw new Error('missing key ' + path.slice(0, i + 1).join('.'));
    if (text[p.valueStart] !== '{' && text[p.valueStart] !== '[') throw new Error('key ' + path[i] + ' is not an object');
    block = { start: p.valueStart, end: matchBracket(text, p.valueStart) };
  }
  const props = topLevelProps(text, block.start, block.end);
  const leaf = props.get(path[path.length - 1]);
  if (!leaf) {
    // A key the literal does not have yet (a talisman tier's `text`, first time it is written): it is
    // added as the object's last property. Clearing a key that is not there changes nothing.
    if (value === null) return text;
    const key = path[path.length - 1];
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) throw new Error('bad key ' + key);
    let at = block.end;
    while (at > block.start + 1 && /\s/.test(text[at - 1])) at--;
    const empty = at === block.start + 1;
    return text.slice(0, at) + (empty ? ' ' : ', ') + key + ': ' + formatValue(value) + (empty ? ' ' : '') + text.slice(at);
  }
  // Clearing a talisman's hand-written `text` takes the key out again rather than leaving a null.
  if (value === null && edit.drop) {
    let from = leaf.valueStart;
    while (from > block.start && text[from - 1] !== ',' && text[from - 1] !== '{') from--;
    const cut = text[from - 1] === ',' ? from - 1 : from;
    let to = leaf.valueEnd;
    while (to < block.end && /[ 	]/.test(text[to])) to++;
    if (text[from - 1] === '{' && text[to] === ',') to++;
    return text.slice(0, cut) + (text[from - 1] === ',' ? ' ' : '') + text.slice(to).replace(/^ (?=})/, '');
  }
  let end = leaf.valueEnd;
  while (end > leaf.valueStart && /\s/.test(text[end - 1])) end--;   // keep the space before a closing brace
  return text.slice(0, leaf.valueStart) + formatValue(value) + text.slice(end);
}

module.exports = { applyEdit, findConst, topLevelProps, arrayElements, matchBracket };
