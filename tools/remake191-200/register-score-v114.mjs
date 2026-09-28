import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const manifestPath = resolve(root, 'docs/rules/manifest.json');
const agentsPath = resolve(root, 'AGENTS.md');
const rulePath = resolve(root, 'docs/rules/mechanism-rules-v1.114.0.md');
const version = '1.114.0';
const ruleText = `# Block Out! 第191、196关三星条件调整 v1.114.0\n\n- Rule ID: blockout-rules-v1.114.0\n- Runtime profile: revised-2026-09-27-v1.5\n- Frozen on: 2026-09-28\n- 完整承继v1.113.0；仅替代191、196两关的三星拖数目标。\n\n## 用户指令与实施方案\n\n用户在191–200正式关卡接入后要求调整三星条件。本次仅调整当前已验证完整无道具路线的两关：191为31拖，196为27拖。两项数值取各自完整路线总拖，不称实际最优或新的必要腾挪下界；191原目标73拖、196原目标32拖保留在历史证据与par资料中。\n\n## 保留范围\n\n191、196的时间星目标、总时限、地图几何、色块与机关、难度、运行档案、历史parMoves与reward保持：191为129秒/180秒，196为54秒/75秒。191已接受的原创开局仍记USER_ACCEPTED_AUTHORED_OPENING且原始来源UNKNOWN；196已接受的粉翻门初开、绿紫翻门初关仍记USER_ACCEPTED_AUTHORED_SOURCE_FIELDS且冻结初态来源UNKNOWN。生产仅增加对应LevelSpec的preservedMoveTarget字段；旧地图、候选、下界、完整路线、Pointer报告和失败记录不原地改签，玩家存档不访问，其余198关及并行任务不因本次改变。\n\n## 验收\n\n191、196分别在320×568与496×1078执行当前正式LEVELS真实Pointer输入和自然时钟通关，核对新目标文字、三亮星结算、MemoryHost bestStars/bestMoves、原向素材、零持久Storage访问，并以当前PuzzleModel逐事件重放。完整路线仍是见证上界，不作为最优证明；本次评分通过不重新认证难度下界，也不宣称真人盲测或手机实测。旧证据保持，不打包、上传或发布。\n`;

const read = p => readFileSync(p, 'utf8');
const sha256 = text => createHash('sha256').update(text.replaceAll('\\r\\n', '\\n'), 'utf8').digest('hex');
const beforeManifest = read(manifestPath);
const manifest = JSON.parse(beforeManifest);
if (manifest.activeVersion !== '1.113.0') throw new Error(`activeVersion changed: ${manifest.activeVersion}`);
if (manifest.versions.some(v => v.version === version)) throw new Error(`${version} already exists`);
if (existsSync(rulePath)) throw new Error(`rule already exists: ${rulePath}`);
const beforeAgents = read(agentsPath);
const requiredHead = '当前活动规则：`docs/rules/mechanism-rules-v1.113.0.md`。171–180六关三星拖数调整为35/47/46/51/38/35';
if (!beforeAgents.includes(requiredHead)) throw new Error('AGENTS.md changed or expected v1.113 head missing');
const updatedAgents = beforeAgents
  .replace(requiredHead, '当前活动规则：`docs/rules/mechanism-rules-v1.114.0.md`。仅191/196三星拖数调整为31/27，保原时间/玩法/来源状态；其它继承v1.113，活动版本以manifest为准。')
  .replace('2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.113.0.md`（171–180六关三星调整，保原时间/玩法/旧证据；其余承继v1.112）。', '2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.114.0.md`（191/196两关三星调整，保原时间/玩法/来源状态；其余承继v1.113）。')
  .replace('## 不得自行放宽的规则\n', '## 不得自行放宽的规则\n\n- v1.114优先：仅191改为31拖、196改为27拖，均采用已验证完整无道具路线总拖，不称最优；保129/54秒时间星、180/75秒总时限、原棋盘/玩法/来源状态/历史par/reward，其余198关、旧证据和存档保持；正式双屏Pointer自然钟及三星结算验收，不发布。\n\n');
if (updatedAgents === beforeAgents) throw new Error('AGENTS.md update made no change');
writeFileSync(rulePath, ruleText, 'utf8');
const next = {
  version,
  ruleId: 'blockout-rules-v1.114.0',
  runtimeProfile: 'revised-2026-09-27-v1.5',
  document: 'docs/rules/mechanism-rules-v1.114.0.md',
  sha256: sha256(ruleText),
  status: 'frozen',
  frozenOn: '2026-09-28',
  confirmation: '用户要求调整191/196三星条件；仅采用已验证完整路线总拖31/27，保留原时间星、总时限、玩法、来源状态、其余198关、旧证据和存档，正式双屏自然钟三星验收，不发布。'
};
manifest.versions.push(next);
manifest.activeVersion = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
writeFileSync(agentsPath, updatedAgents, 'utf8');
console.log(JSON.stringify({ version, rulePath, manifestPath, ruleSha256: next.sha256 }, null, 2));
