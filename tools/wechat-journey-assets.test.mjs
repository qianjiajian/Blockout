import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import test from 'node:test';
import { snapshotDirectory } from '../scripts/wechat-build-integrity.mjs';
import { encodeWechatImage, prepareWechatImages, wechatImagePath } from '../scripts/wechat-image-formats.mjs';
import { prepareWechatJourneyThemes, WECHAT_JOURNEY_HOME_THEME_NAMES } from '../scripts/wechat-journey-assets.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'public/assets/art/ui/formal-pages/journey');
const chapterNames = [
  ...Array.from({ length: 10 }, (_, index) => `episode-${String(index + 1).padStart(2, '0')}.webp`),
  'episode-locked-shade.png', 'episode-range-panel.png',
  'episode-selected-button.png', 'episode-action-button.png',
];

async function inTemporaryDirectory(callback) {
  const parent = await realpath(tmpdir());
  const directory = await mkdtemp(resolve(parent, 'block-out-journey-test-'));
  try { return await callback(directory); }
  finally {
    const actual = await realpath(directory);
    assert.equal(dirname(actual), parent);
    assert.ok(basename(actual).startsWith('block-out-journey-test-'));
    await rm(actual, { recursive: true, force: true });
  }
}

test('Journey cards render from meta-ui while only the nine Home backgrounds ship in journey-themes', async () => {
  await inTemporaryDirectory(async (output) => {
    const metaJourney = resolve(output, 'meta-ui/formal-pages/journey');
    await mkdir(metaJourney, { recursive: true });
    const names = [...chapterNames, ...WECHAT_JOURNEY_HOME_THEME_NAMES];
    for (const name of names) await cp(resolve(source, name), resolve(metaJourney, name));
    await writeFile(resolve(metaJourney, 'unrelated.txt'), 'leave other Journey UI in meta-ui');
    const before = await snapshotDirectory(source);

    await prepareWechatJourneyThemes(root, output);
    const moved = await snapshotDirectory(output);
    assert.deepEqual(moved.map(({ path }) => path).sort(), [
      ...chapterNames.map(name => `meta-ui/formal-pages/journey/${name}`),
      'meta-ui/formal-pages/journey/unrelated.txt',
      'journey-themes/game.js',
      ...Array.from({ length: 9 }, (_, index) => `journey-themes/home-${String(index + 2).padStart(2, '0')}.jpg`),
    ].sort());

    await prepareWechatImages(output);
    let previousAssetBytes = 0;
    let currentAssetBytes = 0;
    for (const name of names) {
      const oldEncoded = await encodeWechatImage(resolve(source, name), `journey-themes/${name}`);
      const packageDirectory = name.startsWith('home-') ? 'journey-themes' : 'meta-ui/formal-pages/journey';
      const built = await readFile(resolve(output, packageDirectory, wechatImagePath(name)));
      assert.deepEqual(built, oldEncoded, `${name}: relocation must preserve the existing native encoding`);
      previousAssetBytes += oldEncoded.length;
      currentAssetBytes += built.length;
    }
    assert.equal(currentAssetBytes, previousAssetBytes, 'relocation must not duplicate or grow encoded art');
    assert.deepEqual(await snapshotDirectory(source), before, 'authored/Web images must remain unchanged');
    assert.deepEqual(await readFile(resolve(output, 'journey-themes/game.js')),
      await readFile(resolve(root, 'wechat/journey-themes/game.js')));
    assert.equal(await readFile(resolve(metaJourney, 'unrelated.txt'), 'utf8'), 'leave other Journey UI in meta-ui');
  });
});
