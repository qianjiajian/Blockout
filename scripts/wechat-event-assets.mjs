import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { listFiles } from './wechat-build-integrity.mjs';
import { WECHAT_RESOURCE_EXCLUSIONS } from './wechat-resource-policy.mjs';

export const EVENT_ART_PACKAGES = ['league-ui', 'event-ui'];
export const EVENT_UI_GROUPS = ['daily-challenge-supplied-v1', 'daily-success-supplied-v1',
  'profile-reference-v1', 'profile-unlocks-v1', 'profile-supplied-v2', 'profile-frames-supplied-v1', 'icons', 'notifications'];
// The generated paths keep the authored suffixes, allowing the native image
// encoder and verifier to apply the same format policy before/after relocation.
export function wechatEventArtPath(source) {
  if (/^art\/ui\/league-video-v1\/background\.(?:png|jpg)$/.test(source)) return 'event-ui/league-video-v1/' + source.split('/').at(-1);
  if (source.startsWith('art/ui/league-video-v1/')) return 'league-ui/league-video-v1/' + source.slice('art/ui/league-video-v1/'.length);
  if (source.startsWith('art/ui/league-rank-badges-v2/')) return 'league-ui/league-rank-badges-v2/' + source.slice('art/ui/league-rank-badges-v2/'.length);
  if (source.startsWith('art/ui/league-supplied-v1/')) return 'league-ui/league-supplied-v1/' + source.slice('art/ui/league-supplied-v1/'.length);
  if (source.startsWith('art/ui/league-settlement-supplied-v1/')) return 'league-ui/league-settlement-supplied-v1/' + source.slice('art/ui/league-settlement-supplied-v1/'.length);
  if (source.startsWith('art/ui/daily-challenge-v2/')) return 'event-ui/daily-challenge-v2/' + source.slice('art/ui/daily-challenge-v2/'.length);
  if (source === 'art/ui/icons/tutorial-hand-supplied-v2.png') return 'event-ui/tutorial-hand-supplied-v2.png';
  if (source.startsWith('art/ui/formal-pages/booster-purchase-reference-v1/')) {
    return 'event-ui/booster-purchase-reference-v1/' + source.slice('art/ui/formal-pages/booster-purchase-reference-v1/'.length);
  }
  if (EVENT_UI_GROUPS.some(group => source.startsWith('art/ui/' + group + '/'))) return 'event-ui/' + source.slice('art/ui/'.length);
  return null;
}

export async function prepareWechatEventArt(root, output) {
  const actualRoot = await realpath(root), actualOutput = await realpath(output);
  const rel = relative(actualRoot, actualOutput).replaceAll('\\', '/');
  assert(rel === 'dist-wechat' || (rel.startsWith('.codex-temp/') && !rel.split('/').includes('..')), 'Unsafe event asset output');
  const rows = [];
  for (const source of await listFiles(resolve(root, 'public/assets'))) {
    if (WECHAT_RESOURCE_EXCLUSIONS.some(entry => entry.source === source)) continue;
    const target = wechatEventArtPath(source);
    if (!target) continue;
    const from = source.startsWith('art/ui/formal-pages/')
      ? resolve(actualOutput, 'meta-ui/formal-pages', source.slice('art/ui/formal-pages/'.length))
      : resolve(actualOutput, 'assets', source);
    const to = resolve(actualOutput, target);
    assert.equal(await realpath(from), from, 'Generated asset must not be a link');
    assert((await readFile(from)).equals(await readFile(resolve(root, 'public/assets', source))), 'Generated event art differs from authored source');
    assert(relative(actualOutput, to).replaceAll('\\', '/') === target, 'Event art escapes output');
    rows.push({ source, target, from, to });
  }
  assert(rows.length > 20, 'Event art inventory missing');
  for (const name of EVENT_ART_PACKAGES) {
    await mkdir(resolve(output, name), { recursive: true });
    await copyFile(resolve(root, 'wechat', name, 'game.js'), resolve(output, name, 'game.js'));
  }
  for (const row of rows) {
    await mkdir(dirname(row.to), { recursive: true });
    await copyFile(row.from, row.to);
    // Delete only the exact generated copy that was validated above.
    await rm(row.from);
  }
  return rows.map(({ source, target }) => ({ source, target }));
}
