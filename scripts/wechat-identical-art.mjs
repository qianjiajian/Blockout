import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, rm, realpath} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {listFiles} from './wechat-build-integrity.mjs';
import sharp from 'sharp';
import {wechatEventArtPath} from './wechat-event-assets.mjs';

// Build-only URL aliases. Authored/Web assets remain untouched. No pixel
// approximation: original RGBA and final native encodings must both match.
export const IDENTICAL_ART_PAIRS = [
  ['leaderboard/background.png', 'collection/background.png'],
  ['journey/title-panel.png', 'collection/title-panel.png'],
  ['leaderboard/title-panel.png', 'collection/title-panel.png'],
  ['journey/top-header.png', 'collection/top-header.png'],
  ['leaderboard/top-header.png', 'collection/top-header.png'],
  ['overlays/win/coin-pile.png', 'journey/presentation-reward-coins.png'],
].map(([from, to]) => ['art/ui/formal-pages/' + from, 'art/ui/formal-pages/' + to]).concat([
  ['art/ui/home-v3/top-header.png', 'art/ui/formal-pages/collection/top-header.png'],
  ['art/ui/league-supplied-v1/top-header.png', 'art/ui/formal-pages/collection/top-header.png'],
  ['art/ui/league-supplied-v1/close-button.png', 'art/ui/formal-pages/overlays/pause-settings/close.png'],
  ['art/ui/formal-pages/achievements-v2/claimed-check.png', 'art/ui/formal-pages/daily-tasks-v2/claimed-check.png'],
  ['art/ui/formal-pages/journey/presentation-close.png', 'art/ui/formal-pages/overlays/win/close.png'],
  ...['booster', 'painting', 'settlement'].map(group => [
    `art/ui/formal-pages/supplied-popups-v1/${group}/close.png`, 'art/ui/formal-pages/daily-tasks-v2/close.png',
  ]),
  ['art/ui/formal-pages/supplied-popups-v1/booster/buy-button.png', 'art/ui/formal-pages/overlays/pause-settings/home-button.png'],
  ['art/ui/formal-pages/supplied-popups-v1/booster/ad-button.png', 'art/ui/formal-pages/overlays/pause-settings/replay-button.png'],
  ['art/ui/formal-pages/supplied-popups-v1/booster/coin-icon.png', 'art/ui/formal-pages/supplied-popups-v1/settlement/coin-icon.png'],
  ['art/ui/formal-pages/supplied-popups-v1/painting/continue-button.png', 'art/ui/formal-pages/supplied-popups-v1/settlement/continue-button.png'],
]);
const prefix = 'assets/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function localPath(p) {
  assert(typeof p === 'string' && /^[a-z0-9/-]+\.png$/.test(p)
    && !p.startsWith('/') && p.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe art alias path');
  return p;
}
export function generatedArtAliasPath(source) {
  localPath(source);
  const event = wechatEventArtPath(source);
  if (event) return event;
  const formal = 'art/ui/formal-pages/';
  return source.startsWith(formal) ? 'meta-ui/formal-pages/' + source.slice(formal.length) : 'assets/' + source;
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
export async function assertOriginalArtPixelsMatch(a, b, label) {
  const [pa, pb] = await Promise.all([a, b].map(bytes => sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject: true})));
  assert(pa.info.width === pb.info.width && pa.info.height === pb.info.height
    && pa.info.channels === pb.info.channels && pa.data.equals(pb.data), 'Art alias original pixels differ: ' + label);
  return {rgbaSha256: sha(pa.data), width: pa.info.width, height: pa.info.height};
}
export async function createIdenticalArtPlan(root) {
  validateArtAliasPairs(IDENTICAL_ART_PAIRS);
  const rows = [];
  for (const [from, to] of IDENTICAL_ART_PAIRS) {
    const a = await readFile(resolve(root, 'public', prefix, from));
    const b = await readFile(resolve(root, 'public', prefix, to));
    const pixels = await assertOriginalArtPixelsMatch(a, b, from);
    rows.push({from, to, sourceSha256: sha(a), sourceBytes: a.length,
      targetSourceSha256: sha(b), targetSourceBytes: b.length, originalBytesEqual: a.equals(b),
      ...pixels});
  }
  const plan = {schemaVersion: 2, rows};
  rewriteIdenticalArtSource(await readFile(resolve(root, 'src/game/artManifest.ts'), 'utf8'), plan);
  for (const p of await listFiles(resolve(root, 'src'))) {
    if (!/\.[cm]?[jt]sx?$/.test(p)) continue;
    const source = await readFile(resolve(root, 'src', p), 'utf8');
    if (p === 'game/artManifest.ts') rewriteIdenticalArtSource(source, plan);
    else assert(rows.every(row => !source.includes(prefix + row.from)), 'Alias referenced outside artManifest: ' + p);
  }
  return plan;
}
export function deduplicatedArtSnapshot(snapshot, plan, sourcePrefix = 'art/ui/formal-pages') {
  validateArtAliasPairs(plan.rows.map(row => [row.from, row.to]));
  assert(sourcePrefix === '' || /^[a-z0-9/-]+$/.test(sourcePrefix)
    && sourcePrefix.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe art snapshot prefix');
  const qualify = p => sourcePrefix ? sourcePrefix + '/' + p : p;
  const inScope = p => !sourcePrefix || p.startsWith(sourcePrefix + '/');
  const byPath = new Map(snapshot.map(row => [qualify(row.path), row]));
  for (const {from, to} of plan.rows) {
    if (!inScope(from)) continue;
    assert(inScope(to), 'Cross-package alias requires a full source snapshot: ' + from);
    const a = byPath.get(from), b = byPath.get(to);
    assert(a && b && a.bytes === b.bytes && a.sha256 === b.sha256, 'Native art alias mismatch: ' + from);
  }
  const aliases = new Set(plan.rows.map(row => row.from));
  return snapshot.filter(row => !aliases.has(qualify(row.path)));
}
export async function removeGeneratedArtAliases(root, output, plan) {
  const actualRoot = await realpath(root), actualOutput = await realpath(output);
  const rel = relative(actualRoot, actualOutput).replaceAll('\\', '/');
  assert(rel === 'dist-wechat' || (rel.startsWith('.codex-temp/') && !rel.split('/').includes('..')), 'Unsafe generated art output');
  validateArtAliasPairs(plan.rows.map(row => [row.from, row.to]));
  const verified = [];
  for (const {from, to} of plan.rows) {
    const fromOutput = generatedArtAliasPath(from), toOutput = generatedArtAliasPath(to);
    const aliasPath = resolve(actualOutput, fromOutput);
    const canonicalPath = resolve(actualOutput, toOutput);
    const a = await realpath(aliasPath), b = await realpath(canonicalPath);
    assert(a === aliasPath && b === canonicalPath && a !== b, 'Symlinked generated art alias');
    assert(relative(actualOutput, a).replaceAll('\\', '/') === fromOutput
      && relative(actualOutput, b).replaceAll('\\', '/') === toOutput, 'Generated alias escapes output');
    assert((await readFile(a)).equals(await readFile(b)), 'Generated art alias bytes differ: ' + from);
    verified.push(aliasPath);
  }
  // All targets are exact validated generated files; no recursive deletion.
  for (const p of verified) await rm(p);
}
