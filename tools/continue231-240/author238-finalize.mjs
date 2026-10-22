import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ROOT, audit, digest, loadApi, replay, ruleGate, writeNew } from './common.mjs';
import { payload238, qualify238 } from './author238-native.mjs';

const dir = ROOT + '/author238';
const origin = dir + '/run-4001-1792395824847/candidate-4018.json';
const previous = JSON.parse(fs.readFileSync(origin));
const source = JSON.parse(fs.readFileSync(dir + '/source-block-transcription.json'));
const shaFile = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rule = ruleGate(), { api, inputs } = await loadApi();
const level = structuredClone(previous.level), drags = previous.row.route.drags;
level.name = '彩径·横移交错';
level.parMoves = drags.length;
level.preservedMoveTarget = drags.length;
const beforeGeometry = structuredClone(previous.level), afterGeometry = structuredClone(level);
for (const key of ['name', 'parMoves', 'preservedMoveTarget']) { delete beforeGeometry[key]; delete afterGeometry[key]; }
assert.deepEqual(afterGeometry, beforeGeometry, 'Only new-level title and verified route score change');
const oldInput = JSON.parse(fs.readFileSync(previous.row.lower.input));
const freshInput = payload238(level, api).p;
assert.deepEqual(freshInput, oldInput, 'The mathematical input must be identical after scoring metadata');
assert.equal(digest(freshInput), previous.row.lower.inputSha256);
assert.equal(digest(fs.readFileSync(previous.row.lower.source)), previous.row.lower.sourceHash);
assert.equal(previous.row.lower.thresholdProven, true);
assert.equal(previous.row.lower.termination, 'below-threshold-exhausted');
assert.equal(previous.row.lower.floor, 5);
const structure = audit(level, api);
const route = replay(level, drags, api, { complete: true, requirePointerCompatible: true });
assert.equal(route.nonClearingDrags, 6);
assert.equal(route.effectiveDrags, 27);
assert.equal(route.clearEvents, 21);
const qualification = qualify238(level, drags, api);
const targets = api.levelStarTargets(level);
assert.deepEqual(targets, { moveTarget: 27, timeTargetSeconds: 104 });

const footprint = b => b.shape.map(([x,y]) => [x+b.x,y+b.y].join(',')).sort().join(';');
const layout = blocks => blocks.map(footprint).sort();
const overlap = (a,b) => { const s = new Set(layout(a)); return layout(b).filter(k => s.has(k)).length; };
const sourceVariants = [
  b => structuredClone(b),
  b => ({...b, x: 0, y: 0, shape: b.shape.map(([x,y]) => [5-(x+b.x),y+b.y])}),
  b => ({...b, x: 0, y: 0, shape: b.shape.map(([x,y]) => [x+b.x,8-(y+b.y)])}),
  b => ({...b, x: 0, y: 0, shape: b.shape.map(([x,y]) => [5-(x+b.x),8-(y+b.y)])}),
];
const historical = [...api.LEVELS, ...api.FORMAL_201_210_LEVELS, ...api.FORMAL_211_220_LEVELS, ...api.FORMAL_221_230_LEVELS];
const duplicates = historical.filter(l => l.width === level.width && l.height === level.height && digest(layout(l.blocks)) === digest(layout(level.blocks))).map(l => l.id);
assert.deepEqual(duplicates, []);
const originality = { passed: true, method: 'Compare actual color-independent block footprints; source identity, horizontal reflection, vertical reflection and half-turn, plus all 230 registered historical layouts.',
  sourceBodyCount: source.blocks.length, authoredBodyCount: level.blocks.length,
  sourceFootprintOverlaps: sourceVariants.map((f, i) => ({ transform: ['identity','horizontal-reflection','vertical-reflection','half-turn'][i], sharedWholeFootprints: overlap(source.blocks.map(f), level.blocks) })),
  historicalLevelsCompared: historical.length, exactHistoricalDuplicates: duplicates,
  authoredPartitionSha256: digest(layout(level.blocks)) };

const model = new api.PuzzleModel(level); model.startCountdown();
const trace = [], gridCells = new Set(level.coloredGrids[0].cells.map(p => p.join(',')));
for (const [i, drag] of drags.entries()) {
  const before = model.snapshot(), b = model.getBlock(drag.blockId);
  assert(b); const axis = b.movementAxis, startY = b.y;
  model.beginAction();
  for (const point of drag.path) {
    assert(model.moveBlockStep(drag.blockId, ...point));
    const live = model.getBlock(drag.blockId);
    if (axis === 'horizontal') assert.equal(live.y, startY);
    if (live.color !== 'red') assert(!live.shape.some(([x,y]) => gridCells.has([live.x+x,live.y+y].join(','))));
  }
  if (drag.exitSide) assert(model.tryExit(drag.blockId, drag.exitSide).ok);
  assert(model.commitAction()); const after = model.snapshot();
  const newlyOpened = before.gates.filter(g => g.frozen > 0 && after.gates.find(n => n.id === g.id).frozen === 0).map(g => g.id);
  trace.push({ step: i+1, blockId: drag.blockId, color: b.color, axis, exitSide: drag.exitSide,
    pathLength: drag.path.length, cleared: after.cleared, nonClearing: before.cleared === after.cleared,
    newlyOpened, gateCountdowns: Object.fromEntries(after.gates.map(g => [g.id,g.frozen])) });
}
assert(model.snapshot().complete);
const sameInventory = (list, colors = true) => list.map(b => [colors?b.color:'', b.shape.length, b.movementAxis??'free'].join(':')).sort();
assert.deepEqual(sameInventory(source.blocks), sameInventory(level.blocks.filter(b => b.id !== 'l238-grid-fill')));
assert.deepEqual(source.gates.map(g => [g.color,g.frozen??0]).sort(), level.gates.map(g => [g.color,g.frozen??0]).sort());
const adaptation = {
  sourceFrame: source.sourceFrame, sourceFrameSha256: shaFile(source.sourceFrame), sourceCorroboration: source.sourceCorroboration,
  preserved: ['6x9 rectangular 54-cell board','all 20 source bodies and their colors/areas','red/blue V3 horizontal axes','three red floor cells','red10/blue9/green4/yellow2 ice gates plus ordinary purple'],
  changes: [
    {field:'openingCoverage',source:'20 bodies / 51 occupied cells; three red floor cells bare',authored:'21 bodies / 54 occupied cells; one added ordinary red V3',reason:'Each playable cell needs actual block coverage; retain source bodies and add only the three missing cells.'},
    {field:'L triomino footprints',source:'two source L orientations differ from installed q0 art',authored:'yellow/green physical L shapes both use installed q0 footprint [[0,0],[0,1],[1,1]]',reason:'No image rotation; two actual shape changes are disclosed.'},
    {field:'partition',source:'source original top/bottom grouping',authored:'original repartition and routes, as fingerprint comparison records',reason:'Independent original layout; preserve source inventory and mechanisms.'},
    {field:'red floor placement',source:[[1,3],[1,4],[1,5]],authored:level.coloredGrids[0].cells,reason:'Three contiguous red cells integrated into new original route geometry.'},
    {field:'green gate placement',source:{side:'top',offset:2,size:2,frozen:4},authored:level.gates.find(g=>g.color==='green'),reason:'Finite failed layouts were replaced to achieve simple L/U band while retaining count and color.'},
    {field:'purple gate span',source:{side:'right',offset:7,size:2},authored:level.gates.find(g=>g.color==='purple'),reason:'Original grouping uses a three-cell opening; within native span limit of 3.'},
  ],
  knownSourceUnknowns: [],
};
const proofBinding = { passed:true, oldCandidateFile:origin, oldCandidateFileSha256:shaFile(origin),
  oldLevelSha256:digest(previous.level), finalLevelSha256:digest(level), changedMetadata:['name','parMoves','preservedMoveTarget'],
  exactSameMathematicalInput:true, mathematicalInputSha256:digest(freshInput),
  originalLowerInput:previous.row.lower.input, originalLowerOutput:previous.row.lower.output,
  originalLowerOutputFileSha256:shaFile(previous.row.lower.output),
  note:'Original search/REJECTED qualification report preserved. New qualification compares the same successor sets after JS ordinal sorting on both sides; the former failure was C# culture sorting versus JS ordinal sorting. The mathematical search is not rerun or relabeled.' };
const packet = {schema:'continue231-240-qualified-candidate-v1', status:'MATH_AND_STRUCTURE_QUALIFIED_POINTER_PENDING',
  level,levelSha256:digest(level),drags,routeSha256:digest(drags),
  L:5,U:6,totalDrags:27,starTargets:targets,seconds:145,
  lower:{...previous.row.lower,levelSha256:digest(level),proofBinding}, qualification, structure,
  strictReplay:{...route,final:undefined,finalStateKey:undefined},originality,sourceAndAdaptation:adaptation,mechanismTrace:trace,
  rules:{version:rule.activeVersion,lockPassed:rule.ok},
  dependencyHashes: Object.fromEntries(inputs.map(file=>[file,shaFile(file)])),
  naturalClockValidated:false,pointerValidated:false,formalAccepted:false,releaseApproved:false};
writeNew(dir+'/qualified238.json',packet);
fs.writeFileSync(dir+'/qualified238-review.md',`# 238 候选独立验收\n\n状态：数学、结构、原向素材和完整严格模型路线通过；正式双屏 Pointer、自然计时及实际三星结算待根任务统一验收。\n\n同图下界 L=5（0–4 必挪状态穷尽 422 个，7053 条转移），完整路线 U=6；21 清除 + 6 挪位 = 27 拖。新关评分取已验路线 27 拖 / 104 秒，失败时限 145 秒；不称最优。\n\n资格器按同一排序比较成功，${qualification.states} 个状态、${qualification.transitions} 个后继逐一一致。历史报告因字符串排序差异标为 REJECTED 的原文件保留。最终标题和评分元数据变化不影响原求解输入；同输入绑定见 qualified238.json。\n\n来源 frame-727 稳定帧及 728/729、750/810 后继核对。保 20 源体全部颜色/面积、红蓝水平轴 V3、3 红色彩格、红10/蓝9/绿4/黄2及紫普通门。为54格满铺增加1普通红V3；两个L实体改成现有q0足迹，全部重排；绿门改到底边，紫门扩至3格。事实与适配已分列。\n\n仅候选与证据写入本目录，未写正式数据或存档。\n`,{flag:'wx'});
console.log(JSON.stringify({file:dir+'/qualified238.json',levelSha256:digest(level),L:5,U:6,totalDrags:27,starTargets:targets,qualification:{states:qualification.states,transitions:qualification.transitions},originality},null,2));
