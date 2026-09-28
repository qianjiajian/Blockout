import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../revised-preview-validation-v160.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const sourceDir = path.join(root, 'deliverables/remake191-200-20260927');
const outDir = path.join(root, 'deliverables/star-targets191-196-20260928');
fs.mkdirSync(outDir, { recursive: true });
const baselinePath = path.join(sourceDir, 'baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath));
const oldBaseline = JSON.parse(JSON.stringify(baseline));
baseline.ruleVersion = '1.114.0';
baseline.levels[191 - 1].starTargets.moveTarget = 31;
baseline.levels[196 - 1].starTargets.moveTarget = 27;
fs.writeFileSync(path.join(outDir, 'baseline-score-v114.json'), `${JSON.stringify(baseline, null, 2)}\n`);

const files = {
  191: path.join(sourceDir, 'author191-193/ready191-1790525168324.json'),
  196: path.join(sourceDir, 'author194-196/candidate196-1790523269570.json')
};
const outputs = {};
for (const [id, file] of Object.entries(files)) {
  const data = JSON.parse(fs.readFileSync(file));
  data.level.preservedMoveTarget = Number(id === '191' ? 31 : 27);
  data.levelSha256 = digest(data.level);
  const out = path.join(outDir, `score-candidate${id}-v114.json`);
  fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
  outputs[id] = { source: file, output: out, levelSha256: data.levelSha256, drags: data.drags.length };
}
fs.writeFileSync(path.join(outDir, 'prepared.json'), `${JSON.stringify({ ruleVersion: '1.114.0', baseline: { source: baselinePath, oldSha256: digest(oldBaseline), newSha256: digest(baseline) }, candidates: outputs }, null, 2)}\n`);
console.log(JSON.stringify({ baseline: path.join(outDir, 'baseline-score-v114.json'), candidates: outputs }, null, 2));
