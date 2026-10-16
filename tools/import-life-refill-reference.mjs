import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const source = resolve('art-source/ui/life-refill-reference-v1');
const runtime = resolve('public/assets/art/ui/formal-pages/life-refill-reference-v1');
await mkdir(source, { recursive: true });
await mkdir(runtime, { recursive: true });
const generated = 'C:/Users/Administrator/.codex/generated_images/01a1196f-7ca9-7a13-a49c-4f4ced5b0b8b/exec-0c6a43d5-8536-400b-9a6e-bab9e678a3bb.png';
await copyFile(generated, resolve(source, 'generated.png'));
await copyFile('C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-71b70592-6d6f-4983-ae6a-67e9b1f331a3.png', resolve(source, 'reference.png'));
await sharp(generated).extract({ left: 170, top: 60, width: 810, height: 1280 })
  .resize({ width: 534 }).png().toFile(resolve(source, 'panel.png'));
await copyFile(resolve(source, 'panel.png'), resolve(runtime, 'panel.png'));
const manifestPath = resolve('art-source/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const dimensions = await sharp(resolve(source, 'panel.png')).metadata();
manifest.assets.push({ key: 'ui.lifeRefill.referencePanel', source: 'ui/life-refill-reference-v1/panel.png',
  runtime: '../public/assets/art/ui/formal-pages/life-refill-reference-v1/panel.png',
  width: dimensions.width, height: dimensions.height, alpha: true, grid: [1, 1], transform: 'copy', loadGroup: 'life-refill' });
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(resolve(source, 'README.md'), '# 体力补充参考弹窗\n\n内置 ImageGen 按用户示意图1提取重制；保紫色面板、心形、倒计时底板、广告与补满按钮。不是逐像素提取，生成细节有差异。运行素材只裁透明外边距并等比缩小，动态文字/体力/价格由真实运行状态绘制。\n\n最终提示词：Extract ONLY the central More Lives popup; preserve original layout, purple body, heart, clock, ad/refill buttons and close; remove all text and numbers, preserve X/play triangle/gold coin, true alpha transparency.\n');
console.log({ width: dimensions.width, height: dimensions.height, sha256: createHash('sha256').update(await readFile(resolve(source, 'panel.png'))).digest('hex') });
