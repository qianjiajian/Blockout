import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = 'assets/art/gameplay/mechanics/shutter-nine-slice-v1';
export const SHUTTER_SOURCES = [
  ['panel', 11], ['top-left', 8], ['top-right', 6], ['bottom-left', 2],
  ['bottom-right', 4], ['top', 7], ['bottom', 3], ['left', 9], ['right', 5],
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export async function importShutterNineSlice(sourceDirectory) {
  const directory = resolve(root, 'public', destination);
  await mkdir(directory, { recursive: true });
  const entries = [];
  for (const [part, layer] of SHUTTER_SOURCES) {
    const source = `图层 ${layer}.png`, url = `${destination}/${part}.png`;
    const original = resolve(sourceDirectory, source), bytes = await readFile(original);
    const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    await copyFile(original, resolve(root, 'public', url));
    entries.push({ part, source, url, width: decoded.info.width, height: decoded.info.height,
      bytes: bytes.length, sha256: sha(bytes), rgbaSha256: sha(decoded.data) });
  }
  const manifest = { schemaVersion: 1, sourceDirectory, technique: 'nine-slice, whole fixed-size corners, one-axis edge stretching',
    excludedReferences: ['示意.png'], totalRuntimePngBytes: entries.reduce((n, e) => n + e.bytes, 0), entries };
  await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export async function verifyShutterNineSlice() {
  const manifest = JSON.parse(await readFile(resolve(root, 'public', destination, 'manifest.json'), 'utf8'));
  if (manifest.entries.length !== 9) throw new Error('Expected 9 original shutter components');
  for (const entry of manifest.entries) {
    const bytes = await readFile(resolve(root, 'public', entry.url));
    const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (sha(bytes) !== entry.sha256 || sha(decoded.data) !== entry.rgbaSha256
      || bytes.length !== entry.bytes || decoded.info.width !== entry.width || decoded.info.height !== entry.height) {
      throw new Error(`Shutter original drift: ${entry.url}`);
    }
  }
  return { entries: 9, bytes: manifest.totalRuntimePngBytes, exactOriginals: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(process.argv[2] === '--verify' ? await verifyShutterNineSlice()
    : await importShutterNineSlice(process.argv[2] ?? 'C:/Users/Administrator/Desktop/block out/框切/框切'), null, 2));
}
