import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, rm, realpath} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {listFiles} from './wechat-build-integrity.mjs';

// Build-only URL aliases. Authored/Web assets remain untouched. No pixel
// approximation: both original bytes and final native encodings must match.
export const IDENTICAL_ART_PAIRS = [
  ['leaderboard/background.png', 'collection/background.png'],
  ['journey/title-panel.png', 'collection/title-panel.png'],
  ['leaderboard/title-panel.png', 'collection/title-panel.png'],
  ['journey/top-header.png', 'collection/top-header.png'],
  ['leaderboard/top-header.png', 'collection/top-header.png'],
  ['overlays/win/coin-pile.png', 'journey/presentation-reward-coins.png'],
];
const prefix = 'assets/art/ui/formal-pages/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function localPath(p) {
  assert(typeof p === 'string' && /^[a-z0-9/-]+\.png$/.test(p)
    && !p.startsWith('/') && !p.split('/').includes('..'), 'Unsafe art alias path');
  return p;
}
export function validateArtAliasPairs(pairs) {
  assert(Array.isArray(pairs), 'Missing art alias pairs');
  const aliases = new Set();
  for (const [from, to] of pairs) {
    localPath(from); localPath(to);
    assert(from !== to && !aliases.has(from), 'Duplicate/self art alias');
    aliases.add(from);
  }
  assert(pairs.every(([, to]) => !aliases.has(to)), 'Chained/cyclic art alias');
}
export function rewriteIdenticalArtSource(source, plan) {
  validateArtAliasPairs(plan.rows.map(row => [row.from, row.to]));
  for (const {from, to} of plan.rows) {
    const quoted = JSON.stringify(prefix + from);
    assert(source.includes(quoted), 'Missing literal art alias: ' + from);
    source = source.split(quoted).join(JSON.stringify(prefix + to));
  }
  return source;
}
export async function createIdenticalArtPlan(root) {
  validateArtAliasPairs(IDENTICAL_ART_PAIRS);
  const rows = [];
  for (const [from, to] of IDENTICAL_ART_PAIRS) {
    const a = await readFile(resolve(root, 'public', prefix, from));
    const b = await readFile(resolve(root, 'public', prefix, to));
    assert(a.equals(b), 'Art alias originals differ: ' + from);
    rows.push({from, to, sourceSha256: sha(a), sourceBytes: a.length});
  }
  const plan = {schemaVersion: 1, rows};
  rewriteIdenticalArtSource(await readFile(resolve(root, 'src/game/artManifest.ts'), 'utf8'), plan);
  for (const p of await listFiles(resolve(root, 'src'))) {
    if (!/\.[cm]?[jt]sx?$/.test(p)) continue;
    const source = await readFile(resolve(root, 'src', p), 'utf8');
    if (p === 'game/artManifest.ts') rewriteIdenticalArtSource(source, plan);
    else assert(rows.every(row => !source.includes(prefix + row.from)), 'Alias referenced outside artManifest: ' + p);
  }
  return plan;
}
export function deduplicatedArtSnapshot(snapshot, plan) {
  validateArtAliasPairs(plan.rows.map(row => [row.from, row.to]));
  const byPath = new Map(snapshot.map(row => [row.path, row]));
  for (const {from, to} of plan.rows) {
    const a = byPath.get(from), b = byPath.get(to);
    assert(a && b && a.bytes === b.bytes && a.sha256 === b.sha256, 'Native art alias mismatch: ' + from);
  }
  const aliases = new Set(plan.rows.map(row => row.from));
  return snapshot.filter(row => !aliases.has(row.path));
}
export async function removeGeneratedArtAliases(root, output, plan) {
  const actualRoot = await realpath(root), actualOutput = await realpath(output);
  const rel = relative(actualRoot, actualOutput).replaceAll('\\', '/');
  assert(rel === 'dist-wechat' || (rel.startsWith('.codex-temp/') && !rel.split('/').includes('..')), 'Unsafe generated art output');
  validateArtAliasPairs(plan.rows.map(row => [row.from, row.to]));
  const verified = [];
  for (const {from, to} of plan.rows) {
    const aliasPath = resolve(actualOutput, 'meta-ui/formal-pages', from);
    const canonicalPath = resolve(actualOutput, 'meta-ui/formal-pages', to);
    const a = await realpath(aliasPath), b = await realpath(canonicalPath);
    assert(a === aliasPath && b === canonicalPath && a !== b, 'Symlinked generated art alias');
    for (const p of [a, b]) assert(relative(actualOutput, p).replaceAll('\\', '/').startsWith('meta-ui/formal-pages/'), 'Generated alias escapes output');
    assert((await readFile(a)).equals(await readFile(b)), 'Generated art alias bytes differ: ' + from);
    verified.push(aliasPath);
  }
  // All targets are exact validated generated files; no recursive deletion.
  for (const p of verified) await rm(p);
}
