import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Copies the supplied PNG bytes unchanged. No image encoder, crop, or transform.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = await realpath(process.argv[2] ?? 'C:/Users/Administrator/Desktop/block out/新解锁-个人资料-头像/个人资料界面');
const archiveRoot = resolve(root, 'art-source/ui/profile-supplied-v2');
const runtimeRoot = resolve(root, 'public/assets/art/ui/profile-supplied-v2');
// The rename-entry icon was supplied separately after the folder import.
const editNameSource = await realpath(process.argv[3] ?? 'C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-24621c2f-4b1e-49dc-99c3-d7205815c3b6.png');
const editor = '头像-头像框界面';
const rename = '修改昵称界面';
const slices = [
  ['statsPanel', '底.png', 'stats-panel.png'],
  ['editorPanel', `${editor}/底.png`, 'editor-panel.png'],
  ['renamePanel', `${rename}/底.png`, 'rename-panel.png'],
  ['titleZh', '文字1.png', 'title-zh.png'],
  ['titleEn', '文字2.png', 'title-en.png'],
  ['close', '关闭.png', 'close.png'],
  ['idField', 'ID 底.png', 'id-field.png'],
  ['statCard', '道具底.png', 'stat-card.png'],
  ['statValue', '数字底.png', 'stat-value.png'],
  ['statHighest', '道具3.png', 'stat-highest.png'],
  ['statStars', '道具2.png', 'stat-stars.png'],
  ['statRank', '道具1.png', 'stat-rank.png'],
  ['editBadge', '0.png', 'edit-badge.png'],
  ['editName', editNameSource, 'edit-name.png'],
  ['copy', '1.png', 'copy.png'],
  ['sparkle', '2.png', 'sparkle.png'],
  ['joined', '3.png', 'joined.png'],
  ['avatarPage', `${editor}/头像.png`, 'avatar-page.png'],
  ['framePage', `${editor}/头像框.png`, 'frame-page.png'],
  ['catalogPanel', `${editor}/头像底.png`, 'catalog-panel.png'],
  ['tabButton', `${editor}/选着按钮.png`, 'tab-button.png'],
  ['selected', `${editor}/选中.png`, 'selected.png'],
  ['saveButton', `${editor}/按钮.png`, 'save-button.png'],
  ['renameButton', `${rename}/按钮.png`, 'rename-button.png'],
  ['renameInput', `${rename}/昵称调.png`, 'rename-input.png'],
  ['coin', `${rename}/金币.png`, 'coin.png'],
  ...Array.from({ length: 20 }, (_, index) => [`avatar${index}`, `${editor}/头像/${index + 1}.png`, `avatar-${index}.png`]),
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const slash = path => path.replaceAll('\\', '/');
const sourceNames = new Set();
const targetNames = new Set();
const rows = [];
for (const [key, source, file] of slices) {
  assert(!sourceNames.has(source) && !targetNames.has(file), 'Duplicate source or target');
  sourceNames.add(source); targetNames.add(file);
  const from = resolve(sourceRoot, source);
  assert(key === 'editName' ? from === editNameSource : !relative(sourceRoot, from).startsWith('..'), 'Source escapes supplied directory');
  const bytes = await readFile(from);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Not a PNG: ' + source);
  const targets = [resolve(archiveRoot, file), resolve(runtimeRoot, file)];
  for (const target of targets) {
    const existing = await readFile(target).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return undefined;
    });
    assert(!existing || existing.equals(bytes), 'Refusing to overwrite different existing asset: ' + target);
  }
  rows.push({ key, source, file, from, targets, bytes, sha256: sha(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
}
for (const row of rows) {
  for (const target of row.targets) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(row.from, target);
    assert.equal(sha(await readFile(target)), row.sha256, 'Copied PNG changed: ' + target);
  }
}
const provenance = {
  schemaVersion: 1, suppliedOn: '2026-10-14', sourceRoot: slash(sourceRoot),
  operation: 'Byte-identical PNG copies; no re-encoding, resizing, cropping, rotation, or generated pixels.',
  avatarMapping: 'User authorized replacing 20 avatars while retaining unlock rules. Implementation mapping, announced in chat: source 1..20 replaces stable avatar IDs 0..19 in order. IDs 20..24, all 19 frame IDs, and unlock rules remain unchanged.',
  excluded: ['All 示意图 images (reference only)', 'Duplicate editor title images and duplicate close images'],
  assets: rows.map(row => ({ key: row.key, source: slash(row.from), sourceRelative: row.key === 'editName' ? null : row.source,
    archive: slash(relative(root, row.targets[0])), runtime: slash(relative(root, row.targets[1])),
    width: row.width, height: row.height, bytes: row.bytes.length,
    sourceSha256: row.sha256, archiveSha256: row.sha256, runtimeSha256: row.sha256 })),
};
await writeFile(resolve(archiveRoot, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ copied: rows.length, bytesPerTree: rows.reduce((sum, row) => sum + row.bytes.length, 0), provenance: slash(relative(root, resolve(archiveRoot, 'provenance.json'))) }, null, 2));
