import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { loadSpatialApi, searchSpatial, replayDomain } from "../../campaign-v145/lv141-150/round2-a/witness-greedy.mjs";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "deliverables/continue221-230-20260929/rebuild224-227");
fs.mkdirSync(OUT, { recursive: true });

const deepClone = value => JSON.parse(JSON.stringify(value));
const seedBundle = await build({
  entryPoints: ["src/core/formal201to210SeedData.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const seedModule = await import(`data:text/javascript;base64,${Buffer.from(seedBundle.outputFiles[0].text).toString("base64")}`);
const spatialApi = await loadSpatialApi();
const api = { ...spatialApi };

const idRecords = level => [
  ...(level.gates ?? []), ...(level.blocks ?? []), ...(level.flipDoors ?? []),
  ...(level.coloredGrids ?? []), ...(level.shutters ?? []), ...(level.generators ?? []),
].filter(item => item && typeof item.id === "string");
const rewriteIds = (value, ids) => {
  if (typeof value === "string") return ids.get(value) ?? value;
  if (Array.isArray(value)) return value.map(item => rewriteIds(item, ids));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteIds(v, ids)]));
  return value;
};
const rename = (source, id) => {
  const cloned = deepClone(source);
  const idMap = new Map(idRecords(cloned).map(item => [item.id, `l${id}-${item.id}`]));
  const next = rewriteIds(cloned, idMap);
  next.id = id;
  next.name = `竞品续章·${id}`;
  next.mechanismRules = "revised-2026-09-27-v1.5";
  next.reward = 200;
  return next;
};
const flipVertical = level => {
  const h = level.height;
  level.blocks = level.blocks.map(block => {
    const maxY = Math.max(...block.shape.map(([, y]) => y));
    return { ...block, y: h - 1 - (block.y + maxY), shape: block.shape.map(([x, y]) => [x, maxY - y]) };
  });
  level.shutters = level.shutters?.map(shutter => ({ ...shutter, y: h - shutter.y - shutter.height }));
  level.gates = level.gates?.map(gate => {
    if (gate.side === "top") return { ...gate, side: "bottom" };
    if (gate.side === "bottom") return { ...gate, side: "top" };
    return { ...gate, offset: h - gate.offset - gate.size };
  });
  return level;
};
const addMultiCellEdgeColumn = level => {
  level.width = 8;
  let index = 0;
  for (const x of [6, 7]) {
    for (const y of [0, 2, 4, 6]) {
      if (index >= 6) return level;
      index += 1;
      level.blocks.push({
        id: `l${level.id}-edge-v2-${index}`,
        x,
        y,
        shape: [[0, 0], [0, 1]],
        color: "cyan",
      });
    }
  }
  return level;
};
const configure = (level, { id, difficulty, timeSeconds, targetMoves, floor, note }) => {
  level.id = id;
  level.difficulty = difficulty;
  level.timeSeconds = timeSeconds;
  level.preservedMoveTarget = targetMoves;
  level.parMoves = floor;
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: floor,
    minimumRepositionOverhead: floor,
  };
  level.mechanismAdaptation = {
    userAuthorized: "221-230竞品视频续作·224-227隔离重生成",
    change: note,
  };
  return level;
};

const source201 = seedModule.FORMAL_201_210_LEVELS.find(level => level.id === 201);
const source202 = seedModule.FORMAL_201_210_LEVELS.find(level => level.id === 202);
const source205 = seedModule.FORMAL_201_210_LEVELS.find(level => level.id === 205);
if (!source201 || !source202 || !source205) throw new Error("seed levels unavailable");

// 224: use the multi-cell 201 geometry, vertically reflected so the two hidden
// bays open from the top as in the source frame. Counts are source-visible
// mechanism values; no single-cell placeholder is introduced.
const l224 = configure(addMultiCellEdgeColumn(rename(source201, 224)), {
  id: 224, difficulty: "hard", timeSeconds: 150, targetMoves: 42, floor: 16,
  note: "源首个实际游玩帧约300s（非400s）：Hard Level；顶部卷帘8、右侧16、底部14/4及多舱色块。候选保留多格满铺与双卷帘，将可见8/14计数写入两批；为避免单格占位并达到硬档空间压力，扩为8×9并加入6个V2边列色块，属于隔离设计差异。逐层隐藏库存和精确出口仍属候选适配。",
});
if (l224.shutters?.length >= 2) {
  l224.shutters[0].count = 8;
  l224.shutters[1].count = 14;
}

// 225: certified multi-cell 205 shape inventory, with source four-side gates
// and central void pacing. No shutter or one-cell seed is used.
const l225 = configure(rename(source205, 225), {
  id: 225, difficulty: "easy", timeSeconds: 150, targetMoves: 45, floor: 6,
  note: "源首个实际游玩帧约390s（400s为已进行约10秒）：顶部红/蓝门、右侧紫门、底部绿门、中央十字留空及黄色大块。候选保留完整多格铺板和四侧出口，中央留空由原几何保留；未从单帧推断隐藏库存。",
});

// 226: 202 provides a multi-cell two-bay layout. Add one real move-triggered
// queue plus key/lock metadata to retain the source's supply/key-lock vocabulary.
const l226 = configure(rename(source202, 226), {
  id: 226, difficulty: "normal", timeSeconds: 180, targetMoves: 48, floor: 13,
  note: "源首个实际游玩帧约500s（500s已是开局后首帧）：顶部补给机计数3、钥匙/锁视觉、冰计数16/17、右侧11、底部2。候选保留双卷帘、多格满铺，并加入一条有序补给队列与一枚钥匙/锁关系；精确队列落点和冰门绑定仍待正式证据。",
});
l226.gates = l226.gates.map((gate, i) => ({ ...gate, frozen: [16, 17, 11, 2, undefined, undefined][i] }));
const keyBlock = l226.blocks.find(block => block.color === "red" && !block.shutterId);
const lockBlock = l226.blocks.find(block => block.color === "orange" && !block.shutterId);
if (keyBlock && lockBlock) {
  keyBlock.keyId = "l226-key-red";
  lockBlock.lockedBy = "l226-key-red";
  lockBlock.lockCount = 1;
}
const queueId = "l226-generator-queue-1";
l226.blocks.push({ id: queueId, x: 1, y: 0, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "cyan" });
l226.generators = [{
  id: "l226-generator-1", side: "top", offset: 1, rimSpan: 3, rimMount: "rim",
  spawn: [1, 0], queueBlockIds: [queueId], trigger: "move",
}];

// 227: a second multi-cell hard candidate, keeping the shutter/ice cadence
// from the source 201 geometry and avoiding all single-cell placeholders.
const l227 = configure(addMultiCellEdgeColumn(rename(source201, 227)), {
  id: 227, difficulty: "hard", timeSeconds: 180, targetMoves: 52, floor: 17,
  note: "源首个实际游玩帧约590s（600s已进行约9秒）：中央卷帘8、左紫/冰1/2、右绿蓝红门及底橙门。候选保留多格双舱和多色出口，将两批卷帘计数适配为4/8；为避免单格占位并达到硬档空间压力，扩为8×9并加入6个V2边列色块，属于隔离设计差异。翻门初相与隐藏批次未知不冒称精确复制。",
});
if (l227.shutters?.length >= 2) {
  l227.shutters[0].count = 4;
  l227.shutters[1].count = 8;
}

const candidates = [l224, l225, l226, l227];
const targetById = new Map([[224, 16], [225, 6], [226, 13], [227, 17]]);
const records = [];
for (const level of candidates) {
  const row = {
    id: level.id,
    difficulty: level.difficulty,
    targetMoves: level.preservedMoveTarget,
    requiredRepositionFloor: targetById.get(level.id),
    sourceOpeningFrameSeconds: ({ 224: 300, 225: 390, 226: 500, 227: 590 })[level.id],
    blockCount: level.blocks.length,
    occupiedCells: level.blocks.reduce((n, block) => n + block.shape.length, 0),
    singleCellBlocks: level.blocks.filter(block => block.shape.length === 1).length,
    validation: "UNKNOWN",
    witness: null,
    lowerBoundAttempt: null,
  };
  try {
    api.validateLevel(level);
    row.validation = "PASS";
  } catch (error) {
    row.validation = "FAIL";
    row.error = error instanceof Error ? error.message : String(error);
  }
  if (row.validation === "PASS" && !level.generators?.length) {
    // The witness compiler is the v1.4 spatial projection; validation above
    // remains on the authored v1.5 candidate. This conversion is read-only.
    const witnessLevel = { ...deepClone(level), mechanismRules: "revised-2026-09-23-v1.4" };
    const witness = searchSpatial(witnessLevel, api, {
      floor: Infinity,
      maxMilliseconds: 5000,
      maxStates: 150000,
      maxTransitions: 1200000,
      normalize: true,
      symmetry: true,
      diagnosticTrace: true,
    });
    row.witness = {
      status: witness.status,
      reason: witness.reason,
      termination: witness.termination,
      exploredStates: witness.exploredStates,
      discoveredStates: witness.discoveredStates,
      elapsedMilliseconds: witness.elapsedMilliseconds,
      maxClearsSeen: witness.maxClearsSeen,
      cost: witness.cost,
    };
    if (witness.drags) {
      try {
        const replay = api.replayRevisedRoute(witnessLevel, witness.drags);
        row.witness.complete = replay.complete;
        row.witness.nonClearingDrags = replay.nonClearingDrags;
        row.witness.totalDrags = witness.drags.length;
        row.witness.route = witness.drags;
      } catch (error) {
        row.witness.replayError = error instanceof Error ? error.message : String(error);
      }
    }
    const lower = searchSpatial(witnessLevel, api, {
      floor: targetById.get(level.id),
      maxMilliseconds: 5000,
      maxStates: 150000,
      maxTransitions: 1200000,
      normalize: true,
      symmetry: true,
    });
    row.lowerBoundAttempt = {
      threshold: targetById.get(level.id),
      status: lower.status,
      reason: lower.reason,
      termination: lower.termination,
      exploredStates: lower.exploredStates,
      elapsedMilliseconds: lower.elapsedMilliseconds,
      maxClearsSeen: lower.maxClearsSeen,
      cost: lower.cost,
      certified: false,
      note: "witness-greedy v1.47 is an unqualified finite-domain attempt; this row is not a formal lower-bound certificate.",
    };
  } else if (row.validation === "PASS") {
    row.witness = { status: "unsupported", reason: "generator domain is intentionally excluded from witness-greedy v1.47" };
    row.lowerBoundAttempt = { status: "unsupported", reason: "generator domain is intentionally excluded" };
  }
  fs.writeFileSync(path.join(OUT, `candidate-${level.id}.json`), JSON.stringify(level, null, 2) + "\n");
  records.push(row);
}

const report = {
  schemaVersion: 1,
  ruleVersion: "1.122.0",
  status: records.every(row => row.validation === "PASS") ? "CANDIDATE_VALIDATION_ONLY" : "CANDIDATE_VALIDATION_FAILED",
  formalAdopted: false,
  releaseApproved: false,
  sourceVideo: {
    path: "C:/Users/Administrator/Desktop/block out/参考视频/221-230.mp4",
    sha256: "ea82f441d42764d062e30cb048e34031fea9eb3aaae8cb040fbca50df754df1e",
  },
  sourceFrameCorrection: "源JSON的400/600秒采样不是开局；按结果弹窗→首个游玩帧核对224/225/226/227为300/390/500/590秒。",
  candidates: records,
};
fs.writeFileSync(path.join(OUT, "progress.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(records, null, 2));
