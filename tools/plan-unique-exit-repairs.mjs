import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const root = process.cwd();
const outputDirectory = resolve(root, "playtest-results/experiments/unique-exit-repair");
const outputPath = resolve(outputDirectory, "repair-plan.json");
const summaryPath = resolve(outputDirectory, "README.md");
const openingClusterAuditPath = resolve(outputDirectory, "opening-same-color-cluster-audit.json");
const preRepairAuditPath = resolve(root, "playtest-results/exit-color-uniqueness-pre-repair.json");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const sha256File = async (path) => sha256(await readFile(path));

const bundle = await build({
  stdin: {
    contents: `export { LEVELS } from "./src/core/levels.ts";`,
    resolveDir: root,
    sourcefile: "unique-exit-repair-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const source = bundle.outputFiles[0].text;
const runtime = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const levels = runtime.LEVELS;

const blockLayers = (block) => block.layers ? [...block.layers] : [block.color];

const shapeBounds = (block) => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

const exitRecord = (exit, kind, index) => ({
  index,
  kind,
  id: exit.id,
  side: exit.side,
  offset: exit.offset,
  size: exit.size,
  color: exit.color,
  ...(exit.frozen === undefined ? {} : { frozen: exit.frozen }),
  ...(exit.star === undefined ? {} : { star: exit.star }),
  ...(kind === "flipDoor" ? { initiallyOpen: exit.initiallyOpen } : {}),
});

const exitsFor = (level) => [
  ...level.gates.map((exit, index) => exitRecord(exit, "gate", index)),
  ...(level.flipDoors ?? []).map((exit, index) => exitRecord(exit, "flipDoor", index)),
];

const dynamicallyRelocatedBlockIdsFor = (level) => new Set([
  ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
  ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
  ...(level.elevators ?? []).map((elevator) => elevator.blockId),
]);

/**
 * This is intentionally kept equivalent to levelSolver.staticUnsatReasonsFor:
 * it is a necessary compatibility check, not a spatial solvability proof.
 */
const exitGeometryCompatible = (block, exit, dynamicallyRelocatedBlockIds) => {
  if (block.star && !exit.star) return false;
  if (block.movementAxis === "horizontal" && exit.side !== "left" && exit.side !== "right") return false;
  if (block.movementAxis === "vertical" && exit.side !== "top" && exit.side !== "bottom") return false;
  const bounds = shapeBounds(block);
  if (exit.side === "top" || exit.side === "bottom") {
    if (exit.size < bounds.width) return false;
    if (block.movementAxis !== "vertical" || dynamicallyRelocatedBlockIds.has(block.id)) return true;
    const minX = block.x + bounds.minX;
    const maxX = block.x + bounds.maxX;
    return minX >= exit.offset && maxX < exit.offset + exit.size;
  }
  if (exit.size < bounds.height) return false;
  if (block.movementAxis !== "horizontal" || dynamicallyRelocatedBlockIds.has(block.id)) return true;
  const minY = block.y + bounds.minY;
  const maxY = block.y + bounds.maxY;
  return minY >= exit.offset && maxY < exit.offset + exit.size;
};

const requirementsFor = (level, exits) => {
  const dynamicallyRelocatedBlockIds = dynamicallyRelocatedBlockIdsFor(level);
  const byColor = new Map();
  for (const block of level.blocks) {
    blockLayers(block).forEach((color, layerIndex) => {
      const compatibleExitIndexes = exits
        .filter((exit) => exitGeometryCompatible(block, exit, dynamicallyRelocatedBlockIds))
        .map((exit) => exit.globalIndex);
      const requirement = {
        block_id: block.id,
        layer_index: layerIndex,
        color,
        star_required: Boolean(block.star),
        movement_axis: block.movementAxis ?? null,
        shape_bounds: shapeBounds(block),
        fixed_perpendicular_range: dynamicallyRelocatedBlockIds.has(block.id)
          ? null
          : block.movementAxis === "horizontal"
            ? [block.y + shapeBounds(block).minY, block.y + shapeBounds(block).maxY]
            : block.movementAxis === "vertical"
              ? [block.x + shapeBounds(block).minX, block.x + shapeBounds(block).maxX]
              : null,
        compatible_exit_indexes: compatibleExitIndexes,
      };
      const list = byColor.get(color) ?? [];
      list.push(requirement);
      byColor.set(color, list);
    });
  }
  return byColor;
};

const intersection = (sets) => {
  if (!sets.length) return [];
  const [first, ...rest] = sets;
  return first.filter((value) => rest.every((set) => set.includes(value)));
};

const recolorPlanFor = (level, rawExits) => {
  const exits = rawExits.map((exit, globalIndex) => ({ ...exit, globalIndex }));
  const requirements = requirementsFor(level, exits);
  const allowedExitIndexesByColor = new Map(
    [...requirements.entries()].map(([color, entries]) => [
      color,
      intersection(entries.map((entry) => entry.compatible_exit_indexes)),
    ]),
  );
  const requiredColors = [...requirements.keys()];
  const impossibleReasons = [];
  if (requiredColors.length > exits.length) {
    impossibleReasons.push({
      code: "more-required-colors-than-exits",
      required_color_count: requiredColors.length,
      exit_count: exits.length,
    });
  }
  for (const [color, allowed] of allowedExitIndexesByColor) {
    if (allowed.length) continue;
    impossibleReasons.push({
      code: "no-single-exit-covers-all-blocks-of-color",
      color,
      requirements: requirements.get(color),
    });
  }

  let best = null;
  const assignment = Array(exits.length).fill(null);
  const usedColors = new Set();
  const requiredColorSet = new Set(requiredColors);

  const assignmentValid = () => {
    for (const color of requiredColors) {
      const exitIndex = assignment.indexOf(color);
      if (exitIndex < 0 || !allowedExitIndexesByColor.get(color).includes(exitIndex)) return false;
    }
    return true;
  };

  const search = (exitIndex, changedCount) => {
    if (best && changedCount > best.changedCount) return;
    if (exitIndex === exits.length) {
      if (!assignmentValid()) return;
      const signature = assignment.join(",");
      if (!best || changedCount < best.changedCount || (changedCount === best.changedCount && signature < best.signature)) {
        best = { changedCount, colors: [...assignment], signature };
      }
      return;
    }
    for (const color of COLORS) {
      if (usedColors.has(color)) continue;
      // If this is the last remaining slot for an unassigned required colour,
      // assigning an optional colour cannot possibly complete the plan.
      const remainingSlotsAfter = exits.length - exitIndex - 1;
      const unassignedRequiredAfter = requiredColors.filter((required) => (
        required !== color && !usedColors.has(required)
      )).length;
      if (unassignedRequiredAfter > remainingSlotsAfter) continue;
      // A required colour may only be placed on an exit that works for every
      // block/layer of that colour. Optional colours have no such constraint.
      if (requiredColorSet.has(color) && !allowedExitIndexesByColor.get(color).includes(exitIndex)) continue;
      assignment[exitIndex] = color;
      usedColors.add(color);
      search(exitIndex + 1, changedCount + Number(color !== exits[exitIndex].color));
      usedColors.delete(color);
      assignment[exitIndex] = null;
    }
  };

  if (!impossibleReasons.length) search(0, 0);
  if (!best && !impossibleReasons.length) {
    impossibleReasons.push({
      code: "required-color-exit-matching-conflict",
      allowed_exit_indexes_by_color: Object.fromEntries(allowedExitIndexesByColor),
    });
  }

  const requirementSummary = Object.fromEntries([...requirements.entries()].map(([color, entries]) => [
    color,
    {
      requirement_count: entries.length,
      common_compatible_exit_indexes: allowedExitIndexesByColor.get(color),
      requirements: entries,
    },
  ]));

  if (!best) {
    return {
      feasible: false,
      required_colors: requiredColors,
      requirements_by_color: requirementSummary,
      impossible_reasons: impossibleReasons,
    };
  }

  const changes = exits.flatMap((exit, index) => best.colors[index] === exit.color ? [] : [{
    kind: exit.kind,
    id: exit.id,
    index: exit.index,
    global_index: index,
    from: exit.color,
    to: best.colors[index],
  }]);
  return {
    feasible: true,
    changed_exit_count: best.changedCount,
    changes,
    proposed_colors_in_exit_order: best.colors,
    required_colors: requiredColors,
    requirements_by_color: requirementSummary,
  };
};

const mechanismSignature = (exit) => JSON.stringify({
  kind: exit.kind,
  side: exit.side,
  color: exit.color,
  frozen: exit.frozen ?? 0,
  star: Boolean(exit.star),
  initiallyOpen: exit.kind === "flipDoor" ? Boolean(exit.initiallyOpen) : null,
});

const connectedSpanGroups = (entries) => {
  const sorted = [...entries].sort((left, right) => left.offset - right.offset || left.size - right.size || left.id.localeCompare(right.id));
  const groups = [];
  let group = [];
  let end = Number.NEGATIVE_INFINITY;
  for (const exit of sorted) {
    if (!group.length || exit.offset <= end) {
      group.push(exit);
      end = Math.max(end, exit.offset + exit.size);
      continue;
    }
    groups.push(group);
    group = [exit];
    end = exit.offset + exit.size;
  }
  if (group.length) groups.push(group);
  return groups;
};

const mergeSuggestionsFor = (level, exits) => {
  const bySignature = new Map();
  for (const exit of exits) {
    const signature = mechanismSignature(exit);
    const entries = bySignature.get(signature) ?? [];
    entries.push(exit);
    bySignature.set(signature, entries);
  }

  const safeMergeGroups = [];
  const nonContiguousSameSignatureGroups = [];
  for (const [signature, entries] of bySignature) {
    if (entries.length < 2) continue;
    const connected = connectedSpanGroups(entries);
    for (const group of connected.filter((candidate) => candidate.length > 1)) {
      const minOffset = Math.min(...group.map((exit) => exit.offset));
      const maxEnd = Math.max(...group.map((exit) => exit.offset + exit.size));
      safeMergeGroups.push({
        signature: JSON.parse(signature),
        member_ids: group.map((exit) => exit.id),
        member_global_indexes: group.map((exit) => exit.globalIndex),
        member_spans: group.map((exit) => [exit.offset, exit.offset + exit.size]),
        proposed_span: { offset: minOffset, size: maxEnd - minOffset },
        reduction: group.length - 1,
        rationale: "Same kind/side/color/counter/star/open state and overlapping-or-adjacent rim spans.",
      });
    }
    if (connected.length > 1) {
      nonContiguousSameSignatureGroups.push({
        signature: JSON.parse(signature),
        member_ids: entries.map((exit) => exit.id),
        connected_components: connected.map((group) => group.map((exit) => exit.id)),
        rationale: "Same mechanism signature but separated by a rim gap; requires source-frame review before rebuilding.",
      });
    }
  }

  const safeReduction = safeMergeGroups.reduce((sum, group) => sum + group.reduction, 0);
  const afterSafeMergeCount = exits.length - safeReduction;
  const duplicateColors = COLORS.flatMap((color) => {
    const matching = exits.filter((exit) => exit.color === color);
    return matching.length > 1 ? [{
      color,
      exit_ids: matching.map((exit) => exit.id),
      signatures: [...new Set(matching.map(mechanismSignature))].map((value) => JSON.parse(value)),
    }] : [];
  });

  return {
    status: "manual-merge-or-rebuild-required",
    exit_count: exits.length,
    minimum_reduction_to_color_capacity: exits.length - COLORS.length,
    safe_merge_groups: safeMergeGroups,
    safe_merge_reduction: safeReduction,
    exit_count_after_safe_merges: afterSafeMergeCount,
    safe_merges_reach_color_capacity: afterSafeMergeCount <= COLORS.length,
    non_contiguous_same_signature_groups: nonContiguousSameSignatureGroups,
    duplicate_colors: duplicateColors,
    next_action: afterSafeMergeCount <= COLORS.length
      ? "Review each proposed contiguous merge against the source opening frame, then run the <=8 recolor planner on the rebuilt exits."
      : "Source-frame reconstruction is mandatory: safe contiguous merges alone still leave more than eight logical exits.",
    risk: "This report never mutates or certifies a merge. Counter values, star flags, flip-door state, and rim gaps must not be combined without source evidence.",
  };
};

const openingSameColorClusterAuditFor = (level) => {
  const queuedByBlockId = new Map();
  for (const generator of level.generators ?? []) {
    generator.queueBlockIds.forEach((blockId, queueIndex) => {
      queuedByBlockId.set(blockId, {
        generator_id: generator.id,
        queue_index: queueIndex,
      });
    });
  }
  const shutterById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  const nonOpeningBlocks = [];
  const openingBlocks = [];

  for (const block of level.blocks) {
    const queued = queuedByBlockId.get(block.id);
    if (queued) {
      nonOpeningBlocks.push({
        block_id: block.id,
        hidden_class: "generator-queue",
        generator_id: queued.generator_id,
        queue_index: queued.queue_index,
        visible_outer_color_when_released: blockLayers(block)[0],
      });
      continue;
    }
    const shutter = block.shutterId ? shutterById.get(block.shutterId) : undefined;
    if (shutter && shutter.count > 0) {
      nonOpeningBlocks.push({
        block_id: block.id,
        hidden_class: "shutter-staged",
        shutter_id: shutter.id,
        shutter_skin: shutter.skin ?? "shutter",
        opening_counter: shutter.count,
        visible_outer_color_when_released: blockLayers(block)[0],
      });
      continue;
    }
    openingBlocks.push({
      block_id: block.id,
      outer_visible_color: blockLayers(block)[0],
      origin: [block.x, block.y],
      cells: block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]),
    });
  }

  const contactEdges = [];
  for (let leftIndex = 0; leftIndex < openingBlocks.length; leftIndex += 1) {
    const left = openingBlocks[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < openingBlocks.length; rightIndex += 1) {
      const right = openingBlocks[rightIndex];
      if (left.outer_visible_color !== right.outer_visible_color) continue;
      const cellPairs = [];
      for (const leftCell of left.cells) {
        for (const rightCell of right.cells) {
          if (Math.abs(leftCell[0] - rightCell[0]) + Math.abs(leftCell[1] - rightCell[1]) !== 1) continue;
          cellPairs.push({
            block_a_cell: leftCell,
            block_b_cell: rightCell,
          });
        }
      }
      if (!cellPairs.length) continue;
      contactEdges.push({
        color: left.outer_visible_color,
        block_a: left.block_id,
        block_b: right.block_id,
        cell_pairs: cellPairs,
        orthogonal_contact_edge_count: cellPairs.length,
      });
    }
  }

  const parent = new Map(openingBlocks.map((block) => [block.block_id, block.block_id]));
  const find = (blockId) => {
    let current = blockId;
    while (parent.get(current) !== current) current = parent.get(current);
    let path = blockId;
    while (parent.get(path) !== current) {
      const next = parent.get(path);
      parent.set(path, current);
      path = next;
    }
    return current;
  };
  const union = (leftId, rightId) => {
    const leftRoot = find(leftId);
    const rightRoot = find(rightId);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  for (const edge of contactEdges) union(edge.block_a, edge.block_b);

  const contactedIds = new Set(contactEdges.flatMap((edge) => [edge.block_a, edge.block_b]));
  const membersByRoot = new Map();
  for (const block of openingBlocks) {
    if (!contactedIds.has(block.block_id)) continue;
    const root = find(block.block_id);
    const members = membersByRoot.get(root) ?? [];
    members.push(block.block_id);
    membersByRoot.set(root, members);
  }

  const blockById = new Map(openingBlocks.map((block) => [block.block_id, block]));
  const allContactComponents = [...membersByRoot.values()]
    .map((memberIds) => {
      const memberSet = new Set(memberIds);
      const edges = contactEdges.filter((edge) => memberSet.has(edge.block_a) && memberSet.has(edge.block_b));
      return {
        color: blockById.get(memberIds[0]).outer_visible_color,
        block_count: memberIds.length,
        blocks: memberIds.map((blockId) => blockById.get(blockId)),
        contact_edges: edges,
        orthogonal_contact_edge_count: edges.reduce((sum, edge) => sum + edge.orthogonal_contact_edge_count, 0),
      };
    })
    .sort((left, right) => right.block_count - left.block_count
      || left.color.localeCompare(right.color)
      || left.blocks[0].block_id.localeCompare(right.blocks[0].block_id));

  const violatingComponents = allContactComponents
    .filter((component) => component.block_count >= 3)
    .map((component, index) => ({
      component_id: `lv${String(level.id).padStart(3, "0")}-${component.color}-${index + 1}`,
      ...component,
    }));

  return {
    level_id: level.id,
    opening_visible_block_count: openingBlocks.length,
    non_opening_block_count: nonOpeningBlocks.length,
    non_opening_blocks: nonOpeningBlocks,
    same_color_contact_component_count: allContactComponents.length,
    allowed_two_block_contact_components: allContactComponents.filter((component) => component.block_count === 2).length,
    violating_component_count: violatingComponents.length,
    violating_components: violatingComponents,
  };
};

const analyses = levels.map((level) => {
  const exits = exitsFor(level).map((exit, globalIndex) => ({ ...exit, globalIndex }));
  const duplicateColors = COLORS.filter((color) => exits.filter((exit) => exit.color === color).length > 1);
  if (!duplicateColors.length) {
    return {
      level_id: level.id,
      status: "already-unique",
      exit_count: exits.length,
      exits,
    };
  }
  if (exits.length > COLORS.length) {
    return {
      level_id: level.id,
      status: "manual-merge-or-rebuild-required",
      exits,
      ...mergeSuggestionsFor(level, exits),
    };
  }
  const plan = recolorPlanFor(level, exits);
  return {
    level_id: level.id,
    status: plan.feasible ? "auto-recolor-candidate" : "recolor-only-impossible",
    exit_count: exits.length,
    exits,
    recolor_plan: plan,
  };
});

const autoRecolorCandidates = analyses.filter((entry) => entry.status === "auto-recolor-candidate");
const recolorOnlyImpossible = analyses.filter((entry) => entry.status === "recolor-only-impossible");
const manualMerge = analyses.filter((entry) => entry.status === "manual-merge-or-rebuild-required");
const alreadyUnique = analyses.filter((entry) => entry.status === "already-unique");
const changedExitCount = autoRecolorCandidates.reduce((sum, entry) => sum + entry.recolor_plan.changed_exit_count, 0);
const currentDuplicateLevelIds = analyses
  .filter((entry) => entry.status !== "already-unique")
  .map((entry) => entry.level_id);
const safeMergeGroupCount = manualMerge.reduce((sum, entry) => sum + entry.safe_merge_groups.length, 0);
const safeMergesReachCapacityLevelIds = manualMerge
  .filter((entry) => entry.safe_merges_reach_color_capacity)
  .map((entry) => entry.level_id);
const openingClusterAnalyses = levels.map(openingSameColorClusterAuditFor);
const openingClusterViolations = openingClusterAnalyses.filter((entry) => entry.violating_component_count > 0);
const nonOpeningBlockLevels = openingClusterAnalyses.filter((entry) => entry.non_opening_block_count > 0);
const violatingComponents = openingClusterViolations.flatMap((entry) => entry.violating_components);
const allNonOpeningBlocks = nonOpeningBlockLevels.flatMap((entry) => entry.non_opening_blocks);
const openingClusterSummary = {
  total_levels: levels.length,
  passing_levels: levels.length - openingClusterViolations.length,
  violating_levels: openingClusterViolations.length,
  violating_level_ids: openingClusterViolations.map((entry) => entry.level_id),
  violating_component_count: violatingComponents.length,
  blocks_in_violating_components: violatingComponents.reduce((sum, component) => sum + component.block_count, 0),
  violating_block_contact_pair_count: violatingComponents.reduce((sum, component) => sum + component.contact_edges.length, 0),
  violating_cell_pair_count: violatingComponents.reduce((sum, component) => sum + component.orthogonal_contact_edge_count, 0),
  allowed_two_block_contact_component_count: openingClusterAnalyses.reduce(
    (sum, entry) => sum + entry.allowed_two_block_contact_components,
    0,
  ),
  non_opening_hidden_block_count: allNonOpeningBlocks.length,
  generator_queue_block_count: allNonOpeningBlocks.filter((block) => block.hidden_class === "generator-queue").length,
  shutter_staged_block_count: allNonOpeningBlocks.filter((block) => block.hidden_class === "shutter-staged").length,
  levels_with_non_opening_hidden_blocks: nonOpeningBlockLevels.length,
};

let preRepairAudit = null;
try {
  preRepairAudit = JSON.parse(await readFile(preRepairAuditPath, "utf8"));
} catch {
  // The tool remains usable when the preliminary audit has not been generated.
}

const levelSourcePaths = [
  "src/core/levels.ts",
  "src/core/videoParityLevels.generated.ts",
  "src/core/videoParityLevels101To200.generated.ts",
];
const generatedAt = new Date().toISOString();
const levelSourceSha256 = Object.fromEntries(await Promise.all(levelSourcePaths.map(async (path) => [
  path,
  await sha256File(resolve(root, path)),
])));
const openingClusterAudit = {
  generated_at: generatedAt,
  mode: "read-only opening-layout audit; no level source is modified",
  rule: "Different opening-visible blocks are graph nodes. Orthogonal cell-edge contact creates an edge only when their outer visible colors match. Same-color connected components of one or two blocks are allowed; components of three or more blocks are cluster violations. Cells within one block never create an edge.",
  opening_visibility_contract: "Generator queue blocks and blocks hidden behind a positive shutter/staging counter are excluded from the opening graph and listed separately.",
  summary: openingClusterSummary,
  provenance: {
    level_source_sha256: levelSourceSha256,
  },
  violations: openingClusterViolations.map((entry) => ({
    level_id: entry.level_id,
    opening_visible_block_count: entry.opening_visible_block_count,
    violating_component_count: entry.violating_component_count,
    violating_components: entry.violating_components,
  })),
  non_opening_hidden_blocks_by_level: nonOpeningBlockLevels.map((entry) => ({
    level_id: entry.level_id,
    non_opening_block_count: entry.non_opening_block_count,
    blocks: entry.non_opening_blocks,
  })),
};
const report = {
  generated_at: generatedAt,
  mode: "read-only experimental repair planning; no level source is modified",
  rule: "Gate and flip-door colors are jointly unique inside each level.",
  compatibility_contract: "Every authored block layer retains at least one exit compatible by color, star requirement, movement axis, aperture span, and fixed perpendicular offset. This is necessary-only and is not a solver certificate.",
  colors: COLORS,
  summary: {
    total_levels: analyses.length,
    already_unique_levels: alreadyUnique.length,
    duplicate_color_levels: analyses.length - alreadyUnique.length,
    auto_recolor_candidate_levels: autoRecolorCandidates.length,
    recolor_only_impossible_levels: recolorOnlyImpossible.length,
    manual_merge_or_rebuild_levels: manualMerge.length,
    safe_contiguous_merge_group_count: safeMergeGroupCount,
    safe_merges_reach_eight_exit_capacity_level_ids: safeMergesReachCapacityLevelIds,
    proposed_recolored_exit_count: changedExitCount,
    auto_recolor_candidate_level_ids: autoRecolorCandidates.map((entry) => entry.level_id),
    recolor_only_impossible_level_ids: recolorOnlyImpossible.map((entry) => entry.level_id),
    manual_merge_or_rebuild_level_ids: manualMerge.map((entry) => entry.level_id),
  },
  provenance: {
    level_source_sha256: levelSourceSha256,
    pre_repair_audit: preRepairAudit ? {
      path: "playtest-results/exit-color-uniqueness-pre-repair.json",
      sha256: await sha256File(preRepairAuditPath),
      reported_summary: preRepairAudit.summary,
      comparison_to_current_snapshot: {
        exact_failure_set_match: JSON.stringify(preRepairAudit.summary.failing_level_ids) === JSON.stringify(currentDuplicateLevelIds),
        no_longer_failing_level_ids: preRepairAudit.summary.failing_level_ids.filter((id) => !currentDuplicateLevelIds.includes(id)),
        newly_failing_level_ids: currentDuplicateLevelIds.filter((id) => !preRepairAudit.summary.failing_level_ids.includes(id)),
      },
    } : null,
  },
  auto_recolor_candidates: autoRecolorCandidates,
  recolor_only_impossible: recolorOnlyImpossible,
  manual_merge_or_rebuild: manualMerge,
  already_unique: alreadyUnique.map(({ level_id, exit_count }) => ({ level_id, exit_count })),
  opening_same_color_cluster_audit: {
    report_path: "playtest-results/experiments/unique-exit-repair/opening-same-color-cluster-audit.json",
    summary: openingClusterSummary,
  },
};

const markdown = `# Unique exit-colour repair plan\n\n`
  + `Generated: ${report.generated_at}\n\n`
  + `This is a read-only experimental plan. It does not modify formal level data and does not prove solvability.\n\n`
  + `- Levels audited: ${report.summary.total_levels}\n`
  + `- Already unique: ${report.summary.already_unique_levels}\n`
  + `- Duplicate-colour levels: ${report.summary.duplicate_color_levels}\n`
  + `- <=8 exits with a minimum-change recolour candidate: ${report.summary.auto_recolor_candidate_levels}\n`
  + `- <=8 exits where recolouring alone cannot retain every static compatibility contract: ${report.summary.recolor_only_impossible_levels}\n`
  + `- >8 exits requiring source-reviewed merge/rebuild: ${report.summary.manual_merge_or_rebuild_levels}\n`
  + `- Auditable same-signature contiguous merge groups: ${report.summary.safe_contiguous_merge_group_count}\n`
  + `- >8-exit levels reduced to <=8 by those safe groups alone: ${report.summary.safe_merges_reach_eight_exit_capacity_level_ids.length}\n`
  + `- Exit colour changes proposed by the minimum-change candidates: ${report.summary.proposed_recolored_exit_count}\n\n`
  + `## Opening same-colour cluster audit\n\n`
  + `Two touching blocks of the same outer colour are allowed. A connected touching group of three or more different blocks is flagged.\n\n`
  + `- Violating levels: ${openingClusterSummary.violating_levels}\n`
  + `- Violating connected components: ${openingClusterSummary.violating_component_count}\n`
  + `- Violating block-contact pairs: ${openingClusterSummary.violating_block_contact_pair_count}\n`
  + `- Violating cell-edge pairs: ${openingClusterSummary.violating_cell_pair_count}\n`
  + `- Generator queue blocks excluded from opening: ${openingClusterSummary.generator_queue_block_count}\n`
  + `- Shutter/staging-hidden blocks excluded from opening: ${openingClusterSummary.shutter_staged_block_count}\n\n`
  + `## Safety boundary\n\n`
  + `Candidate recolours preserve the level solver's necessary colour/star/axis/aperture/fixed-offset compatibility contract. Every candidate still requires full solver and PuzzleModel replay. Merge groups are suggestions only; they must be checked against the competitor opening frame before any formal edit.\n`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(openingClusterAuditPath, `${JSON.stringify(openingClusterAudit, null, 2)}\n`, "utf8");
await writeFile(summaryPath, markdown, "utf8");
process.stdout.write(`${JSON.stringify({ exit_color_summary: report.summary, opening_cluster_summary: openingClusterSummary }, null, 2)}\n${outputPath}\n${openingClusterAuditPath}\n`);
