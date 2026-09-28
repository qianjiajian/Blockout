import fs from 'node:fs';
import { rulesDigest } from '../verify-rules-lock.mjs';

const VERSION = '1.113.0';
const DOC = 'docs/rules/mechanism-rules-v1.113.0.md';
const ROOT = 'deliverables/star-targets171-180-20260928';
fs.mkdirSync(ROOT, { recursive: true });
const manifestPath = 'docs/rules/manifest.json';
const agentsPath = 'AGENTS.md';
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const agentsRaw = fs.readFileSync(agentsPath, 'utf8');
fs.writeFileSync(ROOT + '/registration-before-manifest.json', JSON.stringify({ manifest: JSON.parse(manifestRaw), manifestRaw, agentsRaw }, null, 2) + '\n', { flag: 'wx' });
const manifest = JSON.parse(manifestRaw);
if (manifest.activeVersion !== '1.112.0') throw new Error('unexpected active version ' + manifest.activeVersion);
const hash = rulesDigest(fs.readFileSync(DOC, 'utf8'));
manifest.activeVersion = VERSION;
manifest.versions.push({
  version: VERSION,
  ruleId: 'blockout-rules-v' + VERSION,
  runtimeProfile: 'revised-2026-09-27-v1.5',
  document: DOC,
  sha256: hash,
  status: 'frozen',
  frozenOn: '2026-09-28',
  confirmation: '用户要求171–180调整三星；仅171/174/175/176/177/180采用已验证完整路线总拖35/47/46/51/38/35，保172/173/178/179原目标、全部时间星/时限/玩法/其它关与存档，正式双屏自然钟验收，不发布。',
});
let agents = agentsRaw;
agents = agents.replace(/^当前活动规则：.*$/m, '当前活动规则：`docs/rules/mechanism-rules-v1.113.0.md`。171–180六关三星拖数调整为35/47/46/51/38/35，保其余四关原目标及时间/玩法；其它继承v1.112，活动版本以manifest为准。');
agents = agents.replace(/^2\. 完整阅读该版本文档。.*$/m, '2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.113.0.md`（171–180六关三星调整，保原时间/玩法/旧证据；其余承继v1.112）。');
const bullet = '- v1.113优先：用户要求171–180调整三星；仅171/174/175/176/177/180采用已验证完整路线总拖35/47/46/51/38/35，不称最优。172/173/178/179保原64/91/78/43拖目标；时间星、总时限、地图、玩法、历史par/reward、其它194关和存档保持，正式双屏Pointer自然钟及三星结算验收，旧证据不重标，不发布。\r\n\r\n';
if (!agents.includes('- v1.113优先')) agents = agents.replace('## 不得自行放宽的规则\r\n\r\n', '## 不得自行放宽的规则\r\n\r\n' + bullet);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(agentsPath, agents);
console.log(JSON.stringify({ hash, active: manifest.activeVersion, versions: manifest.versions.length }));
