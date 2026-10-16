import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// A byte-for-byte replacement, not an artwork generator or level migration.
const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = 'C:/Users/Administrator/Desktop/block out/方块新/方块新';
const colors = { red: '红', blue: '蓝', green: '绿', yellow: '黄', purple: '紫', orange: '橙', pink: '粉', cyan: '浅蓝' };
const shapes = [
  { shapeId: 13, suffix: 'rectangle-2x3', original: '2X3', width: 191, height: 296 },
  { shapeId: 21, suffix: 'rectangle-3x2', original: '3X2', width: 285, height: 201 },
  { shapeId: 14, suffix: 'square-3x3', original: '3X3', width: 285, height: 296 },
];
const provenancePath = resolve(root, 'art-source/gameplay/blocks/supplemental-v1.json');
const manifestPath = resolve(root, 'art-source/manifest.json');
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = [];
const previous = [];
const inputs = new Map();

// Validate all mappings and files before changing either checked-in asset tree.
for (const [color, prefix] of Object.entries(colors)) {
  for (const shape of shapes) {
    const originalFile = `${prefix}${shape.original}.png`;
    const source = `gameplay/blocks/formal-v1/${color}-${shape.suffix}.png`;
    const bytes = await readFile(resolve(sourceDirectory, originalFile));
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, shape.width, originalFile);
    assert.equal(metadata.height, shape.height, originalFile);
    assert.equal(metadata.hasAlpha, true, originalFile);
    const entries = manifest.assets.filter(asset => asset.source === source);
    assert.equal(entries.length, 1, source);
    const entry = entries[0];
    assert.equal(entry.runtime, `../public/assets/art/${source}`);
    assert.equal(entry.transform, 'copy');
    assert.deepEqual(entry.grid, [1, 1]);
    const oldSource = await readFile(resolve(root, 'art-source', source));
    const oldRuntime = await readFile(resolve(root, 'public/assets/art', source));
    previous.push({ source, sourceSha256: sha256(oldSource), runtimeSha256: sha256(oldRuntime),
      sourceBytes: oldSource.length, runtimeBytes: oldRuntime.length, width: entry.width, height: entry.height });
    assets.push({ color, shapeId: shape.shapeId, originalFile, source,
      width: shape.width, height: shape.height, bytes: bytes.length, sha256: sha256(bytes) });
    inputs.set(source, bytes);
    entry.width = shape.width;
    entry.height = shape.height;
  }
}
assert.deepEqual((await readdir(sourceDirectory)).filter(name => /\.png$/i.test(name)).sort(),
  assets.map(asset => asset.originalFile).sort());

const output = resolve(root, `deliverables/formal-rectangle-assets-20261012-${Date.now()}`);
await mkdir(output, { recursive: false });
await copyFile(provenancePath, resolve(output, 'previous-provenance.json'));
await writeFile(resolve(output, 'previous-art-manifest.json'), manifestBytes);
for (const asset of assets) {
  for (const [tree, folder] of [['source', 'art-source'], ['runtime', 'public/assets/art']]) {
    const filename = asset.source.split('/').at(-1);
    await mkdir(resolve(output, 'previous', tree), { recursive: true });
    await copyFile(resolve(root, folder, asset.source), resolve(output, 'previous', tree, filename));
  }
}
for (const asset of assets) {
  // Preserve the exact preflighted PNG bytes: no crop, resize, rotation or encoding.
  for (const folder of ['art-source', 'public/assets/art']) {
    await writeFile(resolve(root, folder, asset.source), inputs.get(asset.source));
    assert.equal(sha256(await readFile(resolve(root, folder, asset.source))), asset.sha256);
  }
}
const provenance = { schemaVersion: 1, importedAt: '2026-10-12', sourceDirectory, transform: 'copy',
  description: 'User-supplied formal upright 2x3, 3x2 and 3x3 block artwork. Original PNG bytes, dimensions, alpha and orientation preserved; no level, collision or gameplay changes.', assets };
// Mechanical metadata refresh limited to the 24 approved asset entries.
await writeFile(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const report = { status: 'PASS', sourceDirectory, transform: 'copy', count: assets.length, previous, assets,
  runtimeBytesBefore: previous.reduce((sum, entry) => sum + entry.runtimeBytes, 0),
  runtimeBytesAfter: assets.reduce((sum, entry) => sum + entry.bytes, 0),
  gameplayModified: false, wechatBuilt: false, published: false };
await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, count: assets.length, output,
  runtimeBytesBefore: report.runtimeBytesBefore, runtimeBytesAfter: report.runtimeBytesAfter }));
