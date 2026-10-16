"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/core/revisedMechanismContract.ts
var revisedMechanismContract_exports = {};
__export(revisedMechanismContract_exports, {
  assertRevisedMechanismContract: () => assertRevisedMechanismContract,
  auditRevisedMechanismContract: () => auditRevisedMechanismContract
});
module.exports = __toCommonJS(revisedMechanismContract_exports);

// src/core/generatorMouthSpawnGeometry.ts
var vectorsFor = (quarterTurns) => {
  if (quarterTurns === 0) {
    return { tangent: [1, 0], inward: [0, 1], outward: [0, -1] };
  }
  if (quarterTurns === 1) {
    return { tangent: [0, 1], inward: [-1, 0], outward: [1, 0] };
  }
  if (quarterTurns === 2) {
    return { tangent: [-1, 0], inward: [0, -1], outward: [0, 1] };
  }
  return { tangent: [0, -1], inward: [1, 0], outward: [-1, 0] };
};
var pointKey = ([x, y]) => `${x},${y}`;
var isIntegerPoint = (point) => point.length === 2 && point.every((coordinate) => Number.isInteger(coordinate));
var effectiveRimAnchor = (generator, board) => {
  if (generator.rimAnchor) return { ...generator.rimAnchor };
  if (!Number.isInteger(generator.offset)) return void 0;
  if (generator.side === "top") {
    return { x: generator.offset + 0.5, y: 0, quarterTurns: 0 };
  }
  if (generator.side === "right") {
    return { x: board.width, y: generator.offset + 0.5, quarterTurns: 1 };
  }
  if (generator.side === "bottom") {
    return { x: generator.offset + 0.5, y: board.height, quarterTurns: 2 };
  }
  if (generator.side === "left") {
    return { x: 0, y: generator.offset + 0.5, quarterTurns: 3 };
  }
  return void 0;
};
var generatorMouthTemplateFromRimAnchor = (rimAnchor) => {
  if (!Number.isFinite(rimAnchor.x) || !Number.isFinite(rimAnchor.y) || ![0, 1, 2, 3].includes(rimAnchor.quarterTurns)) {
    return { status: "invalid", reason: "Generator rim geometry is invalid." };
  }
  const vectors = vectorsFor(rimAnchor.quarterTurns);
  const centerX = rimAnchor.x - vectors.outward[0] * 0.5 - 0.5;
  const centerY = rimAnchor.y - vectors.outward[1] * 0.5 - 0.5;
  if (!Number.isInteger(centerX) || !Number.isInteger(centerY)) {
    return { status: "invalid", reason: "Generator center rail is not aligned to the cell grid." };
  }
  const mouthCells = [-1, 0, 1].map((offset) => [
    centerX + vectors.tangent[0] * offset,
    centerY + vectors.tangent[1] * offset
  ]);
  const templateCells = mouthCells.flatMap(([x, y]) => [0, 1, 2].map((depth) => [
    x + vectors.inward[0] * depth,
    y + vectors.inward[1] * depth
  ]));
  const templateOrigin = [
    Math.min(...templateCells.map(([x]) => x)),
    Math.min(...templateCells.map(([, y]) => y))
  ];
  return {
    status: "ok",
    rimAnchor: { ...rimAnchor },
    mouthCells,
    templateOrigin,
    templateBounds: {
      x: templateOrigin[0],
      y: templateOrigin[1],
      width: 3,
      height: 3
    }
  };
};
var resolveGeneratorMouthTemplate = (generator, board) => {
  if (!Number.isInteger(board.width) || board.width <= 0 || !Number.isInteger(board.height) || board.height <= 0) {
    return { status: "invalid", reason: "Board dimensions must be positive integers." };
  }
  const rimAnchor = effectiveRimAnchor(generator, board);
  if (!rimAnchor) return { status: "invalid", reason: "Generator rim geometry is invalid." };
  return generatorMouthTemplateFromRimAnchor(rimAnchor);
};
var validateGeneratorMouthSpawn = (generator, spawn, shape, board) => {
  if (!isIntegerPoint(spawn)) {
    return { status: "invalid", reason: "Spawn must be an integer board anchor." };
  }
  if (!shape.length || shape.some((cell) => !isIntegerPoint(cell))) {
    return { status: "invalid", reason: "Shape must contain integer cell offsets." };
  }
  if (new Set(shape.map(pointKey)).size !== shape.length) {
    return { status: "invalid", reason: "Shape cell offsets must be unique." };
  }
  const template = resolveGeneratorMouthTemplate(generator, board);
  if (template.status === "invalid") return template;
  const { status: _templateStatus, ...geometry } = template;
  const footprint = shape.map(([dx, dy]) => [spawn[0] + dx, spawn[1] + dy]);
  const centerMouthKey = pointKey(geometry.mouthCells[1]);
  const touchesCenterMouth = footprint.some((cell) => pointKey(cell) === centerMouthKey);
  const checked = {
    ...geometry,
    spawn: [...spawn],
    footprint,
    touchesCenterMouth
  };
  if (!touchesCenterMouth) {
    return {
      status: "invalid",
      ...checked,
      reason: "Spawn footprint does not contain the center mouth cell."
    };
  }
  const playable = board.playable ? new Set(board.playable.map(pointKey)) : void 0;
  const blocked = new Set((board.blocked ?? []).map(pointKey));
  const rejectedCells = footprint.filter(([x, y]) => x < 0 || x >= board.width || y < 0 || y >= board.height || playable !== void 0 && !playable.has(pointKey([x, y])) || blocked.has(pointKey([x, y])));
  if (rejectedCells.length) {
    return {
      status: "blocked",
      ...checked,
      rejectedCells,
      reason: "Spawn footprint is not fully playable."
    };
  }
  return { status: "ok", ...checked };
};

// src/core/gatePortals.ts
var outwardVector = (side) => side === "top" ? [0, -1] : side === "right" ? [1, 0] : side === "bottom" ? [0, 1] : [-1, 0];
var legacyOuterPortal = (board, gate) => ({
  side: gate.side,
  origin: gate.side === "top" ? [gate.offset, 0] : gate.side === "right" ? [board.width - 1, gate.offset] : gate.side === "bottom" ? [gate.offset, board.height - 1] : [0, gate.offset],
  size: gate.size
});
var gatePortals = (board, gate) => gate.portals?.length ? gate.portals : [legacyOuterPortal(board, gate)];
var portalMouthCells = (portal) => {
  const [originX, originY] = portal.origin;
  return Array.from({ length: portal.size }, (_, index) => portal.side === "top" || portal.side === "bottom" ? [originX + index, originY] : [originX, originY + index]);
};
var directedRailKey = ([x, y], side) => `${x},${y}:${side}`;

// src/core/generatorMountContract.ts
var SIDES = ["top", "right", "bottom", "left"];
var keyOf = ([x, y]) => `${x},${y}`;
var generatorMountBounds = (anchor) => {
  if (anchor.quarterTurns === 0) return { x: anchor.x - 1.5, y: anchor.y - 1, width: 3, height: 1.35 };
  if (anchor.quarterTurns === 1) return { x: anchor.x - 0.35, y: anchor.y - 1.5, width: 1.35, height: 3 };
  if (anchor.quarterTurns === 2) return { x: anchor.x - 1.5, y: anchor.y - 0.35, width: 3, height: 1.35 };
  return { x: anchor.x - 1, y: anchor.y - 1.5, width: 1.35, height: 3 };
};
var intersects = (left, right) => Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x) > 1e-9 && Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y) > 1e-9;
var auditGeneratorMounts = (level) => {
  if (!level.generators?.length) return [];
  const issues = [];
  const explicitPlayable = level.playable ? new Set(level.playable.map(keyOf)) : void 0;
  const blocked = new Set((level.blocked ?? []).map(keyOf));
  const playable = ([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height && (!explicitPlayable || explicitPlayable.has(keyOf([x, y]))) && !blocked.has(keyOf([x, y]));
  const exterior = /* @__PURE__ */ new Set();
  if (Number.isInteger(level.width) && level.width > 0 && Number.isInteger(level.height) && level.height > 0) {
    const pending = [[-1, -1]];
    exterior.add("-1,-1");
    for (let index = 0; index < pending.length; index += 1) {
      const [x, y] = pending[index];
      for (const cell of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (cell[0] < -1 || cell[1] < -1 || cell[0] > level.width || cell[1] > level.height) continue;
        const key = keyOf(cell);
        if (exterior.has(key) || playable(cell)) continue;
        exterior.add(key);
        pending.push(cell);
      }
    }
  }
  const exitRails = /* @__PURE__ */ new Map();
  for (const gate of [...level.gates, ...level.flipDoors ?? []]) {
    for (const portal of gatePortals(level, gate)) {
      if (!Number.isInteger(portal.size) || portal.size <= 0) continue;
      for (const cell of portalMouthCells(portal)) exitRails.set(directedRailKey(cell, portal.side), gate.id);
    }
  }
  const occupiedRails = /* @__PURE__ */ new Map();
  const occupiedBounds = [];
  for (const generator of level.generators) {
    const add = (code, message, details = {}) => {
      issues.push({ code, message, generatorId: generator.id, ...details });
    };
    if (generator.rimSpan !== void 0 && generator.rimSpan !== 3) {
      add("generator-rim-span", "A generator requires exactly three mounting rails.");
    }
    if (generator.rimMount !== void 0 && generator.rimMount !== "rim") {
      add("generator-rim-mount", "Revised generators must replace exposed rim rails, not float outboard.");
    }
    if (!SIDES.includes(generator.side) || !Number.isInteger(generator.offset)) {
      add("generator-rim-geometry", "Generator side and offset must identify a grid-aligned mounting edge.");
      continue;
    }
    const template = resolveGeneratorMouthTemplate(generator, level);
    if (template.status !== "ok") {
      add("generator-rim-geometry", template.reason);
      continue;
    }
    const { rimAnchor, mouthCells } = template;
    const side = SIDES[rimAnchor.quarterTurns];
    const expectedOffset = side === "top" || side === "bottom" ? rimAnchor.x - 0.5 : rimAnchor.y - 0.5;
    if (generator.side !== side || generator.offset !== expectedOffset) {
      add("generator-rim-direction", "Generator side/offset must agree with the actual rim anchor and inward mouth direction.");
    }
    const [dx, dy] = outwardVector(side);
    for (const cell of mouthCells) {
      const outward = [cell[0] + dx, cell[1] + dy];
      if (!playable(cell) || !exterior.has(keyOf(outward))) {
        add("generator-rim-not-exposed", "Every machine rail must border playable floor and exterior-connected void.", { cell });
      }
      const rail = directedRailKey(cell, side);
      const gateId = exitRails.get(rail);
      if (gateId !== void 0) add("generator-exit-overlap", "A generator rail overlaps an exit, including closed, frozen or star exits.", { gateId, cell });
      const otherGeneratorId = occupiedRails.get(rail);
      if (otherGeneratorId !== void 0) add("generator-rail-overlap", "Two machines cannot share a mounting rail.", { otherGeneratorId, cell });
      else occupiedRails.set(rail, generator.id);
    }
    const bounds = generatorMountBounds(rimAnchor);
    for (const occupied of occupiedBounds) {
      if (intersects(bounds, occupied.bounds)) {
        add("generator-body-overlap", "Machine body envelopes overlap even if their directed rails differ.", { otherGeneratorId: occupied.generatorId });
      }
    }
    occupiedBounds.push({ generatorId: generator.id, bounds });
  }
  return issues;
};

// src/core/mechanismRules.ts
var ACTIVE_MECHANISM_PROFILE = "revised-2026-09-27-v1.5";
var usesRevisedMechanisms = (value) => value.mechanismRules === "revised-2026-09-21" || value.mechanismRules === "revised-2026-09-21-v1.1" || value.mechanismRules === "revised-2026-09-21-v1.2" || value.mechanismRules === "revised-2026-09-23-v1.3" || value.mechanismRules === "revised-2026-09-23-v1.4" || value.mechanismRules === ACTIVE_MECHANISM_PROFILE;

// src/core/shutterCoverage.ts
var isOrdinaryShutter = (shutter) => shutter.count > 0 && (shutter.skin === void 0 || shutter.skin === "shutter");
var cellKey = (x, y) => `${x},${y}`;
var blockCells = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
var playableKeys = (level) => {
  if (level.playable?.length) return new Set(level.playable.map(([x, y]) => cellKey(x, y)));
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => cellKey(x, y)));
  const result = /* @__PURE__ */ new Set();
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (!blocked.has(cellKey(x, y))) result.add(cellKey(x, y));
    }
  }
  return result;
};
var auditOrdinaryShutterCoverage = (level) => {
  const issues = [];
  const playable = playableKeys(level);
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const ordinary = (level.shutters ?? []).filter(isOrdinaryShutter);
  const closedIds = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  const openingBlocks = level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closedIds.has(block.shutterId)));
  for (const shutter of ordinary) {
    const cover = /* @__PURE__ */ new Set();
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        const key = cellKey(x, y);
        cover.add(key);
        if (!playable.has(key)) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "cover-cell-outside-board",
            cell: [x, y]
          });
        }
      }
    }
    const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
    if (!hidden.length) {
      issues.push({ levelId: level.id, shutterId: shutter.id, kind: "missing-hidden-cohort" });
    }
    const hiddenOccupants = /* @__PURE__ */ new Map();
    for (const block of hidden) {
      for (const [x, y] of blockCells(block)) {
        const key = cellKey(x, y);
        if (!cover.has(key)) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "hidden-cell-outside-cover",
            cell: [x, y],
            blockId: block.id
          });
        }
        const otherBlockId = hiddenOccupants.get(key);
        if (otherBlockId && otherBlockId !== block.id) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "hidden-cell-overlap",
            cell: [x, y],
            blockId: block.id,
            otherBlockId
          });
        } else hiddenOccupants.set(key, block.id);
      }
    }
    for (const block of openingBlocks) {
      for (const [x, y] of blockCells(block)) {
        if (!cover.has(cellKey(x, y))) continue;
        issues.push({
          levelId: level.id,
          shutterId: shutter.id,
          kind: "opening-cell-covered",
          cell: [x, y],
          blockId: block.id
        });
      }
    }
  }
  return issues;
};

// src/core/types.ts
var shutterHasPhysicalFootprint = (shutter) => shutter.count > 0 && shutter.skin !== "staging" && shutter.skin !== "lift" && shutter.skin !== "staged-frame";

// src/core/revisedMechanismContract.ts
var keyOf2 = ([x, y]) => `${x},${y}`;
var validRectangle = (region) => [region.x, region.y, region.width, region.height].every(Number.isInteger) && region.width > 0 && region.height > 0;
var regionContains = (region, [x, y]) => x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
var auditRevisedMechanismContract = (level) => {
  if (!usesRevisedMechanisms(level)) return [];
  const issues = [];
  const add = (code, message, details = {}) => {
    issues.push({ levelId: level.id, code, message, ...details });
  };
  const blocks = new Map(level.blocks.map((block) => [block.id, block]));
  const playable = level.playable ? new Set(level.playable.map(keyOf2)) : void 0;
  const blocked = new Set((level.blocked ?? []).map(keyOf2));
  const isPlayable = ([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < level.width && y >= 0 && y < level.height && (!playable || playable.has(keyOf2([x, y]))) && !blocked.has(keyOf2([x, y]));
  for (const elevator of level.elevators ?? []) {
    add("legacy-moving-elevator", "Revised lifts reveal a fixed region; moving platform elevators are not approved.", { elevatorId: elevator.id });
  }
  for (const conveyor of level.conveyors ?? []) {
    add("legacy-conveyor", "Legacy conveyors have no approved revised-mechanism mapping.", { conveyorId: conveyor.id });
  }
  for (const block of level.blocks) if (block.rotationBadge) {
    add("legacy-rotation-badge", "Rotation metadata is not a revised axis-movement mechanism.", { blockId: block.id });
  }
  if (level.coloredGrids?.length) {
    for (const block of level.blocks) if ((block.layers?.length ?? 1) > 1) {
      add("colored-grid-shell", "A colored-grid level cannot contain a shell, including hidden or queued blocks.", { blockId: block.id });
    }
  }
  for (const generator of level.generators ?? []) {
    if (generator.trigger === "time") {
      add("timed-generator", "Revised generators release from vacant footprints, not wall-clock time.", { generatorId: generator.id });
    }
    if (generator.intervalSeconds !== void 0 || generator.initialDelaySeconds !== void 0) {
      add("generator-clock-metadata", "Revised generators have no timed interval or initial delay.", { generatorId: generator.id });
    }
    for (const blockId of generator.queueBlockIds) {
      const block = blocks.get(blockId);
      if (!block) {
        add("missing-queued-block", "Generator queue references a missing block.", { generatorId: generator.id, blockId });
        continue;
      }
      if ((block.frozen ?? 0) > 0) add("queued-ice", "Generator cargo cannot carry numeric ice.", { generatorId: generator.id, blockId });
      const placement = validateGeneratorMouthSpawn(generator, generator.spawn, block.shape, level);
      if (placement.status !== "ok") {
        add("generator-mouth-footprint", placement.reason, { generatorId: generator.id, blockId });
      }
    }
  }
  for (const mountIssue of auditGeneratorMounts(level)) issues.push({ levelId: level.id, ...mountIssue });
  const validRegions = [];
  for (const shutter of level.shutters ?? []) {
    if (shutter.skin === "staging" || shutter.skin === "staged-frame") {
      add("legacy-nonspatial-staging", "Non-spatial staging and staged-frame releases are not revised mechanisms.", { shutterId: shutter.id });
    }
    if (shutter.skin === "generator") {
      add("legacy-generator-shutter", "A countdown-covered generator skin is not a fixed-mouth queue generator.", { shutterId: shutter.id });
    }
    if ((shutter.skin === void 0 || shutter.skin === "shutter") && shutter.triggerBlockIds !== void 0) {
      add("shutter-trigger-cohort", "Revised ordinary shutters count all clears and peels, not a named removal cohort.", { shutterId: shutter.id });
    }
    if (!validRectangle(shutter)) {
      add("region-geometry", "Mechanism regions require integer coordinates and positive integer dimensions.", { shutterId: shutter.id });
      continue;
    }
    validRegions.push(shutter);
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        if (!isPlayable([x, y])) add("region-outside-playable", "Mechanism region includes a wall or non-playable cell.", { shutterId: shutter.id, cell: [x, y] });
      }
    }
    if (shutter.skin !== "lift") continue;
    if (shutter.triggerBlockIds !== void 0) {
      add("lift-trigger-cohort", "A revised lift waits for its occupied region to clear, not a named removal cohort.", { shutterId: shutter.id });
    }
    const occupied = /* @__PURE__ */ new Map();
    for (const block of level.blocks.filter((piece) => piece.shutterId === shutter.id)) {
      for (const [dx, dy] of block.shape) {
        const cell = [block.x + dx, block.y + dy];
        if (!regionContains(shutter, cell)) {
          add("lift-hidden-outside-region", "Every hidden lift cell must lie inside its fixed region.", { shutterId: shutter.id, blockId: block.id, cell });
        }
        if (!isPlayable(cell)) {
          add("lift-hidden-outside-playable", "Hidden lift cargo must have a fully playable footprint.", { shutterId: shutter.id, blockId: block.id, cell });
        }
        const key = keyOf2(cell);
        const previous = occupied.get(key);
        if (previous !== void 0) {
          add("lift-hidden-overlap", `Hidden lift cohort overlaps ${previous} at ${key}.`, { shutterId: shutter.id, blockId: block.id, cell });
        } else occupied.set(key, block.id);
      }
    }
  }
  const validRegionIds = new Set(validRegions.map(({ id }) => id));
  for (const coverage of auditOrdinaryShutterCoverage({
    ...level,
    shutters: (level.shutters ?? []).filter((shutter) => validRegionIds.has(shutter.id))
  })) {
    if (coverage.kind === "missing-hidden-cohort") continue;
    add(`shutter-${coverage.kind}`, `Ordinary shutter coverage: ${coverage.kind}.`, {
      shutterId: coverage.shutterId,
      blockId: coverage.blockId,
      cell: coverage.cell
    });
  }
  const physical = validRegions.filter(shutterHasPhysicalFootprint);
  for (let index = 0; index < physical.length; index += 1) {
    const left = physical[index];
    for (const right of physical.slice(index + 1)) {
      const x = Math.max(left.x, right.x);
      const y = Math.max(left.y, right.y);
      if (x < Math.min(left.x + left.width, right.x + right.width) && y < Math.min(left.y + left.height, right.y + right.height)) {
        add("physical-shutter-overlap", "Closed physical shutters cannot overlap.", {
          shutterId: left.id,
          otherShutterId: right.id,
          cell: [x, y]
        });
      }
    }
  }
  return issues;
};
var assertRevisedMechanismContract = (level) => {
  const issues = auditRevisedMechanismContract(level);
  if (!issues.length) return;
  const first = issues[0];
  const owner = first.generatorId ?? first.shutterId ?? first.blockId ?? first.elevatorId ?? first.conveyorId;
  throw new Error(`Level ${level.id}: revised mechanism ${first.code}${owner ? ` (${owner})` : ""}: ${first.message}`);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertRevisedMechanismContract,
  auditRevisedMechanismContract
});
