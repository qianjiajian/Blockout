import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const markdownPath = resolve(root, "docs", "level-mechanism-matrix.md");
const csvPath = resolve(root, "docs", "level-mechanism-matrix.csv");
const jsonPath = resolve(root, "playtest-results", "latest-level-mechanism-matrix.json");
const checkOnly = process.argv.includes("--check");

const COLOR_LABELS = {
  red: "红",
  blue: "蓝",
  green: "绿",
  yellow: "黄",
  purple: "紫",
  orange: "橙",
  pink: "粉",
  cyan: "青",
};
const COLOR_ORDER = Object.keys(COLOR_LABELS);

const SHAPE_LABELS = {
  SINGLE: "单格",
  H2: "横2格",
  V2: "竖2格",
  H3: "横3格",
  V3: "竖3格",
  H4: "横4格",
  V4: "竖4格",
  L3: "L形3格",
  SQ2: "2×2方块",
  T4: "T形4格",
  L4: "四格折形",
  S4: "S形4格",
  T5: "T形5格",
  L5: "L形5格",
  CROSS5: "十字5格",
  P5: "缺一角5格",
  RECT2X3: "2×3方块",
  SQ3: "3×3方块",
};
const SHAPE_ORDER = Object.keys(SHAPE_LABELS);

const SHAPE_VARIANTS = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]],
  V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  S4: [
    [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T5: [
    [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  ],
  L5: [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]], [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ]],
};

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => [key, stableValue(value[key])]));
};

const semanticHash = (value) => createHash("sha256")
  .update(JSON.stringify(stableValue(value)))
  .digest("hex")
  .toUpperCase();

const shapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(([x, y]) => `${x},${y}`)
    .join("|");
};

const SHAPE_BY_SIGNATURE = new Map(Object.entries(SHAPE_VARIANTS).flatMap(([id, variants]) => (
  variants.map((shape) => [shapeSignature(shape), id])
)));

const shapeKind = (block) => {
  const exact = SHAPE_BY_SIGNATURE.get(shapeSignature(block.shape));
  if (exact) return exact;
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  return `${width}×${height}-${block.shape.length}格`;
};

const playableCells = (level) => {
  if (Array.isArray(level.playable) && level.playable.length) return level.playable;
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => [x, y])
  )).flat().filter(([x, y]) => !blocked.has(`${x},${y}`));
};

const isIrregularShape = (block) => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  return block.shape.length < width * height;
};

const visibleBlocks = (level) => {
  const closed = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  return level.blocks.filter((block) => (
    !queued.has(block.id) && (!block.shutterId || !closed.has(block.shutterId))
  ));
};

const occupiedCellKeys = (blocks) => blocks.flatMap((block) => (
  block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)
));

const countBy = (values) => values.reduce((counts, value) => {
  counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}, {});

const orderedEntries = (counts, order) => Object.entries(counts)
  .sort(([left], [right]) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    if (leftIndex >= 0 || rightIndex >= 0) {
      return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex)
        - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
    }
    return left.localeCompare(right);
  });

const stageOfBlock = (level, block) => {
  const generator = (level.generators ?? []).find((item) => item.queueBlockIds.includes(block.id));
  if (generator) return `generator:${generator.id}`;
  if (!block.shutterId) return "opening";
  const shutter = (level.shutters ?? []).find((item) => item.id === block.shutterId);
  return `${shutter?.skin ?? "shutter"}:${block.shutterId}`;
};

const blockEvidence = (level, block) => ({
  id: block.id,
  shape: shapeKind(block),
  color: block.color,
  stage: stageOfBlock(level, block),
});

const histogramOfBlocks = (blocks) => Object.fromEntries(
  orderedEntries(countBy(blocks.map(shapeKind)), SHAPE_ORDER),
);

/**
 * Lossless, player-rule evidence derived from the shipping LevelSpec. This is
 * intentionally more detailed than the compact Markdown label: downstream
 * audits can compare exact countdown values, carrier shapes, reveal batches,
 * queue order, shell colours and trigger semantics without parsing prose.
 */
const mechanismEvidence = (level) => {
  const queuedIds = new Set((level.generators ?? []).flatMap((item) => item.queueBlockIds));
  const openingIds = new Set(visibleBlocks(level).map((block) => block.id));
  const numericIceBlocks = level.blocks.filter((block) => (block.frozen ?? 0) > 0);
  const shellBlocks = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1);
  const covers = (level.shutters ?? []).filter((shutter) => (
    shutter.skin === undefined || shutter.skin === "shutter"
  ));
  const layeredLifts = (level.shutters ?? []).filter((shutter) => shutter.skin === "lift");
  const stagedFrames = (level.shutters ?? []).filter((shutter) => shutter.skin === "staged-frame");
  const internalStaging = (level.shutters ?? []).filter((shutter) => shutter.skin === "staging");
  const axisBlocks = level.blocks.filter((block) => block.movementAxis);
  const keyBlocks = level.blocks.filter((block) => block.keyId);
  const lockBlocks = level.blocks.filter((block) => block.lockedBy);
  const starBlocks = level.blocks.filter((block) => block.star);
  const starGates = level.gates.filter((gate) => gate.star);
  const ordinaryGates = level.gates.filter((gate) => !gate.star && !(gate.frozen ?? 0));
  const frozenGates = level.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) > 0);

  const shutterEvidence = (shutter) => {
    const hiddenBlocks = level.blocks.filter((block) => block.shutterId === shutter.id);
    return {
      id: shutter.id,
      value: shutter.count,
      region: { x: shutter.x, y: shutter.y, width: shutter.width, height: shutter.height },
      triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : null,
      hiddenBlockCount: hiddenBlocks.length,
      hiddenShapeHistogram: histogramOfBlocks(hiddenBlocks),
      hiddenBlocks: hiddenBlocks.map((block) => blockEvidence(level, block)),
    };
  };

  const liftGroups = new Map();
  for (const shutter of layeredLifts) {
    const groupId = shutter.id.replace(/-release-\d+$/i, "");
    const group = liftGroups.get(groupId) ?? [];
    group.push(shutter);
    liftGroups.set(groupId, group);
  }
  const liftItems = [...liftGroups.entries()].map(([id, shutters]) => {
    const releases = [...shutters]
      .sort((left, right) => Number(left.id.match(/-release-(\d+)$/i)?.[1] ?? 0)
        - Number(right.id.match(/-release-(\d+)$/i)?.[1] ?? 0));
    const firstLayerBlocks = (releases[0]?.triggerBlockIds ?? [])
      .map((blockId) => level.blocks.find((block) => block.id === blockId))
      .filter(Boolean);
    const layers = [
      {
        index: 1,
        blockCount: firstLayerBlocks.length,
        shapeHistogram: histogramOfBlocks(firstLayerBlocks),
        blocks: firstLayerBlocks.map((block) => blockEvidence(level, block)),
      },
      ...releases.map((shutter, index) => {
        const hiddenBlocks = level.blocks.filter((block) => block.shutterId === shutter.id);
        return {
          index: index + 2,
          blockCount: hiddenBlocks.length,
          shapeHistogram: histogramOfBlocks(hiddenBlocks),
          blocks: hiddenBlocks.map((block) => blockEvidence(level, block)),
        };
      }),
    ];
    return {
      id,
      layerCount: layers.length,
      layerBlockCounts: layers.map((layer) => layer.blockCount),
      layers,
      releases: releases.map(shutterEvidence),
    };
  });

  return {
    directionalExits: {
      count: level.gates.length,
      ordinaryCount: ordinaryGates.length,
      frozenCount: frozenGates.length,
      frozenValues: frozenGates.map((gate) => gate.frozen),
      starCount: starGates.length,
      starFrozenCount: starGates.filter((gate) => (gate.frozen ?? 0) > 0).length,
      starFrozenValues: starGates.filter((gate) => (gate.frozen ?? 0) > 0).map((gate) => gate.frozen),
      items: level.gates.map((gate) => ({
        id: gate.id,
        color: gate.color,
        side: gate.side,
        offset: gate.offset,
        size: gate.size,
        frozen: gate.frozen ?? 0,
        star: Boolean(gate.star),
      })),
      logic: "同色块整体对齐对应边界出口；frozen>0 时每次有效清除（含剥层）减1，归零后可用；star=true 的出口承接星标块。",
    },
    numericIce: numericIceBlocks.length ? {
      count: numericIceBlocks.length,
      values: numericIceBlocks.map((block) => block.frozen),
      valueHistogram: countBy(numericIceBlocks.map((block) => String(block.frozen))),
      openingVisibleCount: numericIceBlocks.filter((block) => openingIds.has(block.id)).length,
      items: numericIceBlocks.map((block) => ({
        ...blockEvidence(level, block),
        value: block.frozen,
      })),
      logic: "数字归零前不可拖动；其他色块每次有效清除（含剥层）使数字减1。",
    } : null,
    shells: shellBlocks.length ? {
      count: shellBlocks.length,
      openingVisibleCount: shellBlocks.filter((block) => openingIds.has(block.id)).length,
      items: shellBlocks.map((block) => ({
        ...blockEvidence(level, block),
        outerColor: block.layers[0],
        innerColor: block.layers[1],
        distinctColors: new Set(block.layers).size === block.layers.length,
      })),
      logic: "layers 按外到内依次清除；当前正式规则仅允许一层额外外壳，外层色与内层本体色必须不同。",
    } : null,
    covers: covers.length ? {
      count: covers.length,
      values: covers.map((shutter) => shutter.count),
      items: covers.map(shutterEvidence),
      logic: "每次有效清除（含剥层）使计数减1；归零后覆盖区及其隐藏批次开放。",
    } : null,
    generators: (level.generators ?? []).length ? {
      count: level.generators.length,
      items: level.generators.map((generator) => ({
        id: generator.id,
        trigger: generator.trigger ?? "move",
        side: generator.side,
        offset: generator.offset,
        spawn: [...generator.spawn],
        intervalSeconds: generator.intervalSeconds ?? null,
        initialDelaySeconds: generator.initialDelaySeconds ?? null,
        queueLength: generator.queueBlockIds.length,
        queue: generator.queueBlockIds.map((blockId) => {
          const block = level.blocks.find((candidate) => candidate.id === blockId);
          if (!block) throw new Error(`Lv${level.id} generator ${generator.id} references missing block ${blockId}`);
          return {
            ...blockEvidence(level, block),
            layers: block.layers ? [...block.layers] : [block.color],
            frozen: block.frozen ?? 0,
          };
        }),
      })),
      logic: "输出位腾空后按 queue 顺序逐块投放；move 为操作触发，time 为计时触发；出生位被占时保持队首，不消耗队列。",
    } : null,
    axisBlocks: axisBlocks.length ? {
      count: axisBlocks.length,
      byAxis: countBy(axisBlocks.map((block) => block.movementAxis)),
      items: axisBlocks.map((block) => ({ ...blockEvidence(level, block), axis: block.movementAxis })),
      logic: "玩家只能沿 movementAxis 指定的水平或垂直轴拖动，方块不会自动移动。",
    } : null,
    keyLocks: keyBlocks.length || lockBlocks.length ? {
      keyCount: keyBlocks.length,
      lockCount: lockBlocks.length,
      keys: keyBlocks.map((block) => ({ ...blockEvidence(level, block), keyId: block.keyId })),
      locks: lockBlocks.map((block) => ({
        ...blockEvidence(level, block),
        lockedBy: block.lockedBy,
        requirement: block.lockCount ?? 1,
      })),
      logic: "钥匙块完全移出后只为相同 keyId 的锁计数；锁的剩余 requirement 归零后解锁。",
    } : null,
    layeredLifts: liftItems.length ? {
      count: liftItems.length,
      items: liftItems,
      logic: "固定分层框；当前 triggerBlockIds 批次全部清除后才释放下一批，未释放批次不参与碰撞；并非自动平移平台。",
    } : null,
    stagedFrames: stagedFrames.length ? {
      count: stagedFrames.length,
      items: stagedFrames.map(shutterEvidence),
      logic: "固定阶段框；前批 triggerBlockIds 全部清除后框消失并释放隐藏批次。",
    } : null,
    elevators: (level.elevators ?? []).length ? {
      count: level.elevators.length,
      items: level.elevators.map((elevator) => ({ ...elevator })),
      logic: "计时往返平台；指定载荷与平台锚点重合时随平台移动，拖离后脱离。",
    } : null,
    conveyors: (level.conveyors ?? []).length ? {
      count: level.conveyors.length,
      items: level.conveyors.map((conveyor) => ({ ...conveyor })),
      logic: "每次清除后，完整留在带上的指定载荷在无阻挡时沿 direction 前进1格。",
    } : null,
    stars: starBlocks.length || starGates.length ? {
      blockCount: starBlocks.length,
      gateCount: starGates.length,
      blocks: starBlocks.map((block) => blockEvidence(level, block)),
      gates: starGates.map((gate) => ({
        id: gate.id,
        color: gate.color,
        side: gate.side,
        offset: gate.offset,
        size: gate.size,
        frozen: gate.frozen ?? 0,
      })),
      logic: "星标块只能从同色星门移出；普通同色块也可使用星门。",
    } : null,
    internalStaging: internalStaging.length ? {
      count: internalStaging.length,
      items: internalStaging.map(shutterEvidence),
      playerFacing: false,
      logic: "内部非空间批次元数据，不绘制成玩家机制；仅在前一批清除后释放下一批。",
    } : null,
    queuedBlockCount: queuedIds.size,
  };
};

const mechanismFacts = (level, evidence) => {
  const facts = [];
  const validCells = playableCells(level);
  const moveGenerators = evidence.generators?.items.filter((item) => item.trigger !== "time") ?? [];
  const timedGenerators = evidence.generators?.items.filter((item) => item.trigger === "time") ?? [];

  if (level.gates.length) facts.push({
    id: "color-exit",
    label: "颜色出口",
    count: level.gates.length,
    detail: `共${evidence.directionalExits.count}个：普通${evidence.directionalExits.ordinaryCount}、冰封${evidence.directionalExits.frozenCount}${evidence.directionalExits.starCount ? `、星门${evidence.directionalExits.starCount}` : ""}`,
  });
  if (validCells.length < level.width * level.height) facts.push({ id: "irregular-board", label: "异形棋盘", count: 1, detail: `${validCells.length}/${level.width * level.height}格可用` });
  const irregularBlockCount = level.blocks.filter(isIrregularShape).length;
  if (irregularBlockCount) {
    facts.push({ id: "irregular-block", label: "异形方块", count: irregularBlockCount, detail: `${irregularBlockCount}块` });
  }
  if (evidence.numericIce) facts.push({ id: "numeric-ice", label: "数字冰块", count: evidence.numericIce.count, detail: `${evidence.numericIce.count}块，数字[${evidence.numericIce.values.join("、")}]` });
  if (evidence.directionalExits.frozenCount || evidence.directionalExits.starFrozenCount) facts.push({
    id: "frozen-exit",
    label: "冰封出口",
    count: evidence.directionalExits.frozenCount + evidence.directionalExits.starFrozenCount,
    detail: `普通冰封${evidence.directionalExits.frozenCount}个[${evidence.directionalExits.frozenValues.join("、")}]${evidence.directionalExits.starFrozenCount ? `，星门冰封${evidence.directionalExits.starFrozenCount}个[${evidence.directionalExits.starFrozenValues.join("、")}]` : ""}`,
  });
  if (evidence.shells) facts.push({ id: "multilayer-shell", label: "单层外壳", count: evidence.shells.count, detail: `${evidence.shells.count}块，${evidence.shells.items.map((item) => `${COLOR_LABELS[item.outerColor] ?? item.outerColor}→${COLOR_LABELS[item.innerColor] ?? item.innerColor}`).join("/")}` });
  if (moveGenerators.length) facts.push({ id: "generator", label: "方块生成器", count: moveGenerators.length, detail: `${moveGenerators.length}个，队列[${moveGenerators.map((item) => `move:${item.queueLength}`).join("/")}]` });
  if (timedGenerators.length) facts.push({ id: "timed-generator", label: "定时生成器", count: timedGenerators.length, detail: `${timedGenerators.length}个，间隔[${timedGenerators.map((item) => `${item.intervalSeconds}s:${item.queueLength}块`).join("/")}]` });
  if (evidence.elevators) facts.push({ id: "elevator", label: "移动升降台", count: evidence.elevators.count, detail: `${evidence.elevators.count}个` });
  if (evidence.covers) facts.push({ id: "shutter", label: "倒计时覆盖区", count: evidence.covers.count, detail: `${evidence.covers.count}个，数字[${evidence.covers.values.join("、")}]，隐藏[${evidence.covers.items.map((item) => item.hiddenBlockCount).join("、")}]块` });
  if (evidence.conveyors) facts.push({ id: "conveyor", label: "传送带", count: evidence.conveyors.count, detail: `${evidence.conveyors.count}条` });
  if (evidence.axisBlocks) facts.push({ id: "axis-block", label: "轴向限制块", count: evidence.axisBlocks.count, detail: `${evidence.axisBlocks.count}块，横${evidence.axisBlocks.byAxis.horizontal ?? 0}/竖${evidence.axisBlocks.byAxis.vertical ?? 0}` });
  if (evidence.keyLocks) facts.push({ id: "key-lock", label: "钥匙与锁", count: evidence.keyLocks.keyCount + evidence.keyLocks.lockCount, detail: `钥匙${evidence.keyLocks.keyCount}块/锁${evidence.keyLocks.lockCount}块，锁值[${evidence.keyLocks.locks.map((item) => item.requirement).join("、")}]` });
  if (evidence.layeredLifts) facts.push({ id: "layered-lift", label: "分层框", count: evidence.layeredLifts.count, detail: `${evidence.layeredLifts.count}个，分层块数[${evidence.layeredLifts.items.map((item) => item.layerBlockCounts.join("→")).join("/")}]` });
  if (evidence.stagedFrames) facts.push({ id: "staged-frame", label: "阶段框", count: evidence.stagedFrames.count, detail: `${evidence.stagedFrames.count}个，前批[${evidence.stagedFrames.items.map((item) => item.triggerBlockIds?.length ?? item.value).join("、")}]→后批[${evidence.stagedFrames.items.map((item) => item.hiddenBlockCount).join("、")}]` });
  if (evidence.stars) facts.push({ id: "star", label: "星标块与星门", count: evidence.stars.blockCount + evidence.stars.gateCount, detail: `${evidence.stars.blockCount}块/${evidence.stars.gateCount}门` });
  return facts;
};

const compactRanges = (ids) => {
  if (!ids.length) return "—";
  const ranges = [];
  let start = ids[0];
  let previous = ids[0];
  const flush = () => ranges.push(start === previous ? `${start}` : `${start}–${previous}`);
  for (const id of ids.slice(1)) {
    if (id === previous + 1) {
      previous = id;
      continue;
    }
    flush();
    start = id;
    previous = id;
  }
  flush();
  return ranges.join("、");
};

const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

const EVIDENCE_ONLY_MECHANISMS = {
  "axis-block": { title: "轴向限制块", group: "constraint" },
  "key-lock": { title: "钥匙与锁", group: "constraint" },
  "layered-lift": { title: "分层框", group: "device" },
  "staged-frame": { title: "阶段框", group: "device" },
};

const buildReport = (levels, mechanismGuide) => {
  const guideById = new Map(mechanismGuide.map((item) => [item.id, item]));
  const rows = levels.map((level) => {
    const validCells = playableCells(level);
    const visible = visibleBlocks(level);
    const openingCellClaims = occupiedCellKeys(visible);
    const openingOccupiedCells = new Set(openingCellClaims).size;
    if (openingOccupiedCells !== openingCellClaims.length) {
      throw new Error(`Lv${level.id} has overlapping opening-visible block cells`);
    }
    const stageColors = [...new Set(level.blocks.flatMap((block) => block.layers ?? [block.color]))]
      .sort((left, right) => COLOR_ORDER.indexOf(left) - COLOR_ORDER.indexOf(right));
    const shapes = Object.fromEntries(orderedEntries(countBy(level.blocks.map(shapeKind)), SHAPE_ORDER));
    const evidence = mechanismEvidence(level);
    const mechanisms = mechanismFacts(level, evidence).map((item) => ({
      ...item,
      label: guideById.get(item.id)?.title ?? EVIDENCE_ONLY_MECHANISMS[item.id]?.title ?? item.label,
    }));
    return {
      level: level.id,
      name: level.name,
      board: `${level.width}×${level.height}`,
      boardCells: level.width * level.height,
      playableCells: validCells.length,
      totalBlocks: level.blocks.length,
      visibleBlocks: visible.length,
      clearStages: level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
      openingOccupiedCells,
      allBlockCellArea: level.blocks.reduce((sum, block) => sum + block.shape.length, 0),
      colorCount: stageColors.length,
      colors: stageColors,
      shapeCount: Object.keys(shapes).length,
      shapes,
      mechanisms,
      mechanismEvidence: evidence,
      featureIntro: level.featureIntro?.kind ?? null,
    };
  });

  const mechanismIds = [...new Set(rows.flatMap((row) => row.mechanisms.map((item) => item.id)))];
  const mechanisms = mechanismIds.map((id) => {
    const matching = rows.filter((row) => row.mechanisms.some((item) => item.id === id));
    const label = matching[0].mechanisms.find((item) => item.id === id).label;
    const guide = guideById.get(id);
    const fallback = EVIDENCE_ONLY_MECHANISMS[id];
    return {
      id,
      label,
      group: guide?.group ?? fallback?.group ?? null,
      count: matching.length,
      firstLevel: matching[0].level,
      catalogUnlockLevel: guide?.unlockLevel ?? null,
      levels: matching.map((row) => row.level),
    };
  });
  const actualIds = [...mechanismIds].sort();
  const catalogIds = mechanismGuide.map((item) => item.id).sort();
  const catalogParity = {
    exact: JSON.stringify(actualIds) === JSON.stringify(catalogIds)
      && mechanisms.every((item) => item.catalogUnlockLevel === null || item.firstLevel === item.catalogUnlockLevel),
    runtimeOnlyIds: actualIds.filter((id) => !catalogIds.includes(id)),
    catalogOnlyIds: catalogIds.filter((id) => !actualIds.includes(id)),
    firstLevelMismatches: mechanisms
      .filter((item) => item.catalogUnlockLevel !== null && item.firstLevel !== item.catalogUnlockLevel)
      .map((item) => ({ id: item.id, runtime: item.firstLevel, catalog: item.catalogUnlockLevel })),
  };
  return {
    schemaVersion: 2,
    levelCount: levels.length,
    firstLevel: levels[0]?.id ?? null,
    lastLevel: levels.at(-1)?.id ?? null,
    semanticSha256: semanticHash(levels),
    definitions: {
      board: "width×height 是棋盘边界；playableCells 是扣除缺口后的实际可用格数。",
      blocks: "totalBlocks 统计本关全部色块对象；visibleBlocks 排除开局仍被生成器、卷帘或内部批次区隐藏的色块。",
      clearStages: "clearStages 是完整通关需要清除的颜色层数；双色/单层外壳会比色块对象多一层。",
      occupiedCells: "openingOccupiedCells 是开局画面已出现色块实际占用的唯一棋盘格，包含仍被冻结的可见色块，不含生成器、卷帘或内部批次区的隐藏货物；allBlockCellArea 则包含全部隐藏色块面积。",
      colors: "统计全部色块清除阶段会出现的颜色，包含双色/外壳层。",
      shapes: "统计本关全部色块的形状直方图，方向不同的横条与竖条分开。",
      mechanisms: "由最终运行时字段逐关检测；mechanismEvidence 无损保留数字、颜色层、触发方式、队列顺序、批次关系与逐项载体。内部 staging 单列并标记为非玩家机制。",
    },
    shapeLegend: SHAPE_LABELS,
    catalogParity,
    mechanisms,
    levels: rows,
  };
};

const renderMarkdown = (report) => {
  const lines = [
    "# 正式关卡逐关机制与构成清单",
    "",
    `数据源：运行时 \`src/core/levels.ts\` 导出的 \`LEVELS\`（${report.firstLevel}–${report.lastLevel}，共 ${report.levelCount} 关）。`,
    "",
    `运行时语义 SHA-256：\`${report.semanticSha256}\`。`,
    "",
    "## 统计口径",
    "",
    `- 棋盘：${report.definitions.board}`,
    `- 色块：${report.definitions.blocks}`,
    `- 清除层数：${report.definitions.clearStages}`,
    `- 色块占格：${report.definitions.occupiedCells}`,
    `- 颜色种类：${report.definitions.colors}`,
    `- 形状种类：${report.definitions.shapes}`,
    `- 机制：${report.definitions.mechanisms}`,
    "- 所有关卡都使用颜色出口；机制列仍完整列出该基础规则，便于逐关核对。",
    "",
    "## 运行时与机制目录核对",
    "",
    `- 完全一致：${report.catalogParity.exact ? "是" : "否"}`,
    `- 仅运行时出现：${report.catalogParity.runtimeOnlyIds.join("、") || "—"}`,
    `- 仅机制目录保留：${report.catalogParity.catalogOnlyIds.join("、") || "—"}`,
    `- 首发不一致：${report.catalogParity.firstLevelMismatches.map((item) => `${item.id}（运行时 Lv${item.runtime} / 目录 Lv${item.catalog}）`).join("、") || "—"}`,
    "",
    "## 机制分布汇总",
    "",
    "| 机制 | 分类 | 覆盖关数 | 运行时首发 | 目录首发 | 关卡 |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...report.mechanisms.map((item) => `| ${item.label} | ${item.group} | ${item.count} | Lv${item.firstLevel} | ${item.catalogUnlockLevel === null ? "—" : `Lv${item.catalogUnlockLevel}`} | ${compactRanges(item.levels)} |`),
    "",
    "## 形状代码",
    "",
    ...Object.entries(report.shapeLegend).map(([id, label]) => `- \`${id}\`：${label}`),
    "",
    "## 逐关清单",
    "",
    "| 关卡 | 名称 | 棋盘 | 有效格 | 色块（总/开局可见/清除层） | 占格（开局/全部） | 颜色种类 | 形状分布 | 机制 |",
    "| ---: | --- | ---: | ---: | ---: | ---: | --- | --- | --- |",
    ...report.levels.map((row) => {
      const colors = `${row.colorCount}（${row.colors.map((color) => COLOR_LABELS[color] ?? color).join("、")}）`;
      const shapes = orderedEntries(row.shapes, SHAPE_ORDER).map(([id, count]) => `${id}×${count}`).join("、");
      const mechanisms = row.mechanisms.map((item) => `${item.label}（${item.detail}）`).join("、");
      return `| ${row.level} | ${row.name.replaceAll("|", "\\|")} | ${row.board} | ${row.playableCells} | ${row.totalBlocks}/${row.visibleBlocks}/${row.clearStages} | ${row.openingOccupiedCells}/${row.allBlockCellArea} | ${colors} | ${shapes} | ${mechanisms} |`;
    }),
    "",
  ];
  return lines.join("\n");
};

const renderCsv = (report) => {
  const header = ["关卡", "名称", "棋盘边界", "边界总格", "有效格", "色块总数", "开局可见色块", "清除层数", "开局色块占格", "全部色块面积", "颜色种类数", "颜色", "形状种类数", "形状分布", "机制", "精确机制证据(JSON)"];
  const lines = [header, ...report.levels.map((row) => [
    row.level,
    row.name,
    row.board,
    row.boardCells,
    row.playableCells,
    row.totalBlocks,
    row.visibleBlocks,
    row.clearStages,
    row.openingOccupiedCells,
    row.allBlockCellArea,
    row.colorCount,
    row.colors.map((color) => COLOR_LABELS[color] ?? color).join("/"),
    row.shapeCount,
    orderedEntries(row.shapes, SHAPE_ORDER).map(([id, count]) => `${id}×${count}`).join("/"),
    row.mechanisms.map((item) => `${item.label}(${item.detail})`).join("/"),
    JSON.stringify(row.mechanismEvidence),
  ])];
  return `\uFEFF${lines.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
};

const verifyOrWrite = async (path, expected) => {
  if (!checkOnly) {
    await writeFile(path, expected, "utf8");
    return;
  }
  const current = await readFile(path, "utf8");
  if (current !== expected) throw new Error(`${path} is out of date; regenerate the level mechanism matrix`);
};

const vite = await createServer({ root, logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
try {
  const [{ LEVELS }, { MECHANISM_GUIDE }, { validateLevel }] = await Promise.all([
    vite.ssrLoadModule("/src/core/levels.ts"),
    vite.ssrLoadModule("/src/core/mechanismCatalog.ts"),
    vite.ssrLoadModule("/src/core/PuzzleModel.ts"),
  ]);
  if (!Array.isArray(LEVELS) || !LEVELS.length) throw new Error("Runtime LEVELS is empty or unavailable");
  const ids = LEVELS.map((level) => level.id);
  if (new Set(ids).size !== ids.length || ids.some((id, index) => id !== index + 1)) {
    throw new Error(`Expected continuous level IDs 1-${LEVELS.length}, received ${ids.join(",")}`);
  }
  LEVELS.forEach((level) => validateLevel(level));
  const report = buildReport(LEVELS, MECHANISM_GUIDE);
  await Promise.all([
    verifyOrWrite(markdownPath, renderMarkdown(report)),
    verifyOrWrite(csvPath, renderCsv(report)),
    verifyOrWrite(jsonPath, `${JSON.stringify(report, null, 2)}\n`),
  ]);
  console.log(`${checkOnly ? "Verified" : "Generated"} ${report.levelCount} level rows at semantic SHA-256 ${report.semanticSha256}.`);
} finally {
  await vite.close();
}
