import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const root = process.cwd();
const numberArgument = (name, fallback) => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Invalid ${name}: ${raw}`);
  return parsed;
};
const fromLevel = numberArgument("from", 101);
const toLevel = numberArgument("to", 150);
if (fromLevel > toLevel) throw new Error(`Invalid range: ${fromLevel}-${toLevel}`);
const outputDirectoryArgument = process.argv.find((argument) => argument.startsWith("--output-directory="))
  ?.slice("--output-directory=".length);
const outputDirectory = resolve(root, outputDirectoryArgument ?? "playtest-results/experiments/joint-color-constraints");
const outputStem = `lv${fromLevel}-${toLevel}`;
const jsonPath = resolve(outputDirectory, `${outputStem}.json`);
const markdownPath = resolve(outputDirectory, `${outputStem}.md`);
const maxSearchNodesPerLevel = numberArgument("max-nodes", 750_000);
const maxSolutionsPerSubset = numberArgument("solutions-per-subset", 32);
const candidateLimit = numberArgument("candidate-limit", 1);

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const sha256File = async (path) => sha256(await readFile(path));

const bundle = await build({
  stdin: {
    contents: `export { LEVELS } from "./src/core/levels.ts";`,
    resolveDir: root,
    sourcefile: "joint-color-constraints-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const bundledSource = bundle.outputFiles[0].text;
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundledSource).toString("base64")}`);
const levels = runtime.LEVELS.filter((level) => level.id >= fromLevel && level.id <= toLevel);

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

const exitsFor = (level) => [
  ...level.gates.map((exit, index) => ({ ...exit, kind: "gate", kindIndex: index })),
  ...(level.flipDoors ?? []).map((exit, index) => ({ ...exit, kind: "flipDoor", kindIndex: index })),
].map((exit, slot) => ({ ...exit, slot }));

const dynamicallyRelocatedBlockIdsFor = (level) => new Set([
  ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
  ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
  ...(level.elevators ?? []).map((elevator) => elevator.blockId),
]);

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

const exitGeometryRejections = (block, exit, dynamicallyRelocatedBlockIds) => {
  const reasons = [];
  if (block.star && !exit.star) reasons.push("star-gate-required");
  if (block.movementAxis === "horizontal" && exit.side !== "left" && exit.side !== "right") {
    reasons.push("horizontal-axis-requires-left-or-right");
  }
  if (block.movementAxis === "vertical" && exit.side !== "top" && exit.side !== "bottom") {
    reasons.push("vertical-axis-requires-top-or-bottom");
  }
  const bounds = shapeBounds(block);
  const span = exit.side === "top" || exit.side === "bottom" ? bounds.width : bounds.height;
  if (exit.size < span) reasons.push(`aperture-too-small:${exit.size}<${span}`);
  if (!dynamicallyRelocatedBlockIds.has(block.id)) {
    if ((exit.side === "top" || exit.side === "bottom") && block.movementAxis === "vertical") {
      const min = block.x + bounds.minX;
      const max = block.x + bounds.maxX;
      if (min < exit.offset || max >= exit.offset + exit.size) {
        reasons.push(`fixed-horizontal-range-miss:[${min},${max}] not in [${exit.offset},${exit.offset + exit.size - 1}]`);
      }
    }
    if ((exit.side === "left" || exit.side === "right") && block.movementAxis === "horizontal") {
      const min = block.y + bounds.minY;
      const max = block.y + bounds.maxY;
      if (min < exit.offset || max >= exit.offset + exit.size) {
        reasons.push(`fixed-vertical-range-miss:[${min},${max}] not in [${exit.offset},${exit.offset + exit.size - 1}]`);
      }
    }
  }
  return reasons;
};

const openingVisibilityFor = (level) => {
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutterById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  const hidden = [];
  const visible = new Set();
  for (const block of level.blocks) {
    if (queuedIds.has(block.id)) {
      hidden.push({ block_id: block.id, hidden_class: "generator-queue" });
      continue;
    }
    const shutter = block.shutterId ? shutterById.get(block.shutterId) : undefined;
    if (shutter && shutter.count > 0) {
      hidden.push({
        block_id: block.id,
        hidden_class: "shutter-staged",
        shutter_id: shutter.id,
        shutter_skin: shutter.skin ?? "shutter",
        opening_counter: shutter.count,
      });
      continue;
    }
    visible.add(block.id);
  }
  return { visible, hidden };
};

const physicalOpeningContacts = (level, visibleBlockIds) => {
  const visibleBlocks = level.blocks.filter((block) => visibleBlockIds.has(block.id));
  const contacts = [];
  const neighbors = new Map(visibleBlocks.map((block) => [block.id, new Set()]));
  for (let leftIndex = 0; leftIndex < visibleBlocks.length; leftIndex += 1) {
    const left = visibleBlocks[leftIndex];
    const leftCells = left.shape.map(([dx, dy]) => [left.x + dx, left.y + dy]);
    for (let rightIndex = leftIndex + 1; rightIndex < visibleBlocks.length; rightIndex += 1) {
      const right = visibleBlocks[rightIndex];
      const rightCells = right.shape.map(([dx, dy]) => [right.x + dx, right.y + dy]);
      const cellPairs = [];
      for (const leftCell of leftCells) {
        for (const rightCell of rightCells) {
          if (Math.abs(leftCell[0] - rightCell[0]) + Math.abs(leftCell[1] - rightCell[1]) !== 1) continue;
          cellPairs.push({ block_a_cell: leftCell, block_b_cell: rightCell });
        }
      }
      if (!cellPairs.length) continue;
      neighbors.get(left.id).add(right.id);
      neighbors.get(right.id).add(left.id);
      contacts.push({
        block_a: left.id,
        block_b: right.id,
        cell_pairs: cellPairs,
      });
    }
  }
  return { contacts, neighbors };
};

const combinations = (values, size) => {
  const result = [];
  const current = [];
  const visit = (start) => {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let index = start; index <= values.length - (size - current.length); index += 1) {
      current.push(values[index]);
      visit(index + 1);
      current.pop();
    }
  };
  visit(0);
  return result;
};

const assignFreeVariablesWithCapacities = (
  freeVariables,
  domainByVariable,
  selectedSlots,
  initialCounts,
  capacityBySlot,
  initialSlotByVariable,
  variableByIndex,
) => {
  const selectedSet = new Set(selectedSlots);
  const counts = [...initialCounts];
  const assignment = new Map();
  const slotsByBlockId = new Map();
  for (const [variableIndex, slot] of initialSlotByVariable) {
    const variable = variableByIndex.get(variableIndex);
    const slots = slotsByBlockId.get(variable.blockId) ?? new Set();
    slots.add(slot);
    slotsByBlockId.set(variable.blockId, slots);
  }
  const ordered = [...freeVariables].sort((left, right) => {
    const leftDomain = domainByVariable.get(left.index).filter((slot) => selectedSet.has(slot));
    const rightDomain = domainByVariable.get(right.index).filter((slot) => selectedSet.has(slot));
    return leftDomain.length - rightDomain.length || left.index - right.index;
  });
  const visit = (variableIndex) => {
    if (variableIndex === ordered.length) {
      return selectedSlots.every((slot) => counts[slot] > 0);
    }
    const remaining = ordered.slice(variableIndex);
    for (const slot of selectedSlots) {
      if (counts[slot] > 0) continue;
      if (!remaining.some((variable) => (
        domainByVariable.get(variable.index).includes(slot) && counts[slot] < capacityBySlot[slot]
      ))) return false;
    }
    const remainingCapacity = selectedSlots.reduce((sum, slot) => sum + Math.max(0, capacityBySlot[slot] - counts[slot]), 0);
    if (remainingCapacity < remaining.length) return false;
    const variable = ordered[variableIndex];
    const blockSlots = slotsByBlockId.get(variable.blockId) ?? new Set();
    const domain = domainByVariable.get(variable.index)
      .filter((slot) => selectedSet.has(slot) && counts[slot] < capacityBySlot[slot] && !blockSlots.has(slot))
      .sort((left, right) => {
        const leftMissing = counts[left] === 0 ? 0 : 1;
        const rightMissing = counts[right] === 0 ? 0 : 1;
        return leftMissing - rightMissing || counts[left] - counts[right] || left - right;
      });
    for (const slot of domain) {
      assignment.set(variable.index, slot);
      counts[slot] += 1;
      blockSlots.add(slot);
      slotsByBlockId.set(variable.blockId, blockSlots);
      if (visit(variableIndex + 1)) return true;
      blockSlots.delete(slot);
      counts[slot] -= 1;
      assignment.delete(variable.index);
    }
    return false;
  };
  return visit(0) ? { assignment, counts } : null;
};

const frozenExitViabilityFor = (exits, variables, slotByVariable) => {
  const counts = exits.map(() => 0);
  for (const variable of variables) counts[slotByVariable.get(variable.index)] += 1;
  const totalLayers = variables.length;
  const violations = exits.flatMap((exit) => {
    if (counts[exit.slot] <= 0 || (exit.frozen ?? 0) <= totalLayers - counts[exit.slot]) return [];
    return [{
      exit_id: exit.id,
      slot: exit.slot,
      frozen: exit.frozen ?? 0,
      same_color_layer_count: counts[exit.slot],
      maximum_prior_other_clears: totalLayers - counts[exit.slot],
    }];
  });
  return {
    passed: violations.length === 0,
    total_layers: totalLayers,
    layer_count_by_exit_slot: counts,
    violations,
  };
};

const shutterHasPhysicalOpeningFootprint = (shutter) => (
  shutter.count > 0
  && shutter.skin !== "staging"
  && shutter.skin !== "lift"
  && shutter.skin !== "staged-frame"
);

const cellsAt = (block, x = block.x, y = block.y) => (
  block.shape.map(([dx, dy]) => [x + dx, y + dy])
);

/**
 * Conservative opening reachability proof used only as a necessary
 * condition. Other blocks and coloured-grid restrictions are deliberately
 * ignored, so a reported failure cannot be repaired by merely moving blocks
 * around: even an otherwise empty opening board has no route to an unfrozen,
 * open exit. Physical shutters and board voids are retained because neither
 * can change before the first clear.
 */
const openingReachableExitSlotsForBlock = (level, block, start, exits) => {
  if ((block.frozen ?? 0) > 0 || block.lockedBy) return [];
  const playable = new Set(level.playable.map(([x, y]) => `${x},${y}`));
  const shutterCells = new Set();
  for (const shutter of level.shutters ?? []) {
    if (!shutterHasPhysicalOpeningFootprint(shutter)) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) shutterCells.add(`${x},${y}`);
    }
  }
  const canPlace = (x, y) => cellsAt(block, x, y).every(([cellX, cellY]) => (
    cellX >= 0 && cellY >= 0 && cellX < level.width && cellY < level.height
    && playable.has(`${cellX},${cellY}`)
    && !shutterCells.has(`${cellX},${cellY}`)
  ));
  if (!canPlace(start[0], start[1])) return [];

  const directions = block.movementAxis === "horizontal"
    ? [[1, 0], [-1, 0]]
    : block.movementAxis === "vertical"
      ? [[0, 1], [0, -1]]
      : [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const queue = [[start[0], start[1]]];
  const reached = new Set([`${start[0]},${start[1]}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of directions) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = `${nextX},${nextY}`;
      if (reached.has(key) || !canPlace(nextX, nextY)) continue;
      reached.add(key);
      queue.push([nextX, nextY]);
    }
  }

  const reachableSlots = [];
  for (const exit of exits) {
    if ((exit.frozen ?? 0) > 0) continue;
    if (exit.kind === "flipDoor" && !exit.initiallyOpen) continue;
    if (block.star && !exit.star) continue;
    if (block.movementAxis === "horizontal" && exit.side !== "left" && exit.side !== "right") continue;
    if (block.movementAxis === "vertical" && exit.side !== "top" && exit.side !== "bottom") continue;
    let reachable = false;
    for (const key of reached) {
      const [x, y] = key.split(",").map(Number);
      const cells = cellsAt(block, x, y);
      const xs = cells.map(([cellX]) => cellX);
      const ys = cells.map(([, cellY]) => cellY);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const atEdge = exit.side === "top" ? minY === 0
        : exit.side === "bottom" ? maxY === level.height - 1
          : exit.side === "left" ? minX === 0
            : maxX === level.width - 1;
      if (!atEdge) continue;
      const withinAperture = exit.side === "top" || exit.side === "bottom"
        ? minX >= exit.offset && maxX < exit.offset + exit.size
        : minY >= exit.offset && maxY < exit.offset + exit.size;
      if (withinAperture) {
        reachable = true;
        break;
      }
    }
    if (reachable) reachableSlots.push(exit.slot);
  }
  return reachableSlots;
};

const openingClearabilityFor = (level, exits, visibility) => {
  const firstQueueSpawnByBlockId = new Map();
  for (const generator of level.generators ?? []) {
    const firstBlockId = generator.queueBlockIds[0];
    if (firstBlockId) firstQueueSpawnByBlockId.set(firstBlockId, generator.spawn);
  }
  const candidates = level.blocks.flatMap((block) => {
    const openingVisible = visibility.visible.has(block.id);
    const generatorSpawn = firstQueueSpawnByBlockId.get(block.id);
    if (!openingVisible && !generatorSpawn) return [];
    const start = generatorSpawn ?? [block.x, block.y];
    const reachableSlots = openingReachableExitSlotsForBlock(level, block, start, exits);
    return [{
      block_id: block.id,
      source: generatorSpawn ? "generator-head-overapproximation" : "opening-visible",
      start,
      reachable_unfrozen_open_exit_slots: reachableSlots,
      reachable_unfrozen_open_exit_ids: reachableSlots.map((slot) => exits[slot].id),
    }];
  });
  const possiblePairs = candidates.flatMap((candidate) => (
    candidate.reachable_unfrozen_open_exit_slots.map((slot) => ({
      block_id: candidate.block_id,
      source: candidate.source,
      exit_slot: slot,
      exit_id: exits[slot].id,
    }))
  ));
  return {
    passed: possiblePairs.length > 0,
    proof_scope: "necessary-only; ignores other blocks and coloured-grid restrictions, but retains board voids, movement axis, aperture, positive frozen counters, closed flip doors, locks, numeric ice and physical opening shutters",
    possible_first_clear_pairs: possiblePairs,
    candidate_blocks: candidates,
    exits: exits.map((exit) => ({
      id: exit.id,
      slot: exit.slot,
      kind: exit.kind,
      side: exit.side,
      offset: exit.offset,
      size: exit.size,
      frozen: exit.frozen ?? 0,
      initially_open: exit.kind === "flipDoor" ? Boolean(exit.initiallyOpen) : true,
    })),
    physical_opening_shutters: (level.shutters ?? [])
      .filter(shutterHasPhysicalOpeningFootprint)
      .map((shutter) => ({
        id: shutter.id,
        x: shutter.x,
        y: shutter.y,
        width: shutter.width,
        height: shutter.height,
        count: shutter.count,
        skin: shutter.skin ?? "shutter",
      })),
  };
};

const compareMappingScore = (left, right) => {
  if (!right) return 1;
  if (left.totalKept !== right.totalKept) return left.totalKept - right.totalKept;
  if (left.keptLayers !== right.keptLayers) return left.keptLayers - right.keptLayers;
  if (left.keptExits !== right.keptExits) return left.keptExits - right.keptExits;
  return right.signature.localeCompare(left.signature);
};

const optimalExitColorMapping = (exits, variables, slotByVariable) => {
  const layerOriginalCounts = exits.map(() => new Map());
  for (const variable of variables) {
    const slot = slotByVariable.get(variable.index);
    const counts = layerOriginalCounts[slot];
    counts.set(variable.originalColor, (counts.get(variable.originalColor) ?? 0) + 1);
  }
  const memo = new Map();
  const visit = (exitIndex, usedMask) => {
    if (exitIndex === exits.length) return {
      totalKept: 0,
      keptLayers: 0,
      keptExits: 0,
      colors: [],
      signature: "",
    };
    const key = `${exitIndex}:${usedMask}`;
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (let colorIndex = 0; colorIndex < COLORS.length; colorIndex += 1) {
      if ((usedMask & (1 << colorIndex)) !== 0) continue;
      const color = COLORS[colorIndex];
      const rest = visit(exitIndex + 1, usedMask | (1 << colorIndex));
      const keptLayers = (layerOriginalCounts[exitIndex].get(color) ?? 0) + rest.keptLayers;
      const keptExits = Number(exits[exitIndex].color === color) + rest.keptExits;
      const candidate = {
        totalKept: keptLayers + keptExits,
        keptLayers,
        keptExits,
        colors: [color, ...rest.colors],
        signature: `${color},${rest.signature}`,
      };
      if (compareMappingScore(candidate, best) > 0) best = candidate;
    }
    memo.set(key, best);
    return best;
  };
  return visit(0, 0);
};

const candidateScore = (candidate) => [
  candidate.total_color_count_delta,
  candidate.opening_outer_color_count_delta,
  candidate.total_recolor_count,
  candidate.block_layer_recolor_count,
  candidate.exit_recolor_count,
  candidate.signature,
];
const candidateBetterThan = (left, right) => {
  if (!right) return true;
  const leftScore = candidateScore(left);
  const rightScore = candidateScore(right);
  for (let index = 0; index < leftScore.length - 1; index += 1) {
    if (leftScore[index] !== rightScore[index]) return leftScore[index] < rightScore[index];
  }
  return leftScore.at(-1) < rightScore.at(-1);
};

const validateOpeningClusters = (level, visibleBlockIds, finalColorByBlockId, contacts) => {
  const parent = new Map([...visibleBlockIds].map((blockId) => [blockId, blockId]));
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
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  const sameColorEdges = contacts.filter((contact) => finalColorByBlockId.get(contact.block_a) === finalColorByBlockId.get(contact.block_b));
  for (const edge of sameColorEdges) union(edge.block_a, edge.block_b);
  const membersByRoot = new Map();
  for (const blockId of visibleBlockIds) {
    const root = find(blockId);
    const members = membersByRoot.get(root) ?? [];
    members.push(blockId);
    membersByRoot.set(root, members);
  }
  const violating = [...membersByRoot.values()].filter((members) => members.length > 2);
  return {
    valid: violating.length === 0,
    maximum_component_size: Math.max(0, ...membersByRoot.values().map((members) => members.length)),
    same_color_contact_pair_count: sameColorEdges.length,
    violating_components: violating,
  };
};

const contiguousMergeSuggestions = (exits) => {
  const signatureFor = (exit) => JSON.stringify({
    kind: exit.kind,
    side: exit.side,
    color: exit.color,
    frozen: exit.frozen ?? 0,
    star: Boolean(exit.star),
    initiallyOpen: exit.kind === "flipDoor" ? Boolean(exit.initiallyOpen) : null,
  });
  const bySignature = new Map();
  for (const exit of exits) {
    const signature = signatureFor(exit);
    const entries = bySignature.get(signature) ?? [];
    entries.push(exit);
    bySignature.set(signature, entries);
  }
  const groups = [];
  for (const [signature, entries] of bySignature) {
    const sorted = [...entries].sort((left, right) => left.offset - right.offset || left.size - right.size);
    let group = [];
    let end = Number.NEGATIVE_INFINITY;
    const flush = () => {
      if (group.length > 1) {
        const offset = Math.min(...group.map((exit) => exit.offset));
        const maxEnd = Math.max(...group.map((exit) => exit.offset + exit.size));
        groups.push({
          signature: JSON.parse(signature),
          member_ids: group.map((exit) => exit.id),
          keep_id: group[0].id,
          remove_ids: group.slice(1).map((exit) => exit.id),
          proposed_span: { offset, size: maxEnd - offset },
          proposed_kept_exit: {
            id: group[0].id,
            kind: group[0].kind,
            kind_index: group[0].kindIndex,
            side: group[0].side,
            offset,
            size: maxEnd - offset,
            color: group[0].color,
            ...(group[0].frozen === undefined ? {} : { frozen: group[0].frozen }),
            ...(group[0].star === undefined ? {} : { star: group[0].star }),
            ...(group[0].kind === "flipDoor" ? { initiallyOpen: group[0].initiallyOpen } : {}),
          },
          reduction: group.length - 1,
        });
      }
    };
    for (const exit of sorted) {
      if (!group.length || exit.offset <= end) {
        group.push(exit);
        end = Math.max(end, exit.offset + exit.size);
      } else {
        flush();
        group = [exit];
        end = exit.offset + exit.size;
      }
    }
    flush();
  }
  return groups;
};

const planLevel = (level) => {
  const exits = exitsFor(level);
  const visibility = openingVisibilityFor(level);
  const { contacts, neighbors } = physicalOpeningContacts(level, visibility.visible);
  const originalLayerColors = level.blocks.flatMap(blockLayers);
  const originalLayerColorSet = [...new Set(originalLayerColors)];
  const originalOpeningOuterColorSet = [...new Set(level.blocks
    .filter((block) => visibility.visible.has(block.id))
    .map((block) => blockLayers(block)[0]))];

  const shared = {
    level_id: level.id,
    exit_count: exits.length,
    block_count: level.blocks.length,
    layer_count: originalLayerColors.length,
    opening_visible_block_count: visibility.visible.size,
    non_opening_hidden_blocks: visibility.hidden,
    original_layer_color_count: originalLayerColorSet.length,
    original_layer_colors: originalLayerColorSet,
    original_opening_outer_color_count: originalOpeningOuterColorSet.length,
    original_opening_outer_colors: originalOpeningOuterColorSet,
  };

  if (exits.length > COLORS.length) {
    const mergeGroups = contiguousMergeSuggestions(exits);
    const reduction = mergeGroups.reduce((sum, group) => sum + group.reduction, 0);
    return {
      ...shared,
      status: "requires-exit-merge-or-rebuild",
      failure_reasons: [{
        code: "exit-count-exceeds-color-capacity",
        exit_count: exits.length,
        color_capacity: COLORS.length,
        minimum_exit_reduction: exits.length - COLORS.length,
      }],
      auditable_contiguous_merge_suggestions: mergeGroups,
      machine_merge_suggestions: {
        groups: mergeGroups.map((group) => ({
          keep_id: group.keep_id,
          remove_ids: group.remove_ids,
          proposed_kept_exit: group.proposed_kept_exit,
        })),
        suggested_removed_exit_ids: mergeGroups.flatMap((group) => group.remove_ids),
      },
      exit_count_after_suggested_contiguous_merges: exits.length - reduction,
      requires_additional_source_reviewed_reduction: Math.max(0, exits.length - reduction - COLORS.length),
    };
  }

  const dynamicallyRelocatedBlockIds = dynamicallyRelocatedBlockIdsFor(level);
  const variables = [];
  let variableIndex = 0;
  for (const block of level.blocks) {
    blockLayers(block).forEach((color, layerIndex) => {
      variables.push({
        index: variableIndex,
        blockId: block.id,
        layerIndex,
        originalColor: color,
        openingOuter: layerIndex === 0 && visibility.visible.has(block.id),
        compatibleSlots: exits
          .filter((exit) => exitGeometryCompatible(block, exit, dynamicallyRelocatedBlockIds))
          .map((exit) => exit.slot),
      });
      variableIndex += 1;
    });
  }
  const impossibleVariables = variables.filter((variable) => variable.compatibleSlots.length === 0);
  if (impossibleVariables.length) {
    const impossibleLayerDiagnostics = impossibleVariables.map((variable) => {
      const block = level.blocks.find((candidate) => candidate.id === variable.blockId);
      const bounds = shapeBounds(block);
      return {
        ...variable,
        block: {
          star_required: Boolean(block.star),
          movement_axis: block.movementAxis ?? null,
          shape_bounds: bounds,
          dynamically_relocated: dynamicallyRelocatedBlockIds.has(block.id),
          fixed_perpendicular_range: dynamicallyRelocatedBlockIds.has(block.id)
            ? null
            : block.movementAxis === "horizontal"
              ? [block.y + bounds.minY, block.y + bounds.maxY]
              : block.movementAxis === "vertical"
                ? [block.x + bounds.minX, block.x + bounds.maxX]
                : null,
        },
        exits: exits.map((exit) => ({
          id: exit.id,
          kind: exit.kind,
          side: exit.side,
          offset: exit.offset,
          size: exit.size,
          star: Boolean(exit.star),
          rejection_reasons: exitGeometryRejections(block, exit, dynamicallyRelocatedBlockIds),
        })),
      };
    });
    return {
      ...shared,
      status: "requires-exit-geometry-adjustment",
      failure_reasons: [{
        code: "layer-has-no-star-axis-aperture-fixed-offset-compatible-exit",
        layers: impossibleLayerDiagnostics,
      }],
    };
  }

  const openingClearability = openingClearabilityFor(level, exits, visibility);
  if (!openingClearability.passed) {
    return {
      ...shared,
      status: "requires-exit-geometry-adjustment",
      failure_reasons: [{
        code: "no-possible-first-clear-with-current-exit-and-counter-geometry",
        message: "No opening-visible block or first generator queue head can reach any unfrozen open exit, even after ignoring every other block. Recolouring alone cannot start counter progress.",
      }],
      opening_clearability_necessary_condition: openingClearability,
    };
  }

  const variableByOpeningBlockId = new Map(variables
    .filter((variable) => variable.openingOuter)
    .map((variable) => [variable.blockId, variable]));
  const variableByIndex = new Map(variables.map((variable) => [variable.index, variable]));
  const outerVariables = [...variableByOpeningBlockId.values()]
    .sort((left, right) => {
      const domainDelta = left.compatibleSlots.length - right.compatibleSlots.length;
      if (domainDelta) return domainDelta;
      const degreeDelta = (neighbors.get(right.blockId)?.size ?? 0) - (neighbors.get(left.blockId)?.size ?? 0);
      if (degreeDelta) return degreeDelta;
      return left.blockId.localeCompare(right.blockId);
    });
  const freeVariables = variables.filter((variable) => !variable.openingOuter);
  const allSlots = exits.map((exit) => exit.slot);
  // With unique exit colours, every layer assigned to one exit slot inherits
  // that exit's colour. A frozen exit with counter F can carry at most
  // totalLayers-F same-colour layers, otherwise fewer than F other-colour
  // clears exist to thaw it. Counter values themselves are never changed.
  const capacityBySlot = exits.map((exit) => Math.max(
    0,
    (exit.frozen ?? 0) > 0 ? variables.length - (exit.frozen ?? 0) : variables.length,
  ));
  const targetColorCount = originalLayerColorSet.length;
  const attemptedColorCounts = [...new Set(allSlots.map((_, index) => index + 1))]
    .sort((left, right) => Math.abs(left - targetColorCount) - Math.abs(right - targetColorCount) || right - left);
  let bestCandidate = null;
  const candidatePool = [];
  let searchNodes = 0;
  let searchTruncated = false;
  let bestColorCountDeltaFound = Number.POSITIVE_INFINITY;
  const completedColorCounts = [];

  const evaluateAssignment = (selectedSlots, outerSlotByVariable, freeSlotByVariable) => {
    const slotByVariable = new Map([...outerSlotByVariable, ...freeSlotByVariable]);
    const selectedSet = new Set(selectedSlots);
    const possibleFirstClears = openingClearability.possible_first_clear_pairs.filter((pair) => {
      const variable = variables.find((candidate) => candidate.blockId === pair.block_id && candidate.layerIndex === 0);
      return variable && slotByVariable.get(variable.index) === pair.exit_slot;
    });
    if (!possibleFirstClears.length) return;
    let frozenViability = frozenExitViabilityFor(exits, variables, slotByVariable);
    if (!frozenViability.passed) return;
    let mapping = optimalExitColorMapping(exits, variables, slotByVariable);
    // Coordinate-descent pass: once the optimal unique exit colours are known,
    // move non-opening layers back to their original colour when capacity and
    // selected-slot coverage remain valid. Outer graph assignments stay fixed.
    for (let pass = 0; pass < 3; pass += 1) {
      let moved = false;
      const counts = [...frozenViability.layer_count_by_exit_slot];
      for (const variable of freeVariables) {
        const siblingSlots = new Set(variables
          .filter((candidate) => candidate.blockId === variable.blockId && candidate.index !== variable.index)
          .map((candidate) => slotByVariable.get(candidate.index)));
        const preferred = variable.compatibleSlots.find((slot) => (
          selectedSet.has(slot)
          && mapping.colors[slot] === variable.originalColor
          && counts[slot] < capacityBySlot[slot]
          && !siblingSlots.has(slot)
        ));
        const current = slotByVariable.get(variable.index);
        if (preferred === undefined || preferred === current || counts[current] <= 1) continue;
        slotByVariable.set(variable.index, preferred);
        counts[current] -= 1;
        counts[preferred] += 1;
        moved = true;
      }
      if (!moved) break;
      frozenViability = frozenExitViabilityFor(exits, variables, slotByVariable);
      if (!frozenViability.passed) return;
      mapping = optimalExitColorMapping(exits, variables, slotByVariable);
    }

    const layerChanges = variables.flatMap((variable) => {
      const slot = slotByVariable.get(variable.index);
      const to = mapping.colors[slot];
      return to === variable.originalColor ? [] : [{
        block_id: variable.blockId,
        layer_index: variable.layerIndex,
        from: variable.originalColor,
        to,
        compatible_exit_id: exits[slot].id,
        compatible_exit_slot: slot,
      }];
    });
    const exitChanges = exits.flatMap((exit) => mapping.colors[exit.slot] === exit.color ? [] : [{
      kind: exit.kind,
      index: exit.kindIndex,
      id: exit.id,
      from: exit.color,
      to: mapping.colors[exit.slot],
    }]);
    const finalOuterColorByBlockId = new Map(outerVariables.map((variable) => {
      const slot = slotByVariable.get(variable.index);
      return [variable.blockId, mapping.colors[slot]];
    }));
    const clusterValidation = validateOpeningClusters(level, visibility.visible, finalOuterColorByBlockId, contacts);
    if (!clusterValidation.valid) return;
    const usedSlots = new Set(variables.map((variable) => slotByVariable.get(variable.index)));
    const openingUsedSlots = new Set(outerVariables.map((variable) => slotByVariable.get(variable.index)));
    if (usedSlots.size !== selectedSlots.length) return;
    const targetLayersByBlockId = new Map();
    for (const block of level.blocks) {
      const blockVariables = variables
        .filter((variable) => variable.blockId === block.id)
        .sort((left, right) => left.layerIndex - right.layerIndex);
      targetLayersByBlockId.set(block.id, blockVariables.map((variable) => (
        mapping.colors[slotByVariable.get(variable.index)]
      )));
    }
    const proposedBlocks = level.blocks.map((block) => {
      const originalLayers = blockLayers(block);
      const targetLayers = targetLayersByBlockId.get(block.id);
      return {
        id: block.id,
        original: {
          color_field: block.color,
          layers: originalLayers,
          outer_color: originalLayers[0],
          body_color: originalLayers.at(-1),
        },
        target: {
          color_field: targetLayers.at(-1),
          layers: targetLayers,
          layers_field: block.layers ? targetLayers : null,
          outer_color: targetLayers[0],
          body_color: targetLayers.at(-1),
        },
        changed: originalLayers.some((color, index) => color !== targetLayers[index]),
      };
    });
    const proposedExits = exits.map((exit) => ({
      kind: exit.kind,
      index: exit.kindIndex,
      id: exit.id,
      original_color: exit.color,
      target_color: mapping.colors[exit.slot],
      changed: exit.color !== mapping.colors[exit.slot],
    }));
    const targetLayerColorSet = [...new Set(proposedBlocks.flatMap((block) => block.target.layers))];
    const targetOpeningOuterColorSet = [...new Set(proposedBlocks
      .filter((block) => visibility.visible.has(block.id))
      .map((block) => block.target.outer_color))];
    const signature = `${mapping.colors.join(",")}|${variables.map((variable) => slotByVariable.get(variable.index)).join(",")}`;
    const candidate = {
      color_count_preserved: usedSlots.size === targetColorCount,
      candidate_layer_color_count: usedSlots.size,
      total_color_count_delta: Math.abs(usedSlots.size - targetColorCount),
      candidate_opening_outer_color_count: openingUsedSlots.size,
      opening_outer_color_count_delta: Math.abs(openingUsedSlots.size - originalOpeningOuterColorSet.length),
      block_layer_recolor_count: layerChanges.length,
      exit_recolor_count: exitChanges.length,
      total_recolor_count: layerChanges.length + exitChanges.length,
      layer_changes: layerChanges,
      exit_changes: exitChanges,
      machine_edits: {
        exits: proposedExits,
        exit_color_by_id: Object.fromEntries(proposedExits.map((exit) => [exit.id, exit.target_color])),
        blocks: proposedBlocks,
        block_colors_by_id: Object.fromEntries(proposedBlocks.map((block) => [block.id, {
          color: block.target.color_field,
          outer: block.target.outer_color,
          body: block.target.body_color,
          layers: block.target.layers,
          layers_field: block.target.layers_field,
        }])),
      },
      palette: {
        original: {
          all_layer_colors: originalLayerColorSet,
          all_layer_color_count: originalLayerColorSet.length,
          opening_outer_colors: originalOpeningOuterColorSet,
          opening_outer_color_count: originalOpeningOuterColorSet.length,
        },
        target: {
          all_layer_colors: targetLayerColorSet,
          all_layer_color_count: targetLayerColorSet.length,
          opening_outer_colors: targetOpeningOuterColorSet,
          opening_outer_color_count: targetOpeningOuterColorSet.length,
        },
      },
      proposed_exit_colors_in_order: mapping.colors,
      selected_compatible_exit_slots: selectedSlots,
      opening_cluster_validation: clusterValidation,
      static_compatibility: {
        passed: true,
        checked_layer_count: variables.length,
        violations: [],
        contract: "color/star/axis/aperture/fixed-offset",
      },
      frozen_exit_deadlock_necessary_condition: frozenViability,
      opening_clearability_necessary_condition: {
        passed: true,
        possible_first_clear_pairs_after_assignment: possibleFirstClears,
        proof_scope: openingClearability.proof_scope,
      },
      board_shape_block_mechanism_exit_counts_preserved: true,
      signature,
    };
    if (!candidatePool.some((entry) => entry.signature === candidate.signature)) {
      candidatePool.push(candidate);
      candidatePool.sort((left, right) => candidateBetterThan(left, right) ? -1 : candidateBetterThan(right, left) ? 1 : 0);
      if (candidatePool.length > candidateLimit) candidatePool.length = candidateLimit;
    }
    bestCandidate = candidatePool[0] ?? null;
  };

  for (const colorCount of attemptedColorCounts) {
    const colorCountDelta = Math.abs(colorCount - targetColorCount);
    if (bestCandidate && colorCountDelta > bestColorCountDeltaFound) break;
    let countFullySearched = true;
    for (const selectedSlots of combinations(allSlots, colorCount)) {
      if (searchNodes >= maxSearchNodesPerLevel) {
        searchTruncated = true;
        countFullySearched = false;
        break;
      }
      const selectedSet = new Set(selectedSlots);
      if (selectedSlots.some((slot) => capacityBySlot[slot] < 1)) continue;
      if (selectedSlots.reduce((sum, slot) => sum + capacityBySlot[slot], 0) < variables.length) continue;
      const domainByVariable = new Map(variables.map((variable) => [
        variable.index,
        variable.compatibleSlots.filter((slot) => selectedSet.has(slot)),
      ]));
      if (variables.some((variable) => domainByVariable.get(variable.index).length === 0)) continue;
      if (selectedSlots.some((slot) => !variables.some((variable) => domainByVariable.get(variable.index).includes(slot)))) continue;

      const orderedOuter = [...outerVariables].sort((left, right) => {
        const domainDelta = domainByVariable.get(left.index).length - domainByVariable.get(right.index).length;
        if (domainDelta) return domainDelta;
        return (neighbors.get(right.blockId)?.size ?? 0) - (neighbors.get(left.blockId)?.size ?? 0);
      });
      const outerSlotByVariable = new Map();
      const sameColorDegree = new Map(orderedOuter.map((variable) => [variable.blockId, 0]));
      const outerLayerCountBySlot = exits.map(() => 0);
      let subsetSolutions = 0;
      const searchOuter = (orderIndex) => {
        if (subsetSolutions >= maxSolutionsPerSubset || searchNodes >= maxSearchNodesPerLevel) return;
        searchNodes += 1;
        if (orderIndex === orderedOuter.length) {
          const freeAssignment = assignFreeVariablesWithCapacities(
            freeVariables,
            domainByVariable,
            selectedSlots,
            outerLayerCountBySlot,
            capacityBySlot,
            outerSlotByVariable,
            variableByIndex,
          );
          if (!freeAssignment) return;
          subsetSolutions += 1;
          evaluateAssignment(selectedSlots, outerSlotByVariable, freeAssignment.assignment);
          return;
        }
        const variable = orderedOuter[orderIndex];
        const domain = [...domainByVariable.get(variable.index)].sort((left, right) => {
          const leftKeep = exits[left].color === variable.originalColor ? 0 : 1;
          const rightKeep = exits[right].color === variable.originalColor ? 0 : 1;
          return leftKeep - rightKeep || left - right;
        });
        for (const slot of domain) {
          if (outerLayerCountBySlot[slot] >= capacityBySlot[slot]) continue;
          const sameAssignedNeighbors = [...(neighbors.get(variable.blockId) ?? [])]
            .map((blockId) => variableByOpeningBlockId.get(blockId))
            .filter(Boolean)
            .filter((neighbor) => outerSlotByVariable.get(neighbor.index) === slot);
          if (sameAssignedNeighbors.length > 1) continue;
          if (sameAssignedNeighbors.some((neighbor) => (sameColorDegree.get(neighbor.blockId) ?? 0) >= 1)) continue;
          outerSlotByVariable.set(variable.index, slot);
          outerLayerCountBySlot[slot] += 1;
          sameColorDegree.set(variable.blockId, sameAssignedNeighbors.length);
          for (const neighbor of sameAssignedNeighbors) {
            sameColorDegree.set(neighbor.blockId, (sameColorDegree.get(neighbor.blockId) ?? 0) + 1);
          }
          searchOuter(orderIndex + 1);
          for (const neighbor of sameAssignedNeighbors) {
            sameColorDegree.set(neighbor.blockId, sameColorDegree.get(neighbor.blockId) - 1);
          }
          sameColorDegree.set(variable.blockId, 0);
          outerLayerCountBySlot[slot] -= 1;
          outerSlotByVariable.delete(variable.index);
          if (subsetSolutions >= maxSolutionsPerSubset || searchNodes >= maxSearchNodesPerLevel) break;
        }
      };
      searchOuter(0);
    }
    if (countFullySearched) completedColorCounts.push(colorCount);
    if (bestCandidate && bestCandidate.total_color_count_delta === colorCountDelta) {
      bestColorCountDeltaFound = colorCountDelta;
    }
  }

  if (!bestCandidate) {
    return {
      ...shared,
      status: searchTruncated ? "joint-search-inconclusive" : "joint-constraints-unsatisfied",
      failure_reasons: [{
        code: searchTruncated ? "bounded-search-node-limit" : "no-layer-slot-assignment-satisfies-joint-constraints",
        max_search_nodes: maxSearchNodesPerLevel,
        searched_nodes: searchNodes,
        completed_color_counts: completedColorCounts,
      }],
    };
  }

  return {
    ...shared,
    status: "joint-recolor-candidate",
    search: {
      searched_nodes: searchNodes,
      truncated: searchTruncated,
      completed_color_counts: completedColorCounts,
      candidate_optimality: searchTruncated
        ? "feasible bounded-search candidate; global minimum not certified"
        : "best candidate among the enumerated colour-count/subset assignments and bounded outer assignments; full gameplay solvability not tested",
    },
    candidate: bestCandidate,
    alternative_candidates: candidatePool.slice(1),
  };
};

const results = levels.map(planLevel);
const candidates = results.filter((entry) => entry.status === "joint-recolor-candidate");
const mergeOrRebuild = results.filter((entry) => entry.status === "requires-exit-merge-or-rebuild");
const geometryAdjustments = results.filter((entry) => entry.status === "requires-exit-geometry-adjustment");
const inconclusive = results.filter((entry) => entry.status === "joint-search-inconclusive");
const unsatisfied = results.filter((entry) => entry.status === "joint-constraints-unsatisfied");
const candidateInvariantFailures = [];
for (const entry of candidates) {
  const level = levels.find((candidate) => candidate.id === entry.level_id);
  const exits = exitsFor(level);
  const targetExitByColor = new Map(entry.candidate.machine_edits.exits.map((exit) => [exit.target_color, exit]));
  if (targetExitByColor.size !== exits.length) {
    candidateInvariantFailures.push({ level_id: level.id, code: "target-exit-colors-not-unique" });
  }
  const targetBlockById = new Map(entry.candidate.machine_edits.blocks.map((block) => [block.id, block]));
  const dynamicallyRelocatedBlockIds = dynamicallyRelocatedBlockIdsFor(level);
  const targetLayerColors = entry.candidate.machine_edits.blocks.flatMap((block) => block.target.layers);
  for (const block of level.blocks) {
    const targetBlock = targetBlockById.get(block.id);
    if (!targetBlock || targetBlock.target.layers.length !== blockLayers(block).length) {
      candidateInvariantFailures.push({ level_id: level.id, code: "block-layer-shape-mismatch", block_id: block.id });
      continue;
    }
    if (targetBlock.target.color_field !== targetBlock.target.body_color
      || targetBlock.target.body_color !== targetBlock.target.layers.at(-1)
      || targetBlock.target.outer_color !== targetBlock.target.layers[0]) {
      candidateInvariantFailures.push({ level_id: level.id, code: "block-machine-edit-color-contract", block_id: block.id });
    }
    if (new Set(targetBlock.target.layers).size !== targetBlock.target.layers.length) {
      candidateInvariantFailures.push({ level_id: level.id, code: "layered-block-repeats-color", block_id: block.id });
    }
    targetBlock.target.layers.forEach((color, layerIndex) => {
      const targetExitEdit = targetExitByColor.get(color);
      if (!targetExitEdit) {
        candidateInvariantFailures.push({ level_id: level.id, code: "target-layer-color-has-no-exit", block_id: block.id, layer_index: layerIndex, color });
        return;
      }
      const sourceExit = exits.find((exit) => exit.id === targetExitEdit.id);
      if (!exitGeometryCompatible(block, sourceExit, dynamicallyRelocatedBlockIds)) {
        candidateInvariantFailures.push({ level_id: level.id, code: "target-layer-exit-static-incompatible", block_id: block.id, layer_index: layerIndex, exit_id: sourceExit.id });
      }
    });
  }
  for (const targetExitEdit of entry.candidate.machine_edits.exits) {
    const sourceExit = exits.find((exit) => exit.id === targetExitEdit.id);
    const sameColorLayerCount = targetLayerColors.filter((color) => color === targetExitEdit.target_color).length;
    if (sameColorLayerCount > 0 && (sourceExit.frozen ?? 0) > targetLayerColors.length - sameColorLayerCount) {
      candidateInvariantFailures.push({
        level_id: level.id,
        code: "target-frozen-exit-deadlock",
        exit_id: sourceExit.id,
        frozen: sourceExit.frozen ?? 0,
        same_color_layer_count: sameColorLayerCount,
        maximum_prior_other_clears: targetLayerColors.length - sameColorLayerCount,
      });
    }
  }
  const visibility = openingVisibilityFor(level);
  const contacts = physicalOpeningContacts(level, visibility.visible).contacts;
  const finalOuter = new Map(entry.candidate.machine_edits.blocks
    .filter((block) => visibility.visible.has(block.id))
    .map((block) => [block.id, block.target.outer_color]));
  if (!validateOpeningClusters(level, visibility.visible, finalOuter, contacts).valid) {
    candidateInvariantFailures.push({ level_id: level.id, code: "target-opening-cluster-violation" });
  }
}
if (candidateInvariantFailures.length) {
  throw new Error(`Joint-colour candidate invariant failure:\n${JSON.stringify(candidateInvariantFailures, null, 2)}`);
}
const generatedAt = new Date().toISOString();
const levelSourcePaths = [
  "src/core/levels.ts",
  "src/core/videoParityLevels.generated.ts",
  "src/core/videoParityLevels101To200.generated.ts",
];
const provenance = {
  level_source_sha256: Object.fromEntries(await Promise.all(levelSourcePaths.map(async (path) => [
    path,
    await sha256File(resolve(root, path)),
  ]))),
};
const report = {
  generated_at: generatedAt,
  mode: "experimental joint color planner; no formal level data is modified and no full gameplay solve is run",
  range: { from: fromLevel, to: toLevel },
  constraints: {
    unique_exit_colors: "gates and flipDoors share one eight-colour uniqueness namespace",
    opening_same_color_clusters: "opening-visible blocks connected by orthogonal contact may share a colour only in components of at most two blocks (same-colour degree <= 1)",
    structural_preservation: "board, shape, block count, mechanisms, exit count and total layer-colour count are preserved whenever a recolour-only candidate exists",
    static_exit_compatibility: "every block layer retains a color/star/axis/aperture/fixed-offset compatible exit",
    frozen_exit_viability: "every used uniquely-coloured frozen exit has counter <= the number of layers of all other colours; frozen values are never changed",
    opening_clearability: "before accepting a recolour candidate, at least one opening-visible block or first generator head must be able to reach an unfrozen open exit while physical opening shutters and board voids remain fixed",
    layered_block_distinctness: "different layers of one block must retain different colours",
    hidden_opening_exclusions: "generator queue and positive-counter shutter/staging blocks are excluded from the opening adjacency graph",
  },
  search_limits: {
    max_search_nodes_per_level: maxSearchNodesPerLevel,
    max_outer_solutions_per_exit_subset: maxSolutionsPerSubset,
    retained_candidates_per_level: candidateLimit,
  },
  summary: {
    levels: results.length,
    joint_recolor_candidates: candidates.length,
    candidates_preserving_layer_color_count: candidates.filter((entry) => entry.candidate.color_count_preserved).length,
    requires_exit_merge_or_rebuild: mergeOrRebuild.length,
    requires_exit_geometry_adjustment: geometryAdjustments.length,
    joint_search_inconclusive: inconclusive.length,
    joint_constraints_unsatisfied: unsatisfied.length,
    total_candidate_block_layer_recolors: candidates.reduce((sum, entry) => sum + entry.candidate.block_layer_recolor_count, 0),
    total_candidate_exit_recolors: candidates.reduce((sum, entry) => sum + entry.candidate.exit_recolor_count, 0),
    candidate_level_ids: candidates.map((entry) => entry.level_id),
    exit_merge_or_rebuild_level_ids: mergeOrRebuild.map((entry) => entry.level_id),
    geometry_adjustment_level_ids: geometryAdjustments.map((entry) => entry.level_id),
    inconclusive_level_ids: inconclusive.map((entry) => entry.level_id),
    unsatisfied_level_ids: unsatisfied.map((entry) => entry.level_id),
  },
  candidate_invariant_validation: {
    passed: true,
    checked_candidates: candidates.length,
    failures: [],
  },
  provenance,
  special_review: Object.fromEntries([125, 127, 130]
    .filter((levelId) => levelId >= fromLevel && levelId <= toLevel)
    .map((levelId) => [String(levelId), results.find((entry) => entry.level_id === levelId)])),
  levels: results,
};

const markdown = `# Joint colour-constraint plan: Lv${fromLevel}-${toLevel}\n\n`
  + `Generated: ${generatedAt}\n\n`
  + `Read-only experimental planning only. No formal level source was edited and no full gameplay solver was run.\n\n`
  + `- Levels: ${report.summary.levels}\n`
  + `- Joint recolour candidates: ${report.summary.joint_recolor_candidates}\n`
  + `- Candidates preserving total layer-colour count: ${report.summary.candidates_preserving_layer_color_count}\n`
  + `- Require exit merge/rebuild (>8 exits): ${report.summary.requires_exit_merge_or_rebuild}\n`
  + `- Require exit geometry adjustment: ${report.summary.requires_exit_geometry_adjustment}\n`
  + `- Search inconclusive: ${report.summary.joint_search_inconclusive}\n`
  + `- Joint constraints unsatisfied within completed search: ${report.summary.joint_constraints_unsatisfied}\n`
  + `- Candidate block-layer recolours: ${report.summary.total_candidate_block_layer_recolors}\n`
  + `- Candidate exit recolours: ${report.summary.total_candidate_exit_recolors}\n\n`
  + `## Acceptance boundary\n\n`
  + `A candidate only certifies the requested colour constraints and the solver's static exit-compatibility contract. It is not a gameplay-solvability certificate; every formal adoption still requires full solver and PuzzleModel replay.\n`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(markdownPath, markdown, "utf8");
process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n${jsonPath}\n`);
