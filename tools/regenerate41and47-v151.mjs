import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = 'deliverables/remake41-47-v151-20260925';
const BASE = 'deliverables/remake41-50-v146-20260924/baseline.json';
const SOURCE41 = 'deliverables/remake41-50-v146-20260924/agent41-43/source-review.json';
const SOURCE47 = 'deliverables/remake41-50-v146-20260924/agent47-50/source-review.json';
const INPUTS = {
  41: 'deliverables/remake41-50-v146-20260924/agent41-43/candidate41-evolved-1790270360091.json',
  47: 'deliverables/remake41-50-v146-20260924/agent44-46/assist47/square-candidate-1790271078119.json',
};
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const now = new Date().toISOString();
const runId = `v151-${Date.now()}`;
const output = (id) => path.join(ROOT, `candidate${id}-competitor-regenerated-${runId}.json`);

function read(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function clone(v) { return structuredClone(v); }

export async function generate() {
  fs.mkdirSync(ROOT, { recursive: true });
  const candidates = {};
  for (const id of [41, 47]) {
    const candidate = clone(read(INPUTS[id]));
    candidate.seed = `competitor-regeneration-v1.51-lv${id}-${runId}`;
    candidate.regeneration = {
      ruleVersion: '1.51.0',
      generatedAt: now,
      runId,
      purpose: '按已核验竞品关卡来源重新生成隔离候选；未接入正式LEVELS',
      sourceReview: id === 41 ? SOURCE41 : SOURCE47,
      sourceReviewSha256: sha(id === 41 ? SOURCE41 : SOURCE47),
      baseline: BASE,
      baselineSha256: sha(BASE),
      sourceInputCandidate: INPUTS[id],
      sourceInputSha256: sha(INPUTS[id]),
      geometryPreservedFromBaseline: true,
      timeStarsRewardPreservedFromBaseline: true,
      productionIntegrated: false,
    };
    if (id === 41) {
      candidate.sourceAdaptation.openingColorRationale =
        '竞品开局只核实红/青/紫三类；为覆盖冻结57格而补入的普通黄/蓝填块不冒称竞品开局体，保留其为结构适配，并单列为原创补位。';
      candidate.originality = {
        ...(candidate.originality ?? {}),
        layoutIntent: '按竞品41关的双卷帘、双生成器和中央三列通路重写源绑定，保留棋盘外形并让上下仓承担不同清场阶段。',
        alignment: '顶端7×3仓、中央3×5仓、底端7×3仓沿整数行列对齐，帘区足迹不越区。',
        changes: `${candidate.originality?.changes ?? '竞品41来源绑定与原创满铺适配。'}；本轮按竞品来源复核后重新写出，黄/蓝填块继续单列为满铺适配。`,
        constraints: '保留竞品11体开局事实、8/14帘计数、四块冰7、两台各3件队列及六门初值；额外填块仅用于冻结棋盘满铺。',
      };
      candidate.design = {
        primaryMechanism: '双卷帘揭层与双生成器固定FIFO共同占用中央三列，四块数值冰延后对应出口。',
        concreteDecision: '先释放底仓和中央工作位，再安排帘8/帘14后的跨区回收，避免生成器落点被长块堵住。',
      };
    } else {
      candidate.originality = {
        ...candidate.originality,
        changes: `${candidate.originality.changes}；本轮按47关直接帧证据重新写出，23体源开局、两队列和冰门初值保持。`,
      };
    }
    const file = output(id);
    fs.writeFileSync(file, `${JSON.stringify(candidate, null, 2)}\n`, { flag: 'wx' });
    candidates[id] = { file, candidate };
  }
  const manifest = {
    ruleVersion: '1.51.0',
    generatedAt: now,
    runId,
    sourceReviews: { 41: { path: SOURCE41, sha256: sha(SOURCE41) }, 47: { path: SOURCE47, sha256: sha(SOURCE47) } },
    baseline: { path: BASE, sha256: sha(BASE) },
    candidates: Object.fromEntries(Object.entries(candidates).map(([id, x]) => [id, {
      path: x.file,
      sha256: sha(x.file),
      sourceInput: INPUTS[id],
      sourceInputSha256: sha(INPUTS[id]),
      integrated: false,
    }])),
    note: '候选生成记录；下界 UNKNOWN 或预算耗尽不记 PASS，正式接入需另行完成 fresh 下界、完整路线、Pointer、自然计时和最终LEVELS验收。',
  };
  const manifestPath = path.join(ROOT, `regeneration-manifest-${runId}.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return { runId, manifestPath, candidates };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await generate();
  console.log(JSON.stringify({ runId: r.runId, manifest: r.manifestPath, candidates: Object.fromEntries(Object.entries(r.candidates).map(([id, x]) => [id, x.file])) }, null, 2));
}
