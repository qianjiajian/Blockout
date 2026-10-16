import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const suppliedRoot = 'C:/Users/Administrator/Desktop/block out/新解锁-个人资料-头像/新功能解锁';
const sourceRoot = 'art-source/ui/feature-unlock-supplied-v1';
const runtimeRoot = 'public/assets/art/ui/formal-pages/feature-unlock-supplied-v1';
const mappings = [
  ['panel', '底.png', 594, 844],
  ['title-zh', '文字2.png', 356, 94],
  ['title-en', '文字1.png', 381, 99],
  ['glow', '光.png', 372, 372],
  ['sparkles', '星.png', 345, 273],
  ['rank-icon', '图层 52.png', 235, 211],
  ['name-left', '排行装饰1.png', 54, 68],
  ['name-right', '排行装饰2.png', 55, 68],
  ['divider', '线.png', 448, 26],
  ['button', '按钮.png', 305, 91],
  ['later-line', '稍后提示线.png', 521, 5],
];
const references = ['示意图1.png', '示意图2.png', '示意图3.png'];
const expectedFiles = [...mappings.map(([, file]) => file), ...references].sort();
const suppliedFiles = (await readdir(suppliedRoot)).sort();
if (JSON.stringify(suppliedFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error('The supplied feature-unlock folder must contain exactly the 11 reviewed PNGs and 3 reference PNGs.');
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = [];
// Inspect every input before writing; images are copied byte-for-byte, never encoded.
for (const file of expectedFiles) {
  const bytes = await readFile(resolve(suppliedRoot, file));
  const metadata = await sharp(bytes).metadata();
  const mapping = mappings.find(([, original]) => original === file);
  const expectedSize = mapping ? mapping.slice(2) : [720, 1584];
  if (metadata.format !== 'png' || metadata.width !== expectedSize[0] || metadata.height !== expectedSize[1]
    || Boolean(metadata.hasAlpha) !== Boolean(mapping)) throw new Error(`Unexpected supplied PNG geometry/alpha: ${file}`);
  inventory.push({ file, role: mapping ? 'runtime-cutout' : 'reference-only',
    width: metadata.width, height: metadata.height, alpha: metadata.hasAlpha,
    bytes: bytes.length, sourceSha256: sha256(bytes),
    archived: `${sourceRoot}/originals/${file}`,
    ...(mapping ? { runtimeName: mapping[0], runtime: `${runtimeRoot}/${mapping[0]}.png` } : {}),
  });
}

await mkdir(resolve(root, sourceRoot, 'originals'), { recursive: true });
await mkdir(resolve(root, runtimeRoot), { recursive: true });
for (const item of inventory) {
  await copyFile(resolve(suppliedRoot, item.file), resolve(root, item.archived));
  item.archivedSha256 = sha256(await readFile(resolve(root, item.archived)));
  if (item.archivedSha256 !== item.sourceSha256) throw new Error(`Archive byte mismatch: ${item.file}`);
  if (item.runtime) {
    await copyFile(resolve(root, item.archived), resolve(root, item.runtime));
    item.runtimeSha256 = sha256(await readFile(resolve(root, item.runtime)));
    if (item.runtimeSha256 !== item.sourceSha256) throw new Error(`Runtime byte mismatch: ${item.file}`);
  }
}

const entries = mappings.map(([name, file]) => {
  const item = inventory.find(row => row.file === file);
  return { key: `ui.featureUnlockSupplied.${name}`, source: item.archived.slice('art-source/'.length),
    runtime: '../' + item.runtime, width: item.width, height: item.height, alpha: item.alpha,
    grid: [1, 1], transform: 'copy', loadGroup: 'feature-unlock' };
});
// Reread immediately before the narrow update so unrelated manifest additions survive.
const manifestPath = resolve(root, 'art-source/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const entry of entries) {
  const existing = manifest.assets.find(asset => asset.key === entry.key);
  if (existing && (existing.source !== entry.source || existing.runtime !== entry.runtime)) {
    throw new Error(`Existing asset ownership conflict: ${entry.key}`);
  }
  const otherOwner = manifest.assets.find(asset => asset.runtime === entry.runtime && asset.key !== entry.key);
  if (otherOwner) throw new Error(`Runtime path already belongs to ${otherOwner.key}`);
}
const keys = new Set(entries.map(entry => entry.key));
manifest.assets = manifest.assets.filter(asset => !keys.has(asset.key)).concat(entries);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const sourceManifest = {
  sourceRoot: suppliedRoot,
  contract: 'User-supplied formal PNGs copied verbatim: no redraw, resize, crop, rotation, recompression, or color/alpha changes.',
  loadGroup: 'feature-unlock',
  runtimeRoot,
  archivedCount: inventory.length,
  runtimeCount: entries.length,
  runtimeBytes: inventory.filter(item => item.runtime).reduce((sum, item) => sum + item.bytes, 0),
  decodedRuntimeRgbaBytes: entries.reduce((sum, entry) => sum + entry.width * entry.height * 4, 0),
  referenceAudit: {
    artboard: { width: 720, height: 1584 },
    selectedReference: '示意图3.png',
    references: {
      '示意图1.png': 'Annotated version of reference 2: feature name 62, description 23, primary/later labels 41.',
      '示意图2.png': 'Clean reference with a large purple/gold winged medal. No separate medal cutout is supplied in this folder.',
      '示意图3.png': 'Clean reference using the supplied star-shield trophy (图层 52.png) for ranking. Other features retain their respective existing formal icons.',
    },
    bakedText: { '文字2.png': '新功能解锁', '文字1.png': 'NEW FEATURE UNLOCKED' },
    dynamicText: ['feature name', 'feature description', 'primary action', 'later action'],
    nativePlacementsInReference3: {
      panel: { x: 63, y: 306, width: 594, height: 844 },
      'title-zh': { x: 185, y: 328, width: 356, height: 94 },
      'rank-icon': { x: 234, y: 539, width: 235, height: 211 },
      sparkles: { x: 195, y: 507, width: 345, height: 273 },
      'name-left': { x: 244, y: 793, width: 54, height: 68 },
      'name-right': { x: 412, y: 793, width: 55, height: 68 },
      divider: { x: 136, y: 859, width: 448, height: 26 },
      button: { x: 207, y: 977, width: 305, height: 91 },
      'later-line': { x: 100, y: 1257, width: 521, height: 5 },
    },
    placementEvidence: 'All 14 PNGs visually inspected. Native title/icon/sparkles/laurels/divider positions confirmed using zero-error matches of sampled opaque source pixels in reference 3. Panel/button/later-line positions are visual estimates; no runtime rendering equivalence is claimed.',
    layoutNotes: 'Panel width is 82.5% of artboard width. Later action sits outside the panel. Preserve native alpha margins; the glow and sparkles are separate transparent effects. Only reference PNGs contain background gameplay, example values, and button/feature text.',
  },
  inventory,
};
await writeFile(resolve(root, sourceRoot, 'manifest.json'), JSON.stringify(sourceManifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ archived: inventory.length, runtime: entries.length,
  runtimeBytes: sourceManifest.runtimeBytes, decodedRgbaBytes: sourceManifest.decodedRuntimeRgbaBytes,
  byteIdentity: 'all source/archive/runtime SHA256 values match',
  manifest: resolve(root, sourceRoot, 'manifest.json') }, null, 2));
