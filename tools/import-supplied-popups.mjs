import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const suppliedRoot = 'C:/Users/Administrator/Desktop/block out/1-5界面UI';
const sourceRoot = 'art-source/ui/supplied-popups-v1';
const runtimeRoot = 'public/assets/art/ui/formal-pages/supplied-popups-v1';
const groups = {
  booster: { folder: '道具购买界面', files: {
    panel: '底', 'ad-button': '按钮1', 'buy-button': '按钮2', close: '关闭',
    time: '道具1', pulse: '道具2', rocket: '道具3', 'coin-icon': '金币图标', 'video-icon': '图标2',
  } },
  painting: { folder: '获得新名画', files: {
    banner: '底', 'title-zh': '文字1', 'title-en': '文字2', 'continue-button': '按钮', close: '关闭',
  } },
  settlement: { folder: '结算界面1', files: {
    panel: '大底', 'title-en': '文字1', 'title-zh': '文字2', 'level-badge': '等级低',
    'star-center': '星1', 'star-side': '星2', 'star-empty': '星3', 'criterion-row': '文字底',
    'criterion-pass': '图标1', 'criterion-idle': '图标2', 'coin-pile': '金币', 'reward-pill': '数字底',
    'coin-icon': '图标', 'continue-button': '按钮', close: '关闭', 'unlock-panel': '解锁低',
    'progress-track': '进度块低', 'progress-fill': '进度块', 'unlock-crown': '图标4',
    'unlock-check': '0', 'artwork-frame': '名画边框',
  } },
  rank: { folder: '排名提升', files: {
    panel: '底', 'title-zh': '文字1', 'title-en': '文字2', 'rank-arrow': '箭头1', 'gain-arrow': '箭头2',
  } },
  scene: { folder: '新场景解锁界面', files: {
    'confirm-button': '按钮', 'range-panel': '板', 'locked-hint-panel': '提示底', 'title-zh': '文字1', 'title-en': '文字2',
  } },
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = [], entries = [];
for (const [group, spec] of Object.entries(groups)) {
  const archivedDir = `${sourceRoot}/originals/${group}`;
  await mkdir(archivedDir, { recursive: true });
  await mkdir(`${runtimeRoot}/${group}`, { recursive: true });
  for (const filename of await readdir(`${suppliedRoot}/${spec.folder}`)) {
    if (!filename.endsWith('.png')) throw new Error(`Unexpected source: ${filename}`);
    const supplied = `${suppliedRoot}/${spec.folder}/${filename}`;
    const archived = `${archivedDir}/${filename}`;
    await copyFile(supplied, archived);
    const bytes = await readFile(supplied), metadata = await sharp(bytes).metadata();
    inventory.push({ group, filename, bytes: bytes.length, sha256: sha(bytes), width: metadata.width,
      height: metadata.height, alpha: metadata.hasAlpha, archived });
  }
  for (const [name, original] of Object.entries(spec.files)) {
    const filename = original + '.png';
    const source = `${archivedDir}/${filename}`;
    const runtime = `${runtimeRoot}/${group}/${name}.png`;
    await copyFile(source, runtime);
    const item = inventory.find(row => row.group === group && row.filename === filename);
    entries.push({ key: `ui.suppliedPopups.${group}.${name}`, source: source.slice('art-source/'.length),
      runtime: '../' + runtime, width: item.width, height: item.height, alpha: item.alpha,
      grid: [1, 1], transform: 'copy',
      ...(group === 'scene' && name === 'locked-hint-panel' ? {} : { loadGroup: `supplied-popup-${group}` }) });
    item.runtime = runtime;
  }
}
const manifestPath = 'art-source/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.assets = manifest.assets.filter(item => !item.key.startsWith('ui.suppliedPopups.')).concat(entries);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(`${sourceRoot}/manifest.json`, JSON.stringify({ sourceRoot: suppliedRoot, groups, inventory }, null, 2) + '\n');
await writeFile(`${sourceRoot}/README.md`, '# 用户提供的五组正式弹窗资源\n\n原始PNG逐字节归档于 originals；运行切图按英文语义名直接复制，未重绘、裁切或有损编码。示意图1的字号标注用于布局，示意图2用于视觉比对，均不进入运行资源。\n\n“获得新名画”的十张编号图实际为旅程风景参考（1/2/5/4/5-1/6/7/8/9/10），仅归档，不替换游戏真实40幅名画图集，以免图文错配。新名画与新场景使用各自真实业务数据；参考图中的关号、金币、名次与字号标记不是新增规则。\n');
console.log(JSON.stringify({ archived: inventory.length, runtime: entries.length,
  runtimeBytes: inventory.filter(row => row.runtime).reduce((sum, row) => sum + row.bytes, 0),
  manifest: resolve(sourceRoot, 'manifest.json') }, null, 2));
