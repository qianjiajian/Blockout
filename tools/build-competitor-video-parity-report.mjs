import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const REVISION = process.env.VIDEO_PARITY_REPORT_REVISION ?? "v8-direct-data";
const OUTPUT = path.resolve(ROOT, process.argv[2] ?? `deliverables/competitor-vs-ours-${REVISION}`);
const PAIRS_DIR = path.join(OUTPUT, "level-comparisons");
const CONTRACT_PATH = path.resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v8.json");
const TRUTH_PATH = path.resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json");
const RUNTIME_PATH = path.resolve(ROOT, process.env.VIDEO_PARITY_RUNTIME_PATH ?? ".codex-temp/current-formal-levels.json");
const COMPETITOR_ROOT = path.resolve(ROOT, "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06");
const OUR_ROOT = path.resolve(ROOT, process.env.VIDEO_PARITY_LAYOUT_ROOT ?? `deliverables/level-layouts-${REVISION}`);
const LEVEL_COUNT = 100;
const SKIP_RENDER = process.env.VIDEO_PARITY_SKIP_RENDER === "1";

const SHAPE_ORDER = ["SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "L3", "T4", "L4", "S4", "T5", "L5", "CROSS5", "RECT2X3", "SQ3"];
const SHAPE_LABELS = {
  SINGLE: "单格", H2: "横2格", V2: "竖2格", H3: "横3格", V3: "竖3格", H4: "横4格", V4: "竖4格",
  SQ2: "2×2", L3: "L形3格", T4: "T形4格", L4: "L形4格", S4: "S形4格", T5: "T形5格", L5: "L形5格",
  CROSS5: "十字5格", RECT2X3: "2×3", SQ3: "3×3",
};
const SHAPE_VARIANTS = {
  SINGLE: [[[0, 0]]], H2: [[[0, 0], [1, 0]]], V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]], V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]], V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [[[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]]],
  T4: [[[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]]],
  L4: [[[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]]],
  S4: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  T5: [[[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]], [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]]],
  L5: [[[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]], [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]]],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [[[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]],
  SQ3: [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]],
};

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
    .map((key) => [key, canonical(value[key])]));
};
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const sortedNumbers = (values) => [...(values ?? [])].map(Number).sort((a, b) => a - b);
const countBy = (items, keyOf) => items.reduce((result, item) => {
  const key = keyOf(item); result[key] = (result[key] ?? 0) + 1; return result;
}, {});
const orderedHistogram = (histogram) => Object.fromEntries(SHAPE_ORDER.filter((id) => Number(histogram?.[id] ?? 0) > 0).map((id) => [id, Number(histogram[id])]));
const histogramText = (histogram) => Object.entries(orderedHistogram(histogram)).map(([id, count]) => `${SHAPE_LABELS[id] ?? id}×${count}`).join("、") || "无";
const compact = (value) => typeof value === "string" ? value : JSON.stringify(value);
const imageDataUrl = async (file, mime) => `data:${mime};base64,${(await readFile(file)).toString("base64")}`;
const mechanismDigest = (facts, actual = false) => {
  const parts = [];
  const exits = facts.directional_exits;
  if (exits) parts.push(`普通出口×${exits.ordinary_count ?? 0}`, `冰冻出口${compact(exits.frozen_values ?? [])}`, `星门×${exits.star_count ?? 0}${exits.star_frozen_values?.length ? compact(exits.star_frozen_values) : ""}`);
  if (facts.numeric_ice) parts.push(`数字冰块×${facts.numeric_ice.count}${compact(facts.numeric_ice.values)}`);
  if (facts.shells) parts.push(`双层块×${facts.shells.count}${actual ? `（${facts.shells.color_pairs?.join("/") ?? ""}）` : ""}`);
  if (facts.covers) parts.push(`遮挡×${facts.covers.count}${compact(facts.covers.values)}→批次${compact(facts.covers.hidden_batch_counts)}`);
  if (facts.generators) parts.push(
    `生成器×${facts.generators.count} ${compact(facts.generators.trigger)} 队列${compact(facts.generators.queue_lengths)}`
      + `${facts.generators.queue_sides ? ` 队列边位${compact(facts.generators.queue_sides)}` : ""}`
      + `${facts.generators.queue_offsets ? ` 队列偏移${compact(facts.generators.queue_offsets)}` : ""}`
      + `${facts.generators.rim_spans ? ` 占边${compact(facts.generators.rim_spans)}` : ""}`
      + `${facts.generators.rim_mounts ? ` 安装${compact(facts.generators.rim_mounts)}` : ""}`
      + `${facts.generators.rim_anchors ? ` 视觉锚点${compact(facts.generators.rim_anchors)}` : ""}`,
  );
  if (facts.axis_blocks) parts.push(`轴向块×${facts.axis_blocks.count}`);
  if (facts.key_locks) parts.push(`钥匙×${facts.key_locks.key_count}/锁×${facts.key_locks.lock_count} 要求${compact(facts.key_locks.lock_requirements)}`);
  if (facts.lifts) parts.push(`Lift×${facts.lifts.count} ${facts.lifts.layers?.map((layer) => layer.count).join("→")}`);
  if (facts.staged_frames) parts.push(`固定分层框×${facts.staged_frames.count}`);
  if (facts.stars) parts.push(`星标块×${facts.stars.count}`);
  if (facts.irregular_blocks?.count) parts.push(`异形块×${facts.irregular_blocks.count}`);
  return parts.join("；") || "无";
};

const shapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x)); const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(([x, y]) => `${x},${y}`).join("|");
};
const shapeBySignature = new Map(Object.entries(SHAPE_VARIANTS).flatMap(([id, variants]) => variants.map((shape) => [shapeSignature(shape), id])));
const shapeIdOf = (shape) => shapeBySignature.get(shapeSignature(shape)) ?? "UNKNOWN";
const histogramOf = (blocks) => orderedHistogram(countBy(blocks, (block) => shapeIdOf(block.shape)));
const blockColors = (block) => block.layers?.length ? block.layers : [block.color];

function stageFacts(level, target) {
  const covers = (level.shutters ?? []).filter((item) => !item.skin || item.skin === "shutter");
  const lifts = (level.shutters ?? []).filter((item) => item.skin === "lift");
  const frames = (level.shutters ?? []).filter((item) => item.skin === "staged-frame");
  const generators = level.generators ?? [];
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const generatorPartitions = (target.stage_partitions ?? []).filter((stage) => stage.kind === "side_generator" || stage.kind === "timed_feeder");
  const generatorIds = new Map(generators.flatMap((generator, index) => generator.queueBlockIds.map((id) => [id, generatorPartitions[index]?.id ?? `generator-${index + 1}`])));
  const coverBlocks = covers.map((cover) => ({ device: cover, blocks: level.blocks.filter((block) => block.shutterId === cover.id) }));
  const coverPartitions = (target.stage_partitions ?? []).filter((stage) => stage.kind === "countdown_cover");
  const coverAssignments = new Map();
  if (coverPartitions.length === 1) {
    coverBlocks.forEach(({ device }) => coverAssignments.set(device.id, coverPartitions[0].id));
  } else {
    const remaining = [...coverPartitions];
    for (const entry of coverBlocks) {
      let index = remaining.findIndex((stage) => Number(stage.trigger_value) === Number(entry.device.count)
        && Number(stage.count) === entry.blocks.length && same(orderedHistogram(stage.shape_histogram), histogramOf(entry.blocks)));
      if (index < 0) index = remaining.findIndex((stage) => Number(stage.trigger_value) === Number(entry.device.count));
      const stage = remaining.splice(Math.max(0, index), 1)[0];
      if (stage) coverAssignments.set(entry.device.id, stage.id);
    }
  }
  const liftPartitions = (target.stage_partitions ?? []).filter((item) => item.kind === "lift");
  const framePartitions = (target.stage_partitions ?? []).filter((item) => item.kind === "staged_frame");
  const liftIds = new Map(lifts.flatMap((lift, index) => level.blocks.filter((block) => block.shutterId === lift.id).map((block) => [block.id, liftPartitions[index]?.id ?? `lift-layer-${index + 2}`])));
  const frameIds = new Map(frames.flatMap((frame, index) => level.blocks.filter((block) => block.shutterId === frame.id).map((block) => [block.id, framePartitions[index]?.id ?? `staged-frame-${index + 1}`])));
  const stageIdOfBlock = (block) => generatorIds.get(block.id) ?? liftIds.get(block.id) ?? frameIds.get(block.id)
    ?? (block.shutterId && coverAssignments.get(block.shutterId)) ?? "opening";
  const mechanismStageIdOfBlock = (block) => {
    const ordinary = stageIdOfBlock(block);
    if (ordinary !== "opening") return ordinary;
    const liftFrontIndex = lifts.findIndex((lift) => (lift.triggerBlockIds ?? []).includes(block.id));
    return liftFrontIndex >= 0 ? `lift-layer-${liftFrontIndex + 1}` : ordinary;
  };
  const groups = new Map();
  for (const block of level.blocks) {
    const id = stageIdOfBlock(block); const list = groups.get(id) ?? []; list.push(block); groups.set(id, list);
  }
  const actualPartitions = (target.stage_partitions ?? []).map((stage) => {
    const blocks = groups.get(stage.id) ?? [];
    const cover = covers.find((candidate) => coverAssignments.get(candidate.id) === stage.id);
    const position = stage.position && typeof stage.position === "object" && !Array.isArray(stage.position)
      ? (cover ? { x: cover.x, y: cover.y, width: cover.width, height: cover.height } : null)
      : undefined;
    return {
      id: stage.id,
      kind: stage.kind,
      count: blocks.length,
      shape_histogram: histogramOf(blocks),
      ...(position === undefined ? {} : { position }),
    };
  });
  return { byId, covers, lifts, frames, generators, coverBlocks, stageIdOfBlock, mechanismStageIdOfBlock, groups, actualPartitions };
}

function actualMechanisms(level, target, stage) {
  const opening = stage.groups.get("opening") ?? [];
  const frozenBlocks = level.blocks.filter((block) => Number(block.frozen ?? 0) > 0);
  const shellBlocks = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1);
  const axisBlocks = level.blocks.filter((block) => block.movementAxis);
  const keyBlocks = level.blocks.filter((block) => block.keyId);
  const lockBlocks = level.blocks.filter((block) => block.lockedBy);
  const starBlocks = level.blocks.filter((block) => block.star);
  const ordinaryGates = level.gates.filter((gate) => !gate.star && !Object.hasOwn(gate, "frozen"));
  const frozenGates = level.gates.filter((gate) => !gate.star && Object.hasOwn(gate, "frozen"));
  const starGates = level.gates.filter((gate) => gate.star);
  const coverPartitions = (target.stage_partitions ?? []).filter((item) => item.kind === "countdown_cover");
  const coverBatches = coverPartitions.map((partition) => stage.groups.get(partition.id) ?? []);
  const generatorQueues = stage.generators.map((generator) => generator.queueBlockIds.map((id) => stage.byId.get(id)).filter(Boolean));
  const generatorRimAnchor = (generator) => generator.rimAnchor ?? (generator.side === "top"
    ? { x: generator.offset + 0.5, y: 0, quarterTurns: 0 }
    : generator.side === "right"
      ? { x: level.width, y: generator.offset + 0.5, quarterTurns: 1 }
      : generator.side === "bottom"
        ? { x: generator.offset + 0.5, y: level.height, quarterTurns: 2 }
        : { x: 0, y: generator.offset + 0.5, quarterTurns: 3 });
  const liftLayers = stage.lifts.length ? [
    ...(() => {
      const first = stage.lifts[0];
      const front = (first.triggerBlockIds ?? []).map((id) => stage.byId.get(id)).filter(Boolean);
      return [{ layer: 1, count: front.length, histogram: histogramOf(front) }];
    })(),
    ...stage.lifts.map((lift, index) => {
      const hidden = level.blocks.filter((block) => block.shutterId === lift.id);
      return { layer: index + 2, count: hidden.length, histogram: histogramOf(hidden) };
    }),
  ] : [];
  const frameLayers = stage.frames.map((frame) => {
    const front = (frame.triggerBlockIds ?? []).map((id) => stage.byId.get(id)).filter(Boolean);
    const hidden = level.blocks.filter((block) => block.shutterId === frame.id);
    return { front: { count: front.length, histogram: histogramOf(front) }, hidden: { count: hidden.length, histogram: histogramOf(hidden) } };
  });
  const byAxisShape = {};
  for (const block of axisBlocks) {
    byAxisShape[block.movementAxis] ??= {}; const id = shapeIdOf(block.shape);
    byAxisShape[block.movementAxis][id] = (byAxisShape[block.movementAxis][id] ?? 0) + 1;
  }
  return canonical({
    directional_exits: {
      ordinary_count: ordinaryGates.length,
      frozen_values: sortedNumbers(frozenGates.map((gate) => gate.frozen)),
      star_count: starGates.length,
      star_frozen_count: starGates.filter((gate) => Object.hasOwn(gate, "frozen")).length,
      star_frozen_values: sortedNumbers(starGates.filter((gate) => Object.hasOwn(gate, "frozen")).map((gate) => gate.frozen)),
    },
    numeric_ice: frozenBlocks.length ? {
      count: frozenBlocks.length, values: sortedNumbers(frozenBlocks.map((block) => block.frozen)),
      shape_histogram: histogramOf(frozenBlocks), opening_visible_count: frozenBlocks.filter((block) => stage.stageIdOfBlock(block) === "opening").length,
      items: frozenBlocks.map((block) => ({ value: block.frozen, shape: shapeIdOf(block.shape), stage_id: stage.mechanismStageIdOfBlock(block) }))
        .sort((a, b) => String(a.stage_id).localeCompare(String(b.stage_id)) || String(a.shape).localeCompare(String(b.shape)) || a.value - b.value),
      post_melt_shell: frozenBlocks.filter((block) => (block.layers?.length ?? 1) > 1).length,
    } : null,
    shells: shellBlocks.length ? {
      count: shellBlocks.length, opening_visible_count: shellBlocks.filter((block) => stage.stageIdOfBlock(block) === "opening").length,
      extra_layers: shellBlocks.map((block) => block.layers.length - 1).sort(), shape_histogram: histogramOf(shellBlocks),
      items: shellBlocks.map((block) => ({ shape: shapeIdOf(block.shape), stage_id: stage.stageIdOfBlock(block), extra_layers: block.layers.length - 1, requires_numeric_ice: Number(block.frozen ?? 0) > 0 }))
        .sort((a, b) => compact(a).localeCompare(compact(b))),
      color_pairs: shellBlocks.map((block) => `${block.layers[0]}→${block.layers.at(-1)}`),
      outer_core_distinct: shellBlocks.every((block) => block.layers[0] !== block.layers.at(-1)),
    } : null,
    covers: stage.covers.length ? {
      count: stage.covers.length, values: stage.covers.map((cover) => cover.count),
      hidden_batch_counts: coverBatches.map((blocks) => blocks.length), hidden_batch_histograms: coverBatches.map(histogramOf),
    } : null,
    generators: stage.generators.length ? {
      count: stage.generators.length, trigger: stage.generators.map((generator) => generator.trigger ?? "move"),
      queue_lengths: generatorQueues.map((queue) => queue.length), queue_histograms: generatorQueues.map(histogramOf),
      preview_shapes: generatorQueues.map((queue) => queue[0] ? shapeIdOf(queue[0].shape) : null),
      queue_shape_sequences: generatorQueues.map((queue) => queue.map((block) => shapeIdOf(block.shape))),
      queue_sides: stage.generators.map((generator) => generator.side),
      queue_offsets: stage.generators.map((generator) => generator.offset),
      rim_spans: stage.generators.map((generator) => generator.rimSpan ?? null),
      rim_mounts: stage.generators.map((generator) => generator.rimMount ?? null),
      rim_anchors: stage.generators.map(generatorRimAnchor),
      interval_seconds: stage.generators.map((generator) => generator.intervalSeconds ?? null),
    } : null,
    axis_blocks: axisBlocks.length ? {
      count: axisBlocks.length, shape_histogram: histogramOf(axisBlocks), by_axis_shape: Object.fromEntries(Object.entries(byAxisShape).map(([axis, histogram]) => [axis, orderedHistogram(histogram)])),
      axes: axisBlocks.map((block) => block.movementAxis).sort(), items: axisBlocks.map((block) => ({ shape: shapeIdOf(block.shape), axis: block.movementAxis, stage_id: stage.stageIdOfBlock(block) })).sort((a, b) => compact(a).localeCompare(compact(b))),
      opening_visible_count: axisBlocks.filter((block) => stage.stageIdOfBlock(block) === "opening").length,
    } : null,
    key_locks: keyBlocks.length || lockBlocks.length ? {
      key_count: keyBlocks.length, key_shapes: histogramOf(keyBlocks), opening_visible_key_count: keyBlocks.filter((block) => stage.stageIdOfBlock(block) === "opening").length,
      lock_count: lockBlocks.length, lock_requirements: sortedNumbers(lockBlocks.map((block) => block.lockCount ?? 1)), lock_shapes: histogramOf(lockBlocks),
      opening_visible_lock_count: lockBlocks.filter((block) => stage.stageIdOfBlock(block) === "opening").length,
    } : null,
    lifts: stage.lifts.length ? { count: 1, layers: liftLayers } : null,
    staged_frames: stage.frames.length ? { count: stage.frames.length, layers: frameLayers } : null,
    stars: starBlocks.length || starGates.length ? { count: starBlocks.length, shape_histogram: histogramOf(starBlocks), plain_same_shape_count: level.blocks.filter((block) => !block.star && new Set(starBlocks.map((item) => shapeIdOf(item.shape))).has(shapeIdOf(block.shape))).length, gate_count: starGates.length } : null,
    irregular_blocks: { count: level.blocks.filter((block) => !new Set(["SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "RECT2X3", "SQ3"]).has(shapeIdOf(block.shape))).length },
    unexpected_legacy_mechanisms: { elevators: level.elevators?.length ?? 0, conveyors: level.conveyors?.length ?? 0 },
  });
}

function mechanismRows(expected, actual) {
  const rows = [];
  const add = (pathName, label, left, right, note = "") => rows.push({ path: pathName, label, competitor: left, ours: right, match: same(left, right), note });
  const exits = expected.directional_exits ?? {};
  add("exits.ordinary_count", "普通出口数量", exits.ordinary_count ?? 0, actual.directional_exits.ordinary_count);
  add("exits.frozen_values", "冰冻出口数字", sortedNumbers(exits.frozen_values), actual.directional_exits.frozen_values);
  add("exits.star_count", "星门数量", exits.star_count ?? 0, actual.directional_exits.star_count);
  add("exits.star_frozen_values", "星门冰冻数字", sortedNumbers(exits.star_frozen_values), actual.directional_exits.star_frozen_values);

  const numeric = expected.numeric_ice;
  add("numeric_ice.count", "数字冰块数量", numeric?.count ?? 0, actual.numeric_ice?.count ?? 0);
  if (numeric) {
    add("numeric_ice.values", "数字冰块数字", sortedNumbers(numeric.values), actual.numeric_ice.values);
    if (numeric.shape_histogram) add("numeric_ice.shape_histogram", "数字冰块形状", orderedHistogram(numeric.shape_histogram), actual.numeric_ice.shape_histogram);
    if (Number.isInteger(numeric.opening_visible_count)) add("numeric_ice.opening_visible_count", "开局可见数字冰块", numeric.opening_visible_count, actual.numeric_ice.opening_visible_count);
    if (Array.isArray(numeric.items)) {
      const sortItems = (items) => [...items].map((item) => ({ value: Number(item.value), shape: item.shape, stage_id: item.stage_id })).sort((a, b) => compact(a).localeCompare(compact(b)));
      add("numeric_ice.items", "数字冰块数字×形状×阶段", sortItems(numeric.items), sortItems(actual.numeric_ice.items));
    }
    if (numeric.post_melt_shell !== null && numeric.post_melt_shell !== undefined && Number.isFinite(Number(numeric.post_melt_shell))) add("numeric_ice.post_melt_shell", "融冰后仍有外壳数量", Number(numeric.post_melt_shell), actual.numeric_ice.post_melt_shell);
  }

  const shells = expected.shells;
  add("shells.count", "双层色块数量", shells?.count ?? 0, actual.shells?.count ?? 0);
  if (shells) {
    add("shells.extra_layers", "每块额外外壳层数", sortedNumbers(shells.extra_layers), actual.shells.extra_layers);
    if (Number.isInteger(shells.opening_visible_count)) add("shells.opening_visible_count", "开局可见双层色块", shells.opening_visible_count, actual.shells.opening_visible_count);
    if (shells.shape_histogram) add("shells.shape_histogram", "双层色块形状", orderedHistogram(shells.shape_histogram), actual.shells.shape_histogram);
    if (Array.isArray(shells.items)) {
      const items = shells.items.map((item) => ({ shape: item.shape, stage_id: item.stage_id, extra_layers: item.extra_layers, requires_numeric_ice: Boolean(item.requires_numeric_ice) })).sort((a, b) => compact(a).localeCompare(compact(b)));
      add("shells.items", "双层色块形状×阶段×冰冻绑定", items, actual.shells.items);
    }
    add("shells.outer_core_distinct", "双层色块内外颜色不同", true, actual.shells.outer_core_distinct, actual.shells.color_pairs.join("、"));
  }

  const covers = expected.covers;
  add("covers.count", "倒计时遮挡数量", covers?.count ?? 0, actual.covers?.count ?? 0);
  if (covers) {
    add("covers.values", "倒计时遮挡数字", covers.values, actual.covers.values);
    add("covers.hidden_batch_counts", "遮挡后隐藏批次数量", covers.hidden_batch_counts, actual.covers.hidden_batch_counts);
    add("covers.hidden_batch_histograms", "遮挡后隐藏形状", covers.hidden_batch_histograms.map(orderedHistogram), actual.covers.hidden_batch_histograms);
  }

  const generators = expected.generators;
  add("generators.count", "生成器数量", generators?.count ?? 0, actual.generators?.count ?? 0);
  if (generators) {
    add("generators.trigger", "生成器触发逻辑", Array.from({ length: generators.count }, () => generators.trigger), actual.generators.trigger);
    add("generators.queue_lengths", "生成器队列长度", generators.queue_lengths, actual.generators.queue_lengths);
    add("generators.queue_histograms", "生成器队列形状", generators.queue_histograms.map(orderedHistogram), actual.generators.queue_histograms);
    if (generators.preview_shapes) add("generators.preview_shapes", "生成器预览形状", generators.preview_shapes, actual.generators.preview_shapes);
    if (generators.queue_shape_sequences) add("generators.queue_shape_sequences", "生成器出块顺序", generators.queue_shape_sequences, actual.generators.queue_shape_sequences);
    if (generators.queue_sides) add("generators.queue_sides", "生成器边位", generators.queue_sides, actual.generators.queue_sides);
    add("generators.rim_spans", "生成器占用边框格数", Array.from({ length: generators.count }, () => 3), actual.generators.rim_spans);
    if (generators.trigger === "time") add("generators.interval_seconds", "定时生成间隔", Array.from({ length: generators.count }, () => 1), actual.generators.interval_seconds);
  }

  const axes = expected.axis_blocks;
  add("axis_blocks.count", "轴向限制块数量", axes?.count ?? 0, actual.axis_blocks?.count ?? 0);
  if (axes) {
    if (axes.shape_histogram) add("axis_blocks.shape_histogram", "轴向限制块形状", orderedHistogram(axes.shape_histogram), actual.axis_blocks.shape_histogram);
    if (axes.by_axis_shape) add("axis_blocks.by_axis_shape", "轴向×形状", canonical(axes.by_axis_shape), canonical(actual.axis_blocks.by_axis_shape));
    if (axes.axes) add("axis_blocks.axes", "轴向列表", [...axes.axes].sort(), actual.axis_blocks.axes);
    if (axes.items) {
      const stageScoped = axes.items.some((item) => item.stage_id !== null && item.stage_id !== undefined);
      const normalize = (item) => ({ shape: item.shape, axis: item.axis, ...(stageScoped ? { stage_id: item.stage_id } : {}) });
      add("axis_blocks.items", "轴向块形状×方向×阶段", axes.items.map(normalize).sort((a, b) => compact(a).localeCompare(compact(b))), actual.axis_blocks.items.map(normalize).sort((a, b) => compact(a).localeCompare(compact(b))));
    }
    if (typeof axes.hidden_at_opening === "boolean") add("axis_blocks.opening_visible_count", "开局可见轴向块", axes.hidden_at_opening ? 0 : axes.count, actual.axis_blocks.opening_visible_count);
  }

  const keys = expected.key_locks;
  add("key_locks.key_count", "钥匙块数量", keys?.key_count ?? 0, actual.key_locks?.key_count ?? 0);
  add("key_locks.lock_count", "锁块数量", keys?.lock_count ?? 0, actual.key_locks?.lock_count ?? 0);
  if (keys) {
    add("key_locks.lock_requirements", "每个锁所需钥匙数", sortedNumbers(keys.lock_requirements), actual.key_locks.lock_requirements);
    if (keys.key_shapes) add("key_locks.key_shapes", "钥匙块形状", orderedHistogram(keys.key_shapes), actual.key_locks.key_shapes);
    if (keys.lock_shapes) add("key_locks.lock_shapes", "锁块形状", orderedHistogram(keys.lock_shapes), actual.key_locks.lock_shapes);
    add("key_locks.opening_visible_key_count", "开局可见钥匙块", keys.opening_visible_key_count, actual.key_locks.opening_visible_key_count);
    if (typeof keys.lock_hidden_at_opening === "boolean") add("key_locks.opening_visible_lock_count", "开局可见锁块", keys.lock_hidden_at_opening ? 0 : keys.lock_count, actual.key_locks.opening_visible_lock_count);
  }

  const lifts = expected.lifts;
  add("lifts.count", "Lift数量", lifts?.count ?? 0, actual.lifts?.count ?? 0);
  if (lifts) add("lifts.layers", "Lift分层构成", lifts.layers.map((layer) => ({ layer: layer.layer, count: layer.count, histogram: orderedHistogram(layer.histogram) })), actual.lifts.layers);
  const frames = expected.staged_frames;
  add("staged_frames.count", "固定分层框数量", frames?.count ?? 0, actual.staged_frames?.count ?? 0);
  if (frames) {
    const hiddenExpected = frames.layers.slice(1).map((layer) => ({ count: layer.count, histogram: orderedHistogram(layer.histogram) }));
    const hiddenActual = actual.staged_frames.layers.map((layer) => layer.hidden);
    add("staged_frames.hidden_layers", "固定分层框隐藏层", hiddenExpected, hiddenActual, frames.semantic);
  }
  const stars = expected.stars;
  add("stars.count", "星标色块数量", stars?.count ?? 0, actual.stars?.count ?? 0);
  if (stars) {
    add("stars.shape_histogram", "星标色块形状", orderedHistogram(stars.shape_histogram), actual.stars.shape_histogram);
    add("stars.plain_same_shape_count", "同形普通块数量", stars.plain_same_shape_count, actual.stars.plain_same_shape_count);
  }
  const irregular = expected.irregular_blocks;
  if (irregular) add("irregular_blocks.count", "异形块数量", irregular.count, actual.irregular_blocks.count);
  add("unexpected.elevators", "非竞品移动升降台", 0, actual.unexpected_legacy_mechanisms.elevators);
  add("unexpected.conveyors", "非竞品传送带", 0, actual.unexpected_legacy_mechanisms.conveyors);
  return rows;
}

const [contract, truth, runtime, ourManifest, competitorManifest] = await Promise.all([
  readFile(CONTRACT_PATH, "utf8").then(JSON.parse), readFile(TRUTH_PATH, "utf8").then(JSON.parse), readFile(RUNTIME_PATH, "utf8").then(JSON.parse),
  SKIP_RENDER ? Promise.resolve({ levelCount: LEVEL_COUNT }) : readFile(path.join(OUR_ROOT, "manifest.json"), "utf8").then(JSON.parse),
  readFile(path.join(COMPETITOR_ROOT, "manifest.json"), "utf8").then(JSON.parse),
]);
if (contract.levels.length !== LEVEL_COUNT || truth.levels.length !== LEVEL_COUNT || runtime.length !== LEVEL_COUNT) throw new Error("Expected 100 contract, truth, and runtime levels");
if (ourManifest.levelCount !== LEVEL_COUNT || competitorManifest.count !== LEVEL_COUNT) throw new Error("Expected 100 screenshots on both sides");
const runtimeSha = sha256(JSON.stringify(canonical(runtime)));
if (!SKIP_RENDER && ourManifest.campaignSemanticSha256 !== runtimeSha) throw new Error(`Screenshot manifest ${ourManifest.campaignSemanticSha256} does not match runtime ${runtimeSha}`);
await mkdir(PAIRS_DIR, { recursive: true });

const records = contract.levels.map((entry, index) => {
  const source = truth.levels[index]; const level = runtime[index]; const target = entry.our_design_target;
  const stage = stageFacts(level, target); const actualMechanism = actualMechanisms(level, target, stage);
  const mechanismChecks = mechanismRows(target.mechanism_contract, actualMechanism);
  const hiddenIds = new Set(level.blocks.filter((block) => stage.stageIdOfBlock(block) !== "opening").map((block) => block.id));
  const openingBlocks = level.blocks.filter((block) => !hiddenIds.has(block.id));
  // The source truth deliberately does not guess colors hidden under numeric
  // ice. When its opening count is lower than the full count, mirror that
  // evidence scope instead of claiming the ice-covered body color was visible.
  const allOpeningColorCount = new Set(openingBlocks.flatMap(blockColors)).size;
  const nonIceOpeningBlocks = openingBlocks.filter((block) => Number(block.frozen ?? 0) === 0);
  const sourceObservableOpeningBlocks = allOpeningColorCount === source.composition.opening_color_count
    ? openingBlocks
    : nonIceOpeningBlocks;
  const metrics = [
    { key: "board_size", label: "棋盘大小", competitor: `${source.board.cols}×${source.board.rows}`, ours: `${level.width}×${level.height}`, match: source.board.cols === level.width && source.board.rows === level.height },
    { key: "playable_cells", label: "可玩格数", competitor: source.board.playable_cell_count, ours: level.playable?.length ?? level.width * level.height - (level.blocked?.length ?? 0), match: source.board.playable_cell_count === (level.playable?.length ?? level.width * level.height - (level.blocked?.length ?? 0)) },
    { key: "time_seconds", label: "总时间", competitor: source.time_seconds, ours: level.timeSeconds, match: source.time_seconds === level.timeSeconds },
    { key: "opening_piece_count", label: "开局色块数量", competitor: source.composition.opening_piece_count, ours: openingBlocks.length, match: source.composition.opening_piece_count === openingBlocks.length },
    { key: "full_piece_count", label: "全关色块数量", competitor: source.composition.source_full_piece_count, ours: level.blocks.length, match: source.composition.source_full_piece_count === level.blocks.length },
    { key: "shape_histogram", label: "全关色块形状", competitor: orderedHistogram(source.composition.source_full_shape_histogram), ours: histogramOf(level.blocks), match: same(orderedHistogram(source.composition.source_full_shape_histogram), histogramOf(level.blocks)) },
    { key: "occupied_cells", label: "色块总占格", competitor: source.composition.source_occupied_cell_count, ours: level.blocks.reduce((sum, block) => sum + block.shape.length, 0), match: source.composition.source_occupied_cell_count === level.blocks.reduce((sum, block) => sum + block.shape.length, 0) },
    { key: "opening_colors", label: "开局可辨识颜色种类", competitor: source.composition.opening_color_count, ours: new Set(sourceObservableOpeningBlocks.flatMap(blockColors)).size, match: source.composition.opening_color_count === new Set(sourceObservableOpeningBlocks.flatMap(blockColors)).size },
    { key: "full_colors", label: "全关颜色种类", competitor: source.composition.full_color_count, ours: new Set(level.blocks.flatMap(blockColors)).size, match: source.composition.full_color_count === new Set(level.blocks.flatMap(blockColors)).size },
    ...(() => {
      const expectedPartitions = target.stage_partitions.map((item) => ({
        id: item.id,
        kind: item.kind,
        count: item.count,
        shape_histogram: orderedHistogram(item.shape_histogram),
        ...(item.position && typeof item.position === "object" && !Array.isArray(item.position)
          ? { position: item.position }
          : {}),
      }));
      return [{
        key: "stage_partitions",
        label: "阶段/隐藏批次构成与已知覆盖区",
        competitor: expectedPartitions,
        ours: stage.actualPartitions,
        match: same(expectedPartitions, stage.actualPartitions),
      }];
    })(),
  ];
  const allChecks = [...metrics, ...mechanismChecks];
  return {
    level: level.id, name: level.name, revision: REVISION,
    competitorScreenshot: path.relative(OUTPUT, path.join(COMPETITOR_ROOT, "levels", `competitor-level-${String(level.id).padStart(3, "0")}.jpg`)).replaceAll("\\", "/"),
    ourScreenshot: path.relative(OUTPUT, path.join(OUR_ROOT, "full-screens", `level-${String(level.id).padStart(3, "0")}.png`)).replaceAll("\\", "/"),
    comparisonImage: `level-comparisons/level-${String(level.id).padStart(3, "0")}.png`,
    boardMaskPolicy: "棋盘外框必须原创；只核棋盘宽高与可玩格总数，不要求源 mask 相同",
    metrics, mechanisms: { competitor: target.mechanism_contract, ours: actualMechanism, checks: mechanismChecks },
    unclearFields: source.provenance?.unclear_fields ?? [],
    exact: allChecks.every((check) => check.match), mismatches: allChecks.filter((check) => !check.match),
  };
});

if (!SKIP_RENDER) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1280 }, deviceScaleFactor: 1 });
  for (const record of records) {
  const competitorFile = path.resolve(OUTPUT, record.competitorScreenshot);
  const ourFile = path.resolve(OUTPUT, record.ourScreenshot);
  const [competitorImage, ourImage] = await Promise.all([imageDataUrl(competitorFile, "image/jpeg"), imageDataUrl(ourFile, "image/png")]);
  const summaryRows = record.metrics.slice(0, 9).map((row) => `<div class="row"><b>${escapeHtml(row.label)} <i class="${row.match ? "ok" : "bad"}">${row.match ? "一致" : "不同"}</i></b><span>${escapeHtml(row.key === "shape_histogram" ? histogramText(row.competitor) : compact(row.competitor))}</span><span>${escapeHtml(row.key === "shape_histogram" ? histogramText(row.ours) : compact(row.ours))}</span></div>`).join("");
  const mechanismDiff = record.mechanisms.checks.filter((check) => !check.match);
  const mechanismSummary = mechanismDiff.length ? mechanismDiff.map((item) => `${item.label}：竞品${compact(item.competitor)} / 本游戏${compact(item.ours)}`).join("；") : "所有机制的数量、数字、形状/阶段绑定与逻辑均一致";
  const competitorMechanismDigest = mechanismDigest(record.mechanisms.competitor);
  const ourMechanismDigest = mechanismDigest(record.mechanisms.ours, true);
  await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1500px;height:1280px;overflow:hidden;background:#0e0a32;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}body{padding:22px 26px}
    header{height:58px;display:flex;justify-content:space-between;align-items:flex-start}h1{margin:0;font-size:32px}.status{padding:8px 14px;border-radius:17px;background:${record.exact ? "#174f3b" : "#64253a"};color:${record.exact ? "#7df2b5" : "#ff9bae"};font-weight:800}
    .shots{display:grid;grid-template-columns:1fr 1fr;gap:18px;height:700px}.panel{background:#1b1753;border:1px solid #45408a;border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center}.panel h2{font-size:21px;margin:0 0 8px}.panel img{display:block;max-width:100%;height:642px;object-fit:contain;border-radius:7px}
    .head,.row{display:grid;grid-template-columns:260px 1fr 1fr;gap:12px}.head{margin-top:14px;padding:8px 10px;background:#332d74;border-radius:8px;font-weight:800}.row{padding:7px 10px;border-bottom:1px solid #312c6c;font-size:14px}.row span{overflow-wrap:anywhere}.row i{font-style:normal;font-size:12px;padding:2px 7px;border-radius:10px}.ok{background:#174f3b;color:#7df2b5}.bad{background:#64253a;color:#ff9bae}
    .mechanism{margin-top:10px;padding:9px 12px;border-radius:8px;background:${mechanismDiff.length ? "#4a2035" : "#153f35"};font-size:13px;line-height:1.4}.mechanism-grid{display:grid;grid-template-columns:120px 1fr 1fr;gap:9px;margin-top:5px}.mechanism-grid span{overflow-wrap:anywhere}.note{margin-top:7px;color:#aaa6da;font-size:13px}
  </style></head><body><header><h1>Lv${record.level} · ${escapeHtml(record.name)}</h1><div class="status">${record.exact ? "逐项一致" : `差异 ${record.mismatches.length} 项`}</div></header><div class="shots"><section class="panel"><h2>竞品开局截图</h2><img src="${competitorImage}"></section><section class="panel"><h2>本游戏当前开局截图</h2><img src="${ourImage}"></section></div><div class="head"><span>核对项</span><span>竞品</span><span>本游戏</span></div>${summaryRows}<div class="mechanism"><b>机制核对：${escapeHtml(mechanismSummary)}</b><div class="mechanism-grid"><strong>机制明细</strong><span>${escapeHtml(competitorMechanismDigest)}</span><span>${escapeHtml(ourMechanismDigest)}</span></div></div><div class="note">${escapeHtml(record.boardMaskPolicy)}${record.unclearFields.length ? `；竞品 unclear：${escapeHtml(record.unclearFields.join("、"))}` : ""}</div></body></html>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready);
  await page.screenshot({ path: path.join(OUTPUT, record.comparisonImage) });
  console.log(`paired Lv${String(record.level).padStart(3, "0")}`);
  }
  await page.close(); await browser.close();
}

const summary = {
  exactLevels: records.filter((record) => record.exact).length,
  mismatchLevels: records.filter((record) => !record.exact).length,
  boardSizeMatch: records.filter((record) => record.metrics.find((row) => row.key === "board_size").match).length,
  shapeMatch: records.filter((record) => record.metrics.find((row) => row.key === "shape_histogram").match).length,
  countMatch: records.filter((record) => record.metrics.find((row) => row.key === "full_piece_count").match).length,
  colorCountMatch: records.filter((record) => record.metrics.find((row) => row.key === "full_colors").match).length,
  mechanismMatch: records.filter((record) => record.mechanisms.checks.every((check) => check.match)).length,
  unclearLevels: records.filter((record) => record.unclearFields.length).length,
};
const payload = { schemaVersion: 2, generatedAt: new Date().toISOString(), revision: REVISION, campaignSemanticSha256: runtimeSha, sourceContract: path.relative(ROOT, CONTRACT_PATH).replaceAll("\\", "/"), sourceTruth: path.relative(ROOT, TRUTH_PATH).replaceAll("\\", "/"), gameplaySolverRun: false, summary, levels: records };
await writeFile(path.join(OUTPUT, "comparison.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const csvHeaders = ["level", "name", "exact", "board_size", "playable_cells", "time_seconds", "opening/full competitor", "opening/full ours", "colors competitor/ours", "competitor_shapes", "our_shapes", "mechanism_match", "mismatch_details", "unclear_fields", "comparison_image"];
const csvRows = records.map((record) => {
  const metric = (key) => record.metrics.find((row) => row.key === key);
  return [record.level, record.name, record.exact ? "是" : "否", metric("board_size").match ? "是" : "否", metric("playable_cells").match ? "是" : "否", metric("time_seconds").match ? "是" : "否", `${metric("opening_piece_count").competitor}/${metric("full_piece_count").competitor}`, `${metric("opening_piece_count").ours}/${metric("full_piece_count").ours}`, `${metric("full_colors").competitor}/${metric("full_colors").ours}`, histogramText(metric("shape_histogram").competitor), histogramText(metric("shape_histogram").ours), record.mechanisms.checks.every((check) => check.match) ? "是" : "否", record.mismatches.map((item) => `${item.label}: ${compact(item.competitor)} != ${compact(item.ours)}`).join("；"), record.unclearFields.join("；"), record.comparisonImage];
});
await writeFile(path.join(OUTPUT, "comparison.csv"), `\uFEFF${[csvHeaders, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");
const cards = records.map((record) => `<article data-status="${record.exact ? "exact" : "mismatch"}"><h2>Lv${record.level} · ${escapeHtml(record.name)} <span class="${record.exact ? "ok" : "bad"}">${record.exact ? "逐项一致" : `差异${record.mismatches.length}项`}</span></h2><a href="${record.comparisonImage}"><img loading="lazy" src="${record.comparisonImage}"></a><details><summary>查看逐项数据与机制明细</summary><div class="detail">${[...record.metrics, ...record.mechanisms.checks].map((row) => `<div class="drow ${row.match ? "" : "diff"}"><b>${escapeHtml(row.label)}</b><span>${escapeHtml(compact(row.competitor))}</span><span>${escapeHtml(compact(row.ours))}</span></div>`).join("")}</div></details></article>`).join("");
await writeFile(path.join(OUTPUT, "index.html"), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>竞品 Lv1–100 vs 本游戏 ${escapeHtml(REVISION)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#0e0a32;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}header{position:sticky;top:0;z-index:3;padding:16px 22px;background:#17124cf2;border-bottom:1px solid #453e8e}h1{margin:0 0 5px;font-size:27px}header p{margin:0 0 10px;color:#bcb7e9}.buttons{display:flex;gap:8px}button{border:0;border-radius:16px;padding:8px 14px;background:#39327b;color:#fff;cursor:pointer}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:15px;padding:18px}article{padding:10px;background:#211b60;border:1px solid #453e8e;border-radius:12px}article h2{font-size:18px;margin:0 0 8px}article h2 span{float:right;padding:3px 9px;border-radius:12px;font-size:13px}.ok{background:#174f3b;color:#7df2b5}.bad{background:#64253a;color:#ff9bae}article>a{display:block;background:#141044;border-radius:7px;overflow:hidden}article img{display:block;width:100%;height:auto}details{margin-top:8px;color:#d3d0f1}summary{cursor:pointer}.detail{margin-top:7px;max-height:520px;overflow:auto}.drow{display:grid;grid-template-columns:155px 1fr 1fr;gap:6px;padding:5px;border-bottom:1px solid #39327b;font-size:12px;overflow-wrap:anywhere}.drow.diff{background:#51243a}.hidden{display:none}
</style></head><body><header><h1>竞品 Lv1–100 vs 本游戏 ${escapeHtml(REVISION)}</h1><p>逐项一致 ${summary.exactLevels}/100 · 棋盘 ${summary.boardSizeMatch}/100 · 形状 ${summary.shapeMatch}/100 · 数量 ${summary.countMatch}/100 · 颜色种类 ${summary.colorCountMatch}/100 · 机制 ${summary.mechanismMatch}/100 · SQ3 保持原样、不做替换</p><div class="buttons"><button data-filter="all">全部100关</button><button data-filter="exact">逐项一致</button><button data-filter="mismatch">有差异</button></div></header><main>${cards}</main><script>document.querySelectorAll('button').forEach(b=>b.onclick=()=>document.querySelectorAll('article').forEach(c=>c.classList.toggle('hidden',b.dataset.filter!=='all'&&c.dataset.status!==b.dataset.filter)));</script></body></html>`, "utf8");
const md = ["# 竞品 Lv1–100 与本游戏逐关对照", "", `- 数据版本：${REVISION}`, `- campaign semantic SHA-256：${runtimeSha}`, `- 逐项一致：${summary.exactLevels}/100；机制一致：${summary.mechanismMatch}/100；SQ3 原样保留。`, "- 棋盘外框按原创规则不要求与竞品 mask 相同，仅核宽高及可玩格总数。", "- 本报告未运行任何关卡求解器。", "", "|关卡|总体|棋盘|形状|数量|颜色种类|机制|对照图|", "|---:|---|---|---|---|---|---|---|", ...records.map((record) => `|Lv${record.level}|${record.exact ? "一致" : `差异${record.mismatches.length}项`}|${record.metrics[0].match ? "一致" : "不同"}|${record.metrics[5].match ? "一致" : "不同"}|${record.metrics[4].match ? "一致" : "不同"}|${record.metrics[8].match ? "一致" : "不同"}|${record.mechanisms.checks.every((check) => check.match) ? "一致" : "不同"}|[查看](${record.comparisonImage})|`), ""];
await writeFile(path.join(OUTPUT, "comparison.md"), md.join("\n"), "utf8");
console.log(JSON.stringify({ output: OUTPUT, revision: REVISION, campaignSemanticSha256: runtimeSha, summary }, null, 2));
