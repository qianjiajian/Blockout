import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWechatLevelModule } from '../scripts/wechat-level-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.env.WECHAT_OUTPUT_DIR?.trim() || 'dist-wechat');
const manifestPath = `${output}.build-manifest.json`;
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const current = await createWechatLevelModule(root);
const stat = async relative => {
  const file = path.join(output, relative);
  const info = await fs.stat(file);
  return { file: relative, bytes: info.size, modifiedAt: info.mtime.toISOString() };
};
const result = {
  output,
  packageFiles: await Promise.all(['game.js', 'game.json', 'project.config.json'].map(stat)),
  manifestLevelHash: manifest.levelCompilation.levelJsonSha256,
  currentLevelHash: current.report.levelJsonSha256,
  manifestGeneratedModuleHash: manifest.levelCompilation.generatedModuleSha256,
  currentGeneratedModuleHash: current.report.generatedModuleSha256,
  packageMatchesCurrentSource: manifest.levelCompilation.levelJsonSha256 === current.report.levelJsonSha256,
  currentLevel43: current.original.LEVELS.find(level => level.id === 43),
};
console.log(JSON.stringify(result, null, 2));
