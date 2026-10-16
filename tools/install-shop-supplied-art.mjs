import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Copy supplied PNGs unchanged. References are archived outside the runtime tree.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = await realpath(process.argv[2] ?? 'C:/Users/Administrator/Desktop/block out/商城界面-未解锁/商城界面');
const archiveRoot = resolve(root, 'art-source/ui/shop-supplied-v1');
const runtimeRoot = resolve(root, 'public/assets/art/ui/formal-pages/shop-supplied-v1');
const slices = [
  ['panel', '底.png', 'panel.png'],
  ['buttonGreen', '按钮1.png', 'button-green.png'],
  ['buttonYellow', '按钮2.png', 'button-yellow.png'],
  ['rewardInspiration', '道具1.png', 'reward-inspiration.png'],
  ['rewardCoins', '道具2.png', 'reward-coins.png'],
  ['rewardLife', '道具3.png', 'reward-life.png'],
  ['boosterTime', '道具4.png', 'booster-time.png'],
  ['boosterRocket', '道具5.png', 'booster-rocket.png'],
  ['boosterPulse', '道具6.png', 'booster-pulse.png'],
  ['resourceCoins', '小图标1.png', 'resource-coins.png'],
  ['resourceInspiration', '小图标2.png', 'resource-inspiration.png'],
  ['resourceLife', '小图标3.png', 'resource-life.png'],
  ['video', '广告.png', 'video.png'],
  ['gift', '图标4.png', 'gift.png'],
  ['clock', '小图标时间.png', 'clock.png'],
  ['walletPanel', '数字底.png', 'wallet-panel.png'],
  ['remainingPanel', '今日剩余底.png', 'remaining-panel.png'],
  ['sharedRemainingPanel', '今日共剩余底.png', 'shared-remaining-panel.png'],
  ['stockPanel', '库存底.png', 'stock-panel.png'],
  ['choicePanel', '任选一种底.png', 'choice-panel.png'],
  ['boosterTitlePanel', '自选道具底.png', 'booster-title-panel.png'],
  ['selected', '选中框.png', 'selected.png'],
  ['line', '线.png', 'line.png'],
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const slash = path => path.replaceAll('\\', '/');
const rows = [];
assert.equal(new Set(slices.map(row => row[1])).size, slices.length);
assert.equal(new Set(slices.map(row => row[2])).size, slices.length);
for (const [key, source, file] of [...slices,
  ['referenceAnnotated', '示意图1.png', 'reference-annotated.png'],
  ['reference', '示意图2.png', 'reference.png'],
]) {
  const from = resolve(sourceRoot, source);
  assert(!relative(sourceRoot, from).startsWith('..'), 'Source escapes supplied directory');
  const bytes = await readFile(from);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Not PNG: ' + source);
  const referenceOnly = key.startsWith('reference');
  const targets = [resolve(archiveRoot, file), ...(referenceOnly ? [] : [resolve(runtimeRoot, file)])];
  for (const target of targets) {
    const existing = await readFile(target).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return undefined;
    });
    assert(!existing || existing.equals(bytes), 'Refusing to overwrite differing asset: ' + target);
  }
  rows.push({ key, source, from, targets, bytes, referenceOnly, sha256: sha(bytes) });
}
for (const row of rows) for (const target of row.targets) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(row.from, target);
  assert.equal(sha(await readFile(target)), row.sha256, 'Copy mismatch: ' + target);
}
const metadata = row => ({
  key: row.key, source: slash(row.from), sourceRelative: row.source,
  archive: slash(relative(root, row.targets[0])),
  ...(row.referenceOnly ? {} : { runtime: slash(relative(root, row.targets[1])) }),
  width: row.bytes.readUInt32BE(16), height: row.bytes.readUInt32BE(20), bytes: row.bytes.length,
  sourceSha256: row.sha256, archiveSha256: row.sha256,
  ...(row.referenceOnly ? {} : { runtimeSha256: row.sha256 }),
});
await writeFile(resolve(archiveRoot, 'provenance.json'), JSON.stringify({
  schemaVersion: 1, suppliedOn: '2026-10-14', sourceRoot: slash(sourceRoot),
  operation: 'Byte-identical PNG copies; no resizing, cropping, re-encoding, rotation, or generated pixels.',
  referencePolicy: 'Reference numbers are placeholders. Rewards, balances, daily limits and inventory come from the existing game state.',
  assets: rows.filter(row => !row.referenceOnly).map(metadata),
  references: rows.filter(row => row.referenceOnly).map(metadata),
}, null, 2) + '\n');
console.log(JSON.stringify({ runtimeImages: slices.length,
  runtimeBytes: rows.filter(row => !row.referenceOnly).reduce((sum, row) => sum + row.bytes.length, 0),
  archiveOnlyReferences: 2, provenance: 'art-source/ui/shop-supplied-v1/provenance.json' }, null, 2));
