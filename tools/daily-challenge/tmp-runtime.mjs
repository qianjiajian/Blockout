// src/core/types.ts
var MAX_BLOCK_LAYERS = 2;
var shutterHasPhysicalFootprint = (shutter) => shutter.count > 0 && shutter.skin !== "staging" && shutter.skin !== "lift" && shutter.skin !== "staged-frame";

// src/core/boardSeams.ts
var inSpan = (value, seam) => value >= seam.start && value < seam.start + seam.size;
var boardRailIsSeam = (board, [x, y], side) => (board.seams ?? []).some((seam) => {
  if (seam.orientation === "horizontal") {
    if (!inSpan(x, seam)) return false;
    return side === "bottom" && y === seam.offset - 1 || side === "top" && y === seam.offset;
  }
  if (!inSpan(y, seam)) return false;
  return side === "right" && x === seam.offset - 1 || side === "left" && x === seam.offset;
});
var boardCellsSeparatedBySeam = (board, [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const side = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "bottom" : "top";
  return boardRailIsSeam(board, [ax, ay], side);
};
var footprintCrossesBoardSeam = (board, cells) => {
  if (!board.seams?.length || cells.length < 2) return false;
  const occupied = new Set(cells.map(([x, y]) => `${x},${y}`));
  return cells.some(([x, y]) => occupied.has(`${x + 1},${y}`) && boardRailIsSeam(board, [x, y], "right") || occupied.has(`${x},${y + 1}`) && boardRailIsSeam(board, [x, y], "bottom"));
};
var translationCrossesBoardSeam = (board, cells, dx, dy) => {
  if (!board.seams?.length) return false;
  if (!Number.isInteger(dx) || !Number.isInteger(dy)) return true;
  let remainingX = dx;
  let remainingY = dy;
  let current = cells.map(([x, y]) => [x, y]);
  while (remainingX !== 0 || remainingY !== 0) {
    const stepX = Math.sign(remainingX);
    const stepY = Math.sign(remainingY);
    if (stepX !== 0) {
      const side = stepX > 0 ? "right" : "left";
      if (current.some((cell) => boardRailIsSeam(board, cell, side))) return true;
    }
    if (stepY !== 0) {
      const side = stepY > 0 ? "bottom" : "top";
      if (current.some(([x, y]) => boardRailIsSeam(board, [x, y], side) || boardRailIsSeam(board, [x + stepX, y], side))) return true;
    }
    current = current.map(([x, y]) => [x + stepX, y + stepY]);
    remainingX -= stepX;
    remainingY -= stepY;
  }
  return false;
};
var cloneBoardSeams = (seams) => seams?.map((seam) => ({ ...seam })) ?? [];
var validateBoardSeams = (level) => {
  if (level.seams !== void 0 && !Array.isArray(level.seams)) {
    throw new Error(`Level ${level.id}: board seams must be an array`);
  }
  const occupiedRails = /* @__PURE__ */ new Set();
  for (let index = 0; index < (level.seams?.length ?? 0); index += 1) {
    const seam = level.seams[index];
    const label = `Level ${level.id}: board seam ${index}`;
    if (!seam || seam.orientation !== "horizontal" && seam.orientation !== "vertical") {
      throw new Error(`${label} has invalid orientation ${String(seam?.orientation)}`);
    }
    if (![seam.offset, seam.start, seam.size].every(Number.isInteger) || seam.size <= 0) {
      throw new Error(`${label} needs integer offset/start and positive integer size`);
    }
    const normalLimit = seam.orientation === "horizontal" ? level.height : level.width;
    const tangentLimit = seam.orientation === "horizontal" ? level.width : level.height;
    if (seam.offset <= 0 || seam.offset >= normalLimit || seam.start < 0 || seam.start + seam.size > tangentLimit) {
      throw new Error(`${label} is out of bounds`);
    }
    for (let tangent = seam.start; tangent < seam.start + seam.size; tangent += 1) {
      const rail = `${seam.orientation}:${seam.offset}:${tangent}`;
      if (occupiedRails.has(rail)) throw new Error(`${label} overlaps another board seam at ${rail}`);
      occupiedRails.add(rail);
    }
  }
};

// src/core/gatePortals.ts
var outwardVector = (side) => side === "top" ? [0, -1] : side === "right" ? [1, 0] : side === "bottom" ? [0, 1] : [-1, 0];
var portalTangentOffset = (portal) => portal.side === "top" || portal.side === "bottom" ? portal.origin[0] : portal.origin[1];
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
var portalOutwardCells = (portal) => {
  const [dx, dy] = outwardVector(portal.side);
  return portalMouthCells(portal).map(([x, y]) => [x + dx, y + dy]);
};
var directedRailKey = ([x, y], side) => `${x},${y}:${side}`;
var portalBoundaryAnchor = (portal) => {
  const half = portal.size / 2;
  const [x, y] = portal.origin;
  if (portal.side === "top") return [x + half, y];
  if (portal.side === "bottom") return [x + half, y + 1];
  if (portal.side === "left") return [x, y + half];
  return [x + 1, y + half];
};
var buildPlayableCells = (board) => {
  const result = board.playable ? new Set(board.playable.map(([x, y]) => `${x},${y}`)) : /* @__PURE__ */ new Set();
  if (!board.playable) {
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) result.add(`${x},${y}`);
    }
  }
  for (const [x, y] of board.blocked ?? []) result.delete(`${x},${y}`);
  return result;
};
var playableCellsCache = /* @__PURE__ */ new WeakMap();
var cachedPlayableCells = (board) => {
  const cacheKey = board;
  const cached = playableCellsCache.get(cacheKey);
  if (cached) return cached;
  const cells = buildPlayableCells(board);
  playableCellsCache.set(cacheKey, cells);
  return cells;
};
var frontierFacesExposedBoundary = (board, frontier, side) => {
  if (!frontier.length) return false;
  const playable = cachedPlayableCells(board);
  const [dx, dy] = outwardVector(side);
  return frontier.every(([x, y]) => boardRailIsSeam(board, [x, y], side) || !playable.has(`${x + dx},${y + dy}`));
};
var portalCoversFrontier = (frontier, portal) => {
  if (!frontier.length) return false;
  const tangentStart = portalTangentOffset(portal);
  const tangentEnd = tangentStart + portal.size;
  const normal = portal.side === "top" || portal.side === "bottom" ? portal.origin[1] : portal.origin[0];
  return frontier.every(([x, y]) => {
    const cellNormal = portal.side === "top" || portal.side === "bottom" ? y : x;
    const tangent = portal.side === "top" || portal.side === "bottom" ? x : y;
    return cellNormal === normal && tangent >= tangentStart && tangent < tangentEnd;
  });
};
var validateGatePortalGeometry = (level, gate, owner, occupiedRails) => {
  const label = `${owner.gateKind} ${owner.gateId}`;
  if (gate.portals !== void 0 && !Array.isArray(gate.portals)) {
    throw new Error(`Level ${level.id}: ${label} portals must be an array`);
  }
  if (gate.portals && gate.portals.length === 0) {
    throw new Error(`Level ${level.id}: ${label} portals cannot be empty`);
  }
  const portals = gate.portals?.length ? gate.portals : [legacyOuterPortal(level, gate)];
  for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
    const portal = portals[portalIndex];
    if (!portal || !(portal.side === "top" || portal.side === "right" || portal.side === "bottom" || portal.side === "left")) {
      throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} has invalid side ${String(portal?.side)}`);
    }
    if (!Array.isArray(portal.origin) || portal.origin.length !== 2 || !portal.origin.every(Number.isInteger) || !Number.isInteger(portal.size) || portal.size <= 0) {
      throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} needs an integer origin and positive integer size`);
    }
  }
  if (gate.portals) {
    const first = gate.portals[0];
    if (gate.side !== first.side || gate.offset !== portalTangentOffset(first) || gate.size !== first.size) {
      throw new Error(`Level ${level.id}: ${label} side/offset/size must mirror portal 0`);
    }
  }
  const playable = buildPlayableCells(level);
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
  for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
    const portal = portals[portalIndex];
    const mouth = portalMouthCells(portal);
    const outward = portalOutwardCells(portal);
    for (let index = 0; index < mouth.length; index += 1) {
      const [x, y] = mouth[index];
      const mouthKey = `${x},${y}`;
      if (x < 0 || y < 0 || x >= level.width || y >= level.height || !playable.has(mouthKey) || blocked.has(mouthKey)) {
        throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} has invalid mouth cell ${mouthKey}`);
      }
      const [outX, outY] = outward[index];
      if (playable.has(`${outX},${outY}`) && !boardRailIsSeam(level, [x, y], portal.side)) {
        throw new Error(`Level ${level.id}: ${label} portal ${portalIndex} rail ${directedRailKey([x, y], portal.side)} points into playable cell ${outX},${outY}`);
      }
      const rail = directedRailKey([x, y], portal.side);
      if (occupiedRails.has(rail)) {
        const tangent = portal.side === "top" || portal.side === "bottom" ? x : y;
        throw new Error(`Level ${level.id}: ${label} overlaps another ${portal.side} exit at ${tangent} (directed rail ${rail})`);
      }
      occupiedRails.add(rail);
    }
  }
};

// src/core/blockExitFrontier.ts
var directionalCoordinate = ([x, y], side) => side === "top" || side === "bottom" ? y : x;
var isForwardOf = (candidate, current, side) => side === "top" || side === "left" ? candidate < current : candidate > current;
var exitFrontierCells = (cells, side) => {
  if (!cells.length) return [];
  let frontierCoordinate = directionalCoordinate(cells[0], side);
  for (let index = 1; index < cells.length; index += 1) {
    const coordinate = directionalCoordinate(cells[index], side);
    if (isForwardOf(coordinate, frontierCoordinate, side)) frontierCoordinate = coordinate;
  }
  return cells.filter((cell) => directionalCoordinate(cell, side) === frontierCoordinate).map(([x, y]) => [x, y]);
};
var portalCoversPassingWidth = (cells, portal) => {
  const start = portalTangentOffset(portal);
  const end = start + portal.size;
  return cells.length > 0 && cells.every(([x, y]) => {
    const tangent = portal.side === "top" || portal.side === "bottom" ? x : y;
    return tangent >= start && tangent < end;
  });
};
var matchingPortalForExitFrontier = (board, cells, gate, requestedSide) => {
  if (requestedSide && !gate.portals?.length && gate.side !== requestedSide) return void 0;
  const frontierBySide = /* @__PURE__ */ new Map();
  const portals = gatePortals(board, gate);
  for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
    const portal = portals[portalIndex];
    if (requestedSide && portal.side !== requestedSide) continue;
    const frontier = frontierBySide.get(portal.side) ?? exitFrontierCells(cells, portal.side);
    frontierBySide.set(portal.side, frontier);
    if (portalCoversFrontier(frontier, portal) && portalCoversPassingWidth(cells, portal) && frontierFacesExposedBoundary(board, frontier, portal.side)) {
      return { portalIndex, portal };
    }
  }
  return void 0;
};
var resolveMatchingGatePortal = (board, cells, side, gates, flipDoors = []) => {
  const frontier = exitFrontierCells(cells, side);
  const hasLocalPortals = gates.some((gate) => Boolean(gate.portals?.length)) || flipDoors.some((gate) => Boolean(gate.portals?.length));
  const reachesBoundary = hasLocalPortals ? frontierFacesExposedBoundary(board, frontier, side) : frontier.every(([x, y]) => side === "top" ? y === 0 : side === "bottom" ? y === board.height - 1 : side === "left" ? x === 0 : x === board.width - 1);
  if (!reachesBoundary) return void 0;
  const matchGate = (gate) => {
    if (!gate.portals?.length) {
      if (gate.side !== side) return void 0;
      const tangentStart = gate.offset;
      const tangentEnd = tangentStart + gate.size;
      const normal = side === "top" ? 0 : side === "bottom" ? board.height - 1 : side === "left" ? 0 : board.width - 1;
      const covered = frontier.every(([x, y]) => {
        const cellNormal = side === "top" || side === "bottom" ? y : x;
        const tangent = side === "top" || side === "bottom" ? x : y;
        return cellNormal === normal && tangent >= tangentStart && tangent < tangentEnd;
      });
      const portal = legacyOuterPortal(board, gate);
      return covered && portalCoversPassingWidth(cells, portal) ? { portalIndex: 0, portal } : void 0;
    }
    const portals = gatePortals(board, gate);
    for (let portalIndex = 0; portalIndex < portals.length; portalIndex += 1) {
      const portal = portals[portalIndex];
      if (portal.side === side && portalCoversFrontier(frontier, portal) && portalCoversPassingWidth(cells, portal)) return { portalIndex, portal };
    }
    return void 0;
  };
  for (const gate of gates) {
    const match = matchGate(gate);
    if (match) {
      return { gate, gateId: gate.id, gateKind: "fixed", ...match };
    }
  }
  for (const gate of flipDoors) {
    const match = matchGate(gate);
    if (match) {
      return { gate, gateId: gate.id, gateKind: "flipDoor", ...match };
    }
  }
  return void 0;
};
var exitFrontierFacesBoundary = (board, cells, side) => frontierFacesExposedBoundary(board, exitFrontierCells(cells, side), side);

// src/core/blockShape.ts
var pointKey = ([x, y]) => `${x},${y}`;
var classifyIceEligibleShape = (shape) => {
  if (!shape.length) return void 0;
  const cells = /* @__PURE__ */ new Set();
  for (const point of shape) {
    const [x, y] = point;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isInteger(x) || !Number.isInteger(y)) {
      return void 0;
    }
    const key = pointKey(point);
    if (cells.has(key)) return void 0;
    cells.add(key);
  }
  const visited = /* @__PURE__ */ new Set();
  const queue = [shape[0]];
  visited.add(pointKey(shape[0]));
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbor = `${x + dx},${y + dy}`;
      if (!cells.has(neighbor) || visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push([x + dx, y + dy]);
    }
  }
  if (visited.size !== cells.size) return void 0;
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (width * height === cells.size) return width === 1 || height === 1 ? "bar" : "rectangle";
  return "irregular";
};
var isIceEligibleBlockShape = (shape) => classifyIceEligibleShape(shape) !== void 0;

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
var pointKey2 = ([x, y]) => `${x},${y}`;
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
  if (new Set(shape.map(pointKey2)).size !== shape.length) {
    return { status: "invalid", reason: "Shape cell offsets must be unique." };
  }
  const template = resolveGeneratorMouthTemplate(generator, board);
  if (template.status === "invalid") return template;
  const { status: _templateStatus, ...geometry } = template;
  const footprint = shape.map(([dx, dy]) => [spawn[0] + dx, spawn[1] + dy]);
  const centerMouthKey = pointKey2(geometry.mouthCells[1]);
  const touchesCenterMouth = footprint.some((cell) => pointKey2(cell) === centerMouthKey);
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
  const playable = board.playable ? new Set(board.playable.map(pointKey2)) : void 0;
  const blocked = new Set((board.blocked ?? []).map(pointKey2));
  const rejectedCells = footprint.filter(([x, y]) => x < 0 || x >= board.width || y < 0 || y >= board.height || playable !== void 0 && !playable.has(pointKey2([x, y])) || blocked.has(pointKey2([x, y])));
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
var usesExitAnimationCompletion = (value) => value.mechanismRules === "revised-2026-09-23-v1.3" || value.mechanismRules === "revised-2026-09-23-v1.4" || value.mechanismRules === ACTIVE_MECHANISM_PROFILE;
var usesFrozenFlipDoorEligibility = (value) => value.mechanismRules === "revised-2026-09-27-v1.5";

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

// src/core/PuzzleModel.ts
var clonePoints = (points) => points.map(([x, y]) => [x, y]);
var cloneGate = (gate) => ({
  ...gate,
  portals: gate.portals?.map((portal) => ({
    ...portal,
    origin: [...portal.origin]
  }))
});
var rectangularCells = (width, height) => {
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) cells.push([x, y]);
  }
  return cells;
};
var movementAxisAllowsExit = (movementAxis, side) => movementAxis === void 0 || movementAxis === "horizontal" && (side === "left" || side === "right") || movementAxis === "vertical" && (side === "top" || side === "bottom");
var EXIT_SWEEP_EPSILON = 1e-6;
var intervalsOverlap = (start, end, otherStart, otherEnd) => start < otherEnd - EXIT_SWEEP_EPSILON && end > otherStart + EXIT_SWEEP_EPSILON;
var translatedIntervalOverlaps = (start, otherStart, distance, negativeDirection) => {
  const enter = negativeDirection ? start - otherStart - 1 : otherStart - start - 1;
  const leave = negativeDirection ? start + 1 - otherStart : otherStart + 1 - start;
  return Math.max(0, enter) < Math.min(distance, leave) - EXIT_SWEEP_EPSILON;
};
var nextExitAnimationNamespace = 1;
var PuzzleModel = class _PuzzleModel {
  level;
  playable;
  playableKeys;
  blocked;
  blockedKeys;
  seams;
  gates;
  flipDoors;
  coloredGrids;
  blocks;
  queuedBlocks;
  shutters;
  generators;
  elevators;
  conveyors;
  cleared = 0;
  moves = 0;
  remainingSeconds;
  timeFreezeSeconds = 0;
  started = false;
  autonomousStarted = false;
  complete = false;
  failed = false;
  history = [];
  pendingHistory;
  /** Only explicit player mutations make an action undoable/count as a move. */
  pendingActionMutated = false;
  /** Generator release checks run once, after a spatial player action commits. */
  pendingGeneratorCheck = false;
  /** Actual enabled bomb time spent inside the current player transaction. */
  pendingBombElapsed = /* @__PURE__ */ new Map();
  /** Unfrozen countdown time inside the current action, preserved on cancellation. */
  pendingWallSeconds = 0;
  exitAnimationNamespace = nextExitAnimationNamespace++;
  nextExitAnimationSequence = 1;
  pendingExitAnimations = /* @__PURE__ */ new Set();
  pendingExitFlipDoorIds = /* @__PURE__ */ new Map();
  options;
  get revisedRules() {
    return usesRevisedMechanisms(this.level);
  }
  constructor(level, options = {}) {
    validateLevel(level);
    this.level = level;
    this.options = { ...options };
    this.playable = clonePoints(level.playable ?? rectangularCells(level.width, level.height));
    this.playableKeys = new Set(this.playable.map(([x, y]) => `${x},${y}`));
    this.blocked = clonePoints(level.blocked ?? []);
    this.blockedKeys = new Set(this.blocked.map(([x, y]) => `${x},${y}`));
    this.seams = cloneBoardSeams(level.seams);
    this.gates = level.gates.map((gate) => ({ ...cloneGate(gate), frozen: gate.frozen ?? 0 }));
    this.flipDoors = (level.flipDoors ?? []).map((door) => ({
      ...cloneGate(door),
      frozen: door.frozen ?? 0,
      open: door.initiallyOpen
    }));
    this.coloredGrids = (level.coloredGrids ?? []).map((grid) => ({
      ...grid,
      cells: clonePoints(grid.cells)
    }));
    const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
    const hydratedBlocks = level.blocks.map((block) => ({
      ...block,
      shape: clonePoints(block.shape),
      layers: block.layers ? [...block.layers] : [block.color],
      frozen: block.frozen ?? 0
    }));
    this.blocks = hydratedBlocks.filter((block) => !queuedIds.has(block.id));
    this.queuedBlocks = hydratedBlocks.filter((block) => queuedIds.has(block.id));
    this.shutters = (level.shutters ?? []).map((shutter) => ({
      ...shutter,
      triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : void 0,
      ...this.revisedRules ? { revealed: false } : {}
    }));
    this.generators = (level.generators ?? []).map((generator) => ({
      ...generator,
      spawn: [...generator.spawn],
      queueBlockIds: [...generator.queueBlockIds],
      head: 0,
      remaining: generator.queueBlockIds.length,
      nextBlockId: generator.queueBlockIds[0],
      elapsed: 0
    }));
    this.elevators = (level.elevators ?? []).map((elevator) => ({
      ...elevator,
      x: elevator.fromX,
      y: elevator.fromY,
      direction: 1,
      elapsed: 0
    }));
    this.conveyors = (level.conveyors ?? []).map((conveyor) => ({ ...conveyor }));
    this.remainingSeconds = level.timeSeconds;
    if (this.revisedRules) this.settleRevisedSpace();
  }
  snapshot() {
    return {
      ...this.revisedRules ? { mechanismRules: this.level.mechanismRules } : {},
      levelId: this.level.id,
      width: this.level.width,
      height: this.level.height,
      playable: clonePoints(this.playable),
      blocked: clonePoints(this.blocked),
      seams: cloneBoardSeams(this.seams),
      gates: this.gates.map(cloneGate),
      flipDoors: this.flipDoors.map(cloneGate),
      ...this.pendingExitAnimations.size ? { pendingExitAnimations: [...this.pendingExitAnimations] } : {},
      ...this.pendingExitFlipDoorIds.size ? {
        pendingExitFlipDoorIds: Object.fromEntries([...this.pendingExitFlipDoorIds].map(([id, doors]) => [id, [...doors]]))
      } : {},
      coloredGrids: this.coloredGrids.map((grid) => ({ ...grid, cells: clonePoints(grid.cells) })),
      blocks: this.blocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] })),
      queuedBlocks: this.queuedBlocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] })),
      shutters: this.shutters.map((shutter) => ({
        ...shutter,
        triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : void 0
      })),
      generators: this.generators.map((generator) => ({
        ...generator,
        spawn: [...generator.spawn],
        queueBlockIds: [...generator.queueBlockIds]
      })),
      elevators: this.elevators.map((elevator) => ({ ...elevator })),
      conveyors: this.conveyors.map((conveyor) => ({ ...conveyor })),
      cleared: this.cleared,
      moves: this.moves,
      remainingSeconds: this.remainingSeconds,
      timeFreezeSeconds: this.timeFreezeSeconds,
      started: this.started,
      autonomousStarted: this.autonomousStarted,
      complete: this.complete,
      failed: this.failed
    };
  }
  clone() {
    const copy = new _PuzzleModel(this.level, this.options);
    copy.restore(this.snapshot());
    return copy;
  }
  restore(snapshot) {
    this.playable = clonePoints(snapshot.playable);
    this.playableKeys = new Set(this.playable.map(([x, y]) => `${x},${y}`));
    this.blocked = clonePoints(snapshot.blocked);
    this.blockedKeys = new Set(this.blocked.map(([x, y]) => `${x},${y}`));
    this.seams = cloneBoardSeams(snapshot.seams);
    this.gates = snapshot.gates.map(cloneGate);
    this.flipDoors = snapshot.flipDoors.map(cloneGate);
    const needsEligibility = usesFrozenFlipDoorEligibility(this.level);
    this.pendingExitAnimations = new Set((snapshot.pendingExitAnimations ?? []).filter((id) => !needsEligibility || Array.isArray(snapshot.pendingExitFlipDoorIds?.[id])));
    this.pendingExitFlipDoorIds = new Map(needsEligibility ? [...this.pendingExitAnimations].map((id) => [id, [...snapshot.pendingExitFlipDoorIds[id]]]) : []);
    this.coloredGrids = snapshot.coloredGrids.map((grid) => ({
      ...grid,
      cells: clonePoints(grid.cells)
    }));
    this.blocks = snapshot.blocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] }));
    this.queuedBlocks = snapshot.queuedBlocks.map((block) => ({ ...block, shape: clonePoints(block.shape), layers: [...block.layers] }));
    this.shutters = snapshot.shutters.map((shutter) => ({
      ...shutter,
      triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : void 0
    }));
    this.generators = snapshot.generators.map((generator) => ({
      ...generator,
      spawn: [...generator.spawn],
      queueBlockIds: [...generator.queueBlockIds]
    }));
    this.elevators = snapshot.elevators.map((elevator) => ({ ...elevator }));
    this.conveyors = snapshot.conveyors.map((conveyor) => ({ ...conveyor }));
    this.cleared = snapshot.cleared;
    this.moves = snapshot.moves;
    this.remainingSeconds = snapshot.remainingSeconds;
    this.timeFreezeSeconds = snapshot.complete || snapshot.failed ? 0 : snapshot.timeFreezeSeconds ?? 0;
    this.started = snapshot.started;
    this.autonomousStarted = snapshot.autonomousStarted;
    this.complete = snapshot.complete;
    this.failed = snapshot.failed;
  }
  beginAction() {
    if (this.revisedRules && (this.complete || this.failed)) return;
    if (!this.pendingHistory) {
      this.pendingHistory = this.snapshot();
      this.pendingActionMutated = false;
      this.pendingBombElapsed.clear();
      this.pendingWallSeconds = 0;
    }
  }
  commitAction(countMove = true) {
    if (!this.pendingHistory) return false;
    const changed = this.pendingActionMutated;
    if (changed) {
      if (this.pendingGeneratorCheck && !this.revisedRules) this.releaseOneFromEachReadyGenerator();
      this.history.push(this.pendingHistory);
      if (this.history.length > 20) this.history.shift();
      if (countMove) this.moves += 1;
      this.pendingHistory = void 0;
      this.pendingActionMutated = false;
      this.pendingGeneratorCheck = false;
      this.pendingBombElapsed.clear();
      return true;
    }
    this.pendingHistory = void 0;
    this.pendingActionMutated = false;
    this.pendingGeneratorCheck = false;
    this.pendingBombElapsed.clear();
    return false;
  }
  cancelAction() {
    if (this.pendingHistory && this.pendingActionMutated) {
      const baseline = this.pendingHistory;
      const live = this.snapshot();
      const liveRemainingSeconds = this.remainingSeconds;
      const liveFailed = this.failed;
      this.restore(baseline);
      const liveWorldAdvanced = baseline.started || liveRemainingSeconds < baseline.remainingSeconds || this.pendingWallSeconds > 0 || liveFailed;
      if (liveWorldAdvanced) {
        this.remainingSeconds = Math.max(0, Math.min(
          baseline.remainingSeconds - (this.revisedRules ? this.pendingWallSeconds : 0),
          liveRemainingSeconds
        ));
        this.started = baseline.started || live.started;
        this.autonomousStarted = baseline.autonomousStarted || live.autonomousStarted;
        this.restoreTimedBombProgress(baseline, live);
        this.failed = liveFailed || this.remainingSeconds <= 0 || this.hasFailedBomb();
        this.restoreAutonomousElevatorProgress(baseline, live);
        if (this.failed) {
          this.discardPendingExitAnimations();
          this.clearTimeFreeze();
        }
      }
    }
    this.pendingHistory = void 0;
    this.pendingActionMutated = false;
    this.pendingGeneratorCheck = false;
    this.pendingBombElapsed.clear();
  }
  undo() {
    const previous = this.history.pop();
    if (!previous) return false;
    this.restore(previous);
    this.pendingHistory = void 0;
    this.pendingActionMutated = false;
    this.pendingGeneratorCheck = false;
    this.pendingBombElapsed.clear();
    return true;
  }
  markActionMutated() {
    if (this.pendingHistory) this.pendingActionMutated = true;
  }
  markSpatialActionMutated() {
    this.markActionMutated();
    if (this.revisedRules) this.settleRevisedSpace();
    else if (this.pendingHistory) this.pendingGeneratorCheck = true;
  }
  restoreAutonomousElevatorProgress(baseline, live) {
    for (const elevator of this.elevators) {
      const baselineElevator = baseline.elevators.find((candidate) => candidate.id === elevator.id);
      const liveElevator = live.elevators.find((candidate) => candidate.id === elevator.id);
      if (!baselineElevator || !liveElevator) continue;
      const block = this.getBlock(elevator.blockId);
      const baselineBlock = baseline.blocks.find((candidate) => candidate.id === elevator.blockId);
      const carriedAtStart = Boolean(block && baselineBlock && baselineBlock.x === baselineElevator.x && baselineBlock.y === baselineElevator.y);
      if (carriedAtStart && block && baselineBlock) {
        const targetX = baselineBlock.x + liveElevator.x - baselineElevator.x;
        const targetY = baselineBlock.y + liveElevator.y - baselineElevator.y;
        if (this.canTranslate(block, targetX, targetY)) {
          block.x = targetX;
          block.y = targetY;
        }
      }
      Object.assign(elevator, liveElevator);
    }
  }
  /** Cancelling a held gesture must not rewind any visible bomb clock. */
  restoreTimedBombProgress(baseline, live) {
    if (this.revisedRules) {
      for (const block of [...this.blocks, ...this.queuedBlocks]) {
        if (block.timedBombSeconds === void 0) continue;
        const spent = this.blocks.includes(block) && this.isBlockActive(block) ? this.pendingWallSeconds : this.pendingBombElapsed.get(block.id) ?? 0;
        block.timedBombSeconds = Math.max(0, block.timedBombSeconds - spent);
      }
      return;
    }
    const liveBombs = new Map(live.blocks.map((block) => [block.id, block.timedBombSeconds]));
    const elapsed = Math.max(0, baseline.remainingSeconds - live.remainingSeconds);
    for (const block of this.blocks) {
      const liveSeconds = liveBombs.get(block.id);
      if (block.timedBombSeconds === void 0) continue;
      block.timedBombSeconds = Math.min(
        block.timedBombSeconds,
        liveSeconds ?? Math.max(0, block.timedBombSeconds - elapsed)
      );
    }
  }
  start() {
    if (!this.complete && !this.failed) {
      this.started = true;
      this.autonomousStarted = true;
    }
  }
  startCountdown() {
    if (!this.complete && !this.failed) this.started = true;
  }
  tick(deltaSeconds, held) {
    if (!this.started || this.complete || this.failed || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return false;
    const frozenSeconds = Math.min(this.timeFreezeSeconds, deltaSeconds);
    const countdownSeconds = deltaSeconds - frozenSeconds;
    this.consumeTimeFreeze(frozenSeconds);
    if (this.pendingHistory) this.pendingWallSeconds += countdownSeconds;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - countdownSeconds);
    for (const block of this.blocks) {
      if (block.timedBombSeconds === void 0 || this.revisedRules && !this.isBlockActive(block)) continue;
      if (this.pendingHistory && this.revisedRules) {
        this.pendingBombElapsed.set(block.id, (this.pendingBombElapsed.get(block.id) ?? 0) + Math.min(countdownSeconds, block.timedBombSeconds));
      }
      block.timedBombSeconds = Math.max(0, block.timedBombSeconds - countdownSeconds);
    }
    if (this.revisedRules && (this.remainingSeconds <= 0 || this.hasFailedBomb())) {
      this.failed = true;
      this.discardPendingExitAnimations();
      this.clearTimeFreeze();
      return false;
    }
    const elevatorChanged = this.autonomousStarted && this.advanceElevators(deltaSeconds, held);
    const feederChanged = this.autonomousStarted && this.advanceTimedGenerators(deltaSeconds, held);
    const spatialChanged = elevatorChanged || feederChanged;
    if (this.remainingSeconds <= 0 || this.hasFailedBomb()) {
      this.failed = true;
      this.discardPendingExitAnimations();
      this.clearTimeFreeze();
    }
    return spatialChanged;
  }
  /** A time booster is available in legacy and revised levels; it never adds clock time. */
  freezeTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.timeFreezeSeconds > 0 || this.complete || this.failed || this.remainingSeconds <= 0 || this.hasFailedBomb()) return false;
    this.timeFreezeSeconds = seconds;
    this.start();
    this.markActionMutated();
    return true;
  }
  consumeTimeFreeze(seconds) {
    if (seconds <= 0) return;
    this.timeFreezeSeconds = Math.max(0, this.timeFreezeSeconds - seconds);
    for (const snapshot of this.history) {
      snapshot.timeFreezeSeconds = Math.max(0, (snapshot.timeFreezeSeconds ?? 0) - seconds);
    }
    if (this.pendingHistory) {
      this.pendingHistory.timeFreezeSeconds = Math.max(0, (this.pendingHistory.timeFreezeSeconds ?? 0) - seconds);
    }
  }
  clearTimeFreeze() {
    this.timeFreezeSeconds = 0;
    for (const snapshot of this.history) snapshot.timeFreezeSeconds = 0;
    if (this.pendingHistory) this.pendingHistory.timeFreezeSeconds = 0;
  }
  addTime(seconds) {
    const beforeSeconds = this.remainingSeconds;
    const beforeFailed = this.failed;
    this.remainingSeconds = Math.min(this.level.timeSeconds + 120, this.remainingSeconds + seconds);
    this.failed = this.hasFailedBomb();
    if (this.failed) {
      this.discardPendingExitAnimations();
      this.clearTimeFreeze();
    }
    const changed = this.remainingSeconds !== beforeSeconds || this.failed !== beforeFailed;
    if (changed) this.markActionMutated();
    return changed;
  }
  getBlock(id) {
    return this.blocks.find((block) => block.id === id);
  }
  hasFailedBomb() {
    return (this.revisedRules || this.level.bombFailurePolicy === "fail") && this.blocks.some((block) => block.timedBombSeconds !== void 0 && block.timedBombSeconds <= 0 && (!this.revisedRules || this.isBlockActive(block)));
  }
  isBlockVisible(block) {
    if (!block.shutterId) return true;
    const shutter = this.shutters.find((item) => item.id === block.shutterId);
    return !shutter || (this.revisedRules ? shutter.revealed === true : shutter.count <= 0);
  }
  isBlockActive(block) {
    if (block.frozen > 0) return false;
    if (block.lockedBy) return false;
    return this.isBlockVisible(block);
  }
  blockCells(block, x = block.x, y = block.y) {
    return block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  }
  canPlace(block, x, y) {
    if (!this.isBlockActive(block)) return false;
    const activeColor = block.layers[0] ?? block.color;
    const occupied = /* @__PURE__ */ new Set();
    for (const other of this.blocks) {
      if (other.id === block.id) continue;
      if (!this.isBlockVisible(other)) continue;
      for (const [ox, oy] of this.blockCells(other)) occupied.add(`${ox},${oy}`);
    }
    for (const shutter of this.shutters) {
      if (!this.coverOccupiesBoard(shutter)) continue;
      for (let sy = shutter.y; sy < shutter.y + shutter.height; sy += 1) {
        for (let sx = shutter.x; sx < shutter.x + shutter.width; sx += 1) occupied.add(`${sx},${sy}`);
      }
    }
    const cells = this.blockCells(block, x, y);
    return !footprintCrossesBoardSeam(this.level, cells) && cells.every(([cx, cy]) => cx >= 0 && cy >= 0 && cx < this.level.width && cy < this.level.height && this.playableKeys.has(`${cx},${cy}`) && !this.blockedKeys.has(`${cx},${cy}`) && !occupied.has(`${cx},${cy}`) && !this.coloredGrids.some((grid) => grid.color !== activeColor && grid.cells.some(([gx, gy]) => gx === cx && gy === cy)));
  }
  canTranslate(block, targetX, targetY) {
    return !translationCrossesBoardSeam(
      this.level,
      this.blockCells(block),
      targetX - block.x,
      targetY - block.y
    ) && this.canPlace(block, targetX, targetY);
  }
  moveBlock(id, targetX, targetY) {
    if (this.revisedRules && (this.complete || this.failed)) return false;
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return false;
    targetX = Math.round(targetX);
    targetY = Math.round(targetY);
    if (block.x === targetX && block.y === targetY) return false;
    let x = block.x;
    let y = block.y;
    let moved = false;
    for (let step = 0; step < this.level.width + this.level.height + 4; step += 1) {
      const dx = targetX - x;
      const dy = targetY - y;
      if (dx === 0 && dy === 0) break;
      const horizontal = [x + Math.sign(dx), y];
      const vertical = [x, y + Math.sign(dy)];
      const candidates = (Math.abs(dx) >= Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal]).filter(([nx, ny]) => block.movementAxis === "horizontal" ? ny === y : block.movementAxis === "vertical" ? nx === x : true);
      let advanced = false;
      for (const [nx, ny] of candidates) {
        if (nx === x && ny === y || translationCrossesBoardSeam(
          this.level,
          this.blockCells(block, x, y),
          nx - x,
          ny - y
        ) || !this.canPlace(block, nx, ny)) continue;
        x = nx;
        y = ny;
        if (this.revisedRules) {
          block.x = x;
          block.y = y;
          this.settleRevisedSpace();
        }
        moved = true;
        advanced = true;
        break;
      }
      if (!advanced) break;
    }
    if (!moved) return false;
    block.x = x;
    block.y = y;
    this.start();
    this.markSpatialActionMutated();
    return true;
  }
  /** Move exactly one orthogonal grid cell without choosing a route for the player. */
  moveBlockStep(id, targetX, targetY) {
    if (this.revisedRules && (this.complete || this.failed)) return false;
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return false;
    if (!Number.isInteger(targetX) || !Number.isInteger(targetY)) return false;
    if (Math.abs(targetX - block.x) + Math.abs(targetY - block.y) !== 1) return false;
    if (block.movementAxis === "horizontal" && targetY !== block.y) return false;
    if (block.movementAxis === "vertical" && targetX !== block.x) return false;
    if (!this.canTranslate(block, targetX, targetY)) return false;
    block.x = targetX;
    block.y = targetY;
    this.start();
    this.markSpatialActionMutated();
    return true;
  }
  /**
   * Checks the whole rigid piece's continuous departure from the board.
   *
   * Exit matching proves that the frontier and the complete tangent span fit
   * the aperture. It does not prove that the piece can sweep through the
   * aperture without touching another visible piece or a physical cover. Keep
   * this check in the model so pointer, headless, and solver exits share the
   * same collision contract.
   */
  exitPathIsClear(block, side, portal) {
    const negativeDirection = side === "left" || side === "top";
    const normalStart = side === "left" || side === "right" ? block.x : block.y;
    const normalOffsets = block.shape.map(([x, y]) => side === "left" || side === "right" ? x : y);
    const maxOffset = Math.max(...normalOffsets);
    const minOffset = Math.min(...normalOffsets);
    const portalBoundary = side === "left" || side === "top" ? side === "left" ? portal.origin[0] : portal.origin[1] : side === "right" ? portal.origin[0] + 1 : portal.origin[1] + 1;
    const distance = negativeDirection ? normalStart + maxOffset + 1 - portalBoundary : portalBoundary - (normalStart + minOffset);
    if (!(distance > EXIT_SWEEP_EPSILON)) return true;
    const obstacleCells = [];
    for (const other of this.blocks) {
      if (other.id === block.id || !this.isBlockVisible(other)) continue;
      obstacleCells.push(...this.blockCells(other));
    }
    for (const shutter of this.shutters) {
      if (!this.coverOccupiesBoard(shutter)) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
          obstacleCells.push([x, y]);
        }
      }
    }
    const activeColor = block.layers[0] ?? block.color;
    for (const grid of this.coloredGrids) {
      if (grid.color === activeColor) continue;
      obstacleCells.push(...grid.cells);
    }
    for (const [dx, dy] of block.shape) {
      const cellNormal = side === "left" || side === "right" ? block.x + dx : block.y + dy;
      const cellTangent = side === "left" || side === "right" ? block.y + dy : block.x + dx;
      for (const [obstacleX, obstacleY] of obstacleCells) {
        const obstacleNormal = side === "left" || side === "right" ? obstacleX : obstacleY;
        const obstacleTangent = side === "left" || side === "right" ? obstacleY : obstacleX;
        if (!intervalsOverlap(cellTangent, cellTangent + 1, obstacleTangent, obstacleTangent + 1)) {
          continue;
        }
        if (translatedIntervalOverlaps(cellNormal, obstacleNormal, distance, negativeDirection)) {
          return false;
        }
      }
    }
    return true;
  }
  possibleExitSides(block) {
    return ["top", "right", "bottom", "left"].filter((side) => this.exitAttemptStatus(block.id, side) === "ok");
  }
  resolveExitAttempt(block, side) {
    if (!this.isBlockActive(block) || this.revisedRules && (this.complete || this.failed)) return { status: "inactive" };
    const cells = this.blockCells(block);
    if (!exitFrontierFacesBoundary(this.level, cells, side)) return { status: "not-at-edge" };
    if (!movementAxisAllowsExit(block.movementAxis, side)) return { status: "no-gate" };
    const match = resolveMatchingGatePortal(this.level, cells, side, this.gates, this.flipDoors);
    if (!match) return { status: "no-gate" };
    const activeColor = block.layers[0] ?? block.color;
    if (match.gate.color !== activeColor) return { status: "wrong-color", match };
    if (match.gate.frozen > 0) return { status: "frozen-gate", match };
    if (match.gateKind === "flipDoor" && !match.gate.open) {
      return { status: "no-gate", match };
    }
    if (block.star && !match.gate.star) return { status: "star-gate-required", match };
    if (!this.exitPathIsClear(block, side, match.portal)) return { status: "blocked-path", match };
    return { status: "ok", match };
  }
  exitAttemptStatus(id, side) {
    const block = this.getBlock(id);
    if (!block) return "inactive";
    return this.resolveExitAttempt(block, side).status;
  }
  tryExit(id, side) {
    const block = this.getBlock(id);
    if (!block) return { ok: false };
    const resolution = this.resolveExitAttempt(block, side);
    if (resolution.status !== "ok" || !resolution.match) return { ok: false };
    const activeColor = block.layers[0] ?? block.color;
    const resolvedTarget = {
      gateId: resolution.match.gateId,
      portalIndex: resolution.match.portalIndex
    };
    this.start();
    this.markActionMutated();
    const eligibleFlipDoorIds = this.captureFlipDoorEligibility();
    if (block.layers.length > 1) {
      block.layers.shift();
      block.color = block.layers[0];
      if (this.revisedRules) delete block.timedBombSeconds;
      this.cleared += 1;
      if (this.advanceCounters(id, false) && this.pendingHistory) this.pendingGeneratorCheck = true;
      let exitAnimationId2;
      if (this.revisedRules) {
        exitAnimationId2 = this.registerExitCompletion(eligibleFlipDoorIds);
        this.settleRevisedSpace();
      }
      return {
        ok: true,
        blockId: id,
        color: activeColor,
        side,
        ...resolvedTarget,
        ...exitAnimationId2 ? { exitAnimationId: exitAnimationId2 } : {},
        layerRemoved: true,
        complete: false
      };
    }
    this.blocks = this.blocks.filter((item) => item.id !== id);
    this.releaseKey(block.keyId);
    this.cleared += 1;
    this.advanceCounters(id, true);
    const exitAnimationId = this.registerExitCompletion(eligibleFlipDoorIds);
    if (this.revisedRules) this.settleRevisedSpace();
    else if (this.pendingHistory) this.pendingGeneratorCheck = true;
    this.updateComplete();
    return {
      ok: true,
      blockId: id,
      color: activeColor,
      side,
      ...resolvedTarget,
      ...exitAnimationId ? { exitAnimationId } : {},
      complete: this.complete
    };
  }
  removeBlockWithBooster(id) {
    if (this.revisedRules && (this.complete || this.failed)) return { ok: false };
    const block = this.getBlock(id);
    if (!block || !this.isBlockActive(block)) return { ok: false };
    const color = block.layers[0] ?? block.color;
    const eligibleFlipDoorIds = this.captureFlipDoorEligibility();
    this.blocks = this.blocks.filter((item) => item.id !== id);
    this.releaseKey(block.keyId);
    this.cleared += 1;
    this.advanceCounters(id, true);
    const exitAnimationId = this.registerExitCompletion(eligibleFlipDoorIds);
    this.markSpatialActionMutated();
    this.updateComplete();
    return { ok: true, blockId: id, color, ...exitAnimationId ? { exitAnimationId } : {}, complete: this.complete };
  }
  thawAll(amount = 1) {
    if (this.revisedRules && (this.complete || this.failed)) return false;
    let changed = false;
    for (const gate of this.gates) {
      if (gate.frozen > 0) {
        const next = Math.max(0, gate.frozen - amount);
        if (next !== gate.frozen) changed = true;
        gate.frozen = next;
      }
    }
    for (const door of this.flipDoors) {
      if (door.frozen > 0) {
        const next = Math.max(0, door.frozen - amount);
        if (next !== door.frozen) changed = true;
        door.frozen = next;
      }
    }
    for (const block of this.blocks) {
      if (this.revisedRules && !this.isBlockVisible(block)) continue;
      if (block.frozen > 0) {
        const next = Math.max(0, block.frozen - amount);
        if (next !== block.frozen) changed = true;
        block.frozen = next;
      }
    }
    for (const shutter of this.shutters) {
      if (shutter.skin !== "staging" && shutter.skin !== "lift" && shutter.skin !== "staged-frame" && shutter.count > 0) {
        const next = Math.max(0, shutter.count - amount);
        if (next !== shutter.count) changed = true;
        shutter.count = next;
      }
    }
    if (changed) {
      this.markActionMutated();
      if (this.revisedRules) this.settleRevisedSpace();
    }
    return changed;
  }
  advanceCounters(clearedId, blockRemoved) {
    for (const gate of this.gates) gate.frozen = Math.max(0, gate.frozen - 1);
    for (const door of this.flipDoors) door.frozen = Math.max(0, door.frozen - 1);
    const pulseRescueTargetId = this.level.pulseRescue?.targetBlockId;
    for (const block of this.blocks) {
      if (this.revisedRules && !this.isBlockVisible(block)) continue;
      if (block.id !== clearedId && !(block.id === pulseRescueTargetId && block.frozen === 1)) {
        block.frozen = Math.max(0, block.frozen - 1);
      }
    }
    for (const shutter of this.shutters) {
      if (this.revisedRules && shutter.skin === "lift") continue;
      if ((shutter.skin === "staging" || shutter.skin === "lift" || shutter.skin === "staged-frame") && !blockRemoved) continue;
      if (shutter.triggerBlockIds && !shutter.triggerBlockIds.includes(clearedId)) continue;
      shutter.count = Math.max(0, shutter.count - 1);
    }
    return this.advanceConveyors();
  }
  captureFlipDoorEligibility() {
    return usesFrozenFlipDoorEligibility(this.level) ? this.flipDoors.filter((door) => door.frozen <= 0).map((door) => door.id) : void 0;
  }
  toggleFlipDoors(eligibleIds) {
    for (const door of this.flipDoors) {
      if (eligibleIds === void 0 || eligibleIds.includes(door.id)) door.open = !door.open;
    }
  }
  registerExitCompletion(eligibleIds) {
    if (!this.flipDoors.length) return void 0;
    if (!usesExitAnimationCompletion(this.level)) {
      this.toggleFlipDoors(eligibleIds);
      return void 0;
    }
    const id = `exit-${this.exitAnimationNamespace}-${this.nextExitAnimationSequence++}`;
    this.pendingExitAnimations.add(id);
    if (eligibleIds !== void 0) this.pendingExitFlipDoorIds.set(id, [...eligibleIds]);
    if (!this.options.deferExitCompletion) this.completeExitAnimation(id);
    return id;
  }
  settleExitInSnapshot(snapshot, id, toggle) {
    if (!snapshot.pendingExitAnimations?.includes(id)) return;
    const remaining = snapshot.pendingExitAnimations.filter((pending) => pending !== id);
    if (remaining.length) snapshot.pendingExitAnimations = remaining;
    else delete snapshot.pendingExitAnimations;
    const eligibleIds = snapshot.pendingExitFlipDoorIds?.[id];
    if (toggle) {
      for (const door of snapshot.flipDoors) {
        if (!usesFrozenFlipDoorEligibility(this.level) || eligibleIds?.includes(door.id)) door.open = !door.open;
      }
    }
    if (snapshot.pendingExitFlipDoorIds) {
      delete snapshot.pendingExitFlipDoorIds[id];
      if (!Object.keys(snapshot.pendingExitFlipDoorIds).length) delete snapshot.pendingExitFlipDoorIds;
    }
  }
  /** Completes one registered departure, including the final winning departure. */
  completeExitAnimation(id) {
    if (!this.pendingExitAnimations.has(id)) return false;
    if (this.failed) {
      this.discardPendingExitAnimations();
      return false;
    }
    this.pendingExitAnimations.delete(id);
    this.toggleFlipDoors(usesFrozenFlipDoorEligibility(this.level) ? this.pendingExitFlipDoorIds.get(id) ?? [] : void 0);
    this.pendingExitFlipDoorIds.delete(id);
    for (const snapshot of this.history) this.settleExitInSnapshot(snapshot, id, true);
    if (this.pendingHistory) this.settleExitInSnapshot(this.pendingHistory, id, true);
    return true;
  }
  discardPendingExitAnimations() {
    for (const id of this.pendingExitAnimations) {
      for (const snapshot of this.history) this.settleExitInSnapshot(snapshot, id, false);
      if (this.pendingHistory) this.settleExitInSnapshot(this.pendingHistory, id, false);
    }
    this.pendingExitAnimations.clear();
    this.pendingExitFlipDoorIds.clear();
  }
  updateComplete() {
    this.complete = this.blocks.length === 0 && this.queuedBlocks.length === 0;
    if (this.complete) this.clearTimeFreeze();
  }
  coverOccupiesBoard(shutter) {
    return shutterHasPhysicalFootprint(this.revisedRules && !shutter.revealed ? { ...shutter, count: Math.max(1, shutter.count) } : shutter);
  }
  /** An entire hidden layer enters atomically, including frozen/locked pieces. */
  canRevealBatch(shutter) {
    const occupied = /* @__PURE__ */ new Set();
    for (const block of this.blocks) {
      if (!this.isBlockVisible(block)) continue;
      for (const [x, y] of this.blockCells(block)) occupied.add(`${x},${y}`);
    }
    for (const cover of this.shutters) {
      if (cover.id === shutter.id || !this.coverOccupiesBoard(cover)) continue;
      for (let y = cover.y; y < cover.y + cover.height; y += 1) {
        for (let x = cover.x; x < cover.x + cover.width; x += 1) occupied.add(`${x},${y}`);
      }
    }
    for (const block of this.blocks.filter((candidate) => candidate.shutterId === shutter.id)) {
      const cells = this.blockCells(block);
      if (footprintCrossesBoardSeam(this.level, cells)) return false;
      for (const [x, y] of cells) {
        const key = `${x},${y}`;
        if (!this.playableKeys.has(key) || this.blockedKeys.has(key) || occupied.has(key)) return false;
        if (this.coloredGrids.some((grid) => grid.color !== (block.layers[0] ?? block.color) && grid.cells.some(([gx, gy]) => gx === x && gy === y))) return false;
        occupied.add(key);
      }
    }
    return true;
  }
  /** Every successful iteration consumes a finite hidden layer or queue head. */
  settleRevisedSpace() {
    if (!this.revisedRules || this.failed || this.complete) return;
    let changed;
    do {
      changed = false;
      for (const shutter of this.shutters) {
        if (shutter.revealed) continue;
        if (shutter.skin === "lift") {
          const covered = this.blocks.some((block) => this.isBlockVisible(block) && this.blockCells(block).some(([x, y]) => x >= shutter.x && x < shutter.x + shutter.width && y >= shutter.y && y < shutter.y + shutter.height));
          if (covered) continue;
        } else if (shutter.count > 0) continue;
        if (!this.canRevealBatch(shutter)) continue;
        shutter.count = 0;
        shutter.revealed = true;
        changed = true;
      }
      for (const generator of this.generators) {
        if ((generator.trigger ?? "move") === "move" && this.releaseGeneratorHead(generator)) changed = true;
      }
    } while (changed);
    this.updateComplete();
  }
  /**
   * Each independent machine gets one release attempt per committed spatial
   * action. A blocked footprint leaves both the queue head and count intact.
   */
  releaseOneFromEachReadyGenerator() {
    for (const generator of this.generators) {
      if ((generator.trigger ?? "move") !== "move") continue;
      this.releaseGeneratorHead(generator);
    }
    this.updateComplete();
  }
  releaseGeneratorHead(generator, held) {
    if (generator.remaining <= 0 || !generator.nextBlockId) return false;
    const queuedIndex = this.queuedBlocks.findIndex((block) => block.id === generator.nextBlockId);
    if (queuedIndex < 0) return false;
    const queued = this.queuedBlocks[queuedIndex];
    const candidate = {
      ...queued,
      x: generator.spawn[0],
      y: generator.spawn[1],
      shape: clonePoints(queued.shape),
      layers: [...queued.layers]
    };
    const placementProbe = {
      ...candidate,
      frozen: 0,
      lockedBy: void 0,
      shutterId: void 0
    };
    if (!this.canPlace(placementProbe, placementProbe.x, placementProbe.y)) return false;
    if (generator.trigger === "time" && (this.overlapsHeldReservation(candidate, candidate.x, candidate.y, held) || !this.timedCargoFitsRollback(candidate))) return false;
    this.queuedBlocks.splice(queuedIndex, 1);
    this.blocks.push(candidate);
    generator.head += 1;
    generator.remaining = generator.queueBlockIds.length - generator.head;
    generator.nextBlockId = generator.queueBlockIds[generator.head];
    if (generator.trigger === "time" && this.pendingHistory) {
      const baselineIndex = this.pendingHistory.queuedBlocks.findIndex((block) => block.id === candidate.id);
      if (baselineIndex >= 0) {
        const [baselineCargo] = this.pendingHistory.queuedBlocks.splice(baselineIndex, 1);
        this.pendingHistory.blocks.push({ ...baselineCargo, x: candidate.x, y: candidate.y });
      }
    }
    this.updateComplete();
    return true;
  }
  timedCargoFitsRollback(candidate) {
    const baseline = this.pendingHistory;
    if (!baseline) return true;
    const occupied = /* @__PURE__ */ new Set();
    for (const block of baseline.blocks) {
      if (block.shutterId && baseline.shutters.some((shutter) => shutter.id === block.shutterId && shutter.count > 0)) continue;
      for (const [x, y] of this.blockCells(block)) occupied.add(`${x},${y}`);
    }
    for (const shutter of baseline.shutters) {
      if (!shutterHasPhysicalFootprint(shutter)) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) occupied.add(`${x},${y}`);
      }
    }
    return this.blockCells(candidate).every(([x, y]) => !occupied.has(`${x},${y}`));
  }
  advanceTimedGenerators(deltaSeconds, held) {
    let changed = false;
    for (const generator of this.generators) {
      if (generator.trigger !== "time" || generator.remaining <= 0) continue;
      const interval = generator.intervalSeconds ?? 1;
      generator.elapsed += deltaSeconds;
      while (generator.remaining > 0) {
        const threshold = generator.head === 0 ? generator.initialDelaySeconds ?? interval : interval;
        if (generator.elapsed + 1e-9 < threshold) break;
        if (!this.releaseGeneratorHead(generator, held)) {
          generator.elapsed = Math.min(generator.elapsed, threshold);
          break;
        }
        generator.elapsed = Math.max(0, generator.elapsed - threshold);
        changed = true;
      }
      if (this.pendingHistory) {
        const baselineGenerator = this.pendingHistory.generators.find((item) => item.id === generator.id);
        if (baselineGenerator) Object.assign(baselineGenerator, {
          head: generator.head,
          remaining: generator.remaining,
          nextBlockId: generator.nextBlockId,
          elapsed: generator.elapsed
        });
      }
    }
    return changed;
  }
  releaseKey(keyId) {
    if (!keyId) return;
    for (const block of this.blocks) {
      if (block.lockedBy !== keyId) continue;
      const remaining = Math.max(0, (block.lockCount ?? 1) - 1);
      if (remaining > 0) block.lockCount = remaining;
      else {
        block.lockedBy = void 0;
        block.lockCount = void 0;
      }
    }
    for (const block of this.queuedBlocks) {
      if (block.lockedBy !== keyId) continue;
      const remaining = Math.max(0, (block.lockCount ?? 1) - 1);
      if (remaining > 0) block.lockCount = remaining;
      else {
        block.lockedBy = void 0;
        block.lockCount = void 0;
      }
    }
  }
  advanceElevators(deltaSeconds, held) {
    let spatialChanged = false;
    for (const elevator of this.elevators) {
      elevator.elapsed += deltaSeconds;
      if (elevator.elapsed < elevator.periodSeconds) continue;
      elevator.elapsed %= elevator.periodSeconds;
      const destinationX = elevator.direction > 0 ? elevator.toX : elevator.fromX;
      const destinationY = elevator.direction > 0 ? elevator.toY : elevator.fromY;
      const stepX = Math.sign(destinationX - elevator.x);
      const stepY = Math.sign(destinationY - elevator.y);
      if (stepX === 0 && stepY === 0) {
        elevator.direction = elevator.direction > 0 ? -1 : 1;
        continue;
      }
      const block = this.getBlock(elevator.blockId);
      const carrying = block?.x === elevator.x && block?.y === elevator.y && held?.blockId !== block.id;
      const targetX = block ? block.x + stepX : 0;
      const targetY = block ? block.y + stepY : 0;
      if (carrying && block && (!this.canTranslate(block, targetX, targetY) || this.overlapsHeldReservation(block, targetX, targetY, held))) {
        elevator.direction = elevator.direction > 0 ? -1 : 1;
        continue;
      }
      elevator.x += stepX;
      elevator.y += stepY;
      spatialChanged = true;
      if (carrying && block) {
        block.x += stepX;
        block.y += stepY;
      }
      if (elevator.x === destinationX && elevator.y === destinationY) {
        elevator.direction = elevator.direction > 0 ? -1 : 1;
      }
    }
    return spatialChanged;
  }
  overlapsHeldReservation(moving, targetX, targetY, held) {
    if (!held || held.blockId === moving.id) return false;
    const epsilon = 1e-3;
    const heldAnchors = [[held.x, held.y]];
    if (held.rollbackX !== void 0 && held.rollbackY !== void 0) {
      heldAnchors.push([held.rollbackX, held.rollbackY]);
    }
    return moving.shape.some(([dx, dy]) => {
      const x = targetX + dx;
      const y = targetY + dy;
      return heldAnchors.some(([anchorX, anchorY]) => held.shape.some(([heldDx, heldDy]) => {
        const heldX = anchorX + heldDx;
        const heldY = anchorY + heldDy;
        return x < heldX + 1 - epsilon && x + 1 > heldX + epsilon && y < heldY + 1 - epsilon && y + 1 > heldY + epsilon;
      }));
    });
  }
  advanceConveyors() {
    let changed = false;
    const vectors = {
      top: [0, -1],
      right: [1, 0],
      bottom: [0, 1],
      left: [-1, 0]
    };
    for (const conveyor of this.conveyors) {
      const block = this.getBlock(conveyor.blockId);
      if (!block || !this.isBlockActive(block)) continue;
      const cells = this.blockCells(block);
      const onBelt = cells.every(([x, y]) => x >= conveyor.x && x < conveyor.x + conveyor.width && y >= conveyor.y && y < conveyor.y + conveyor.height);
      if (!onBelt) continue;
      const [dx, dy] = vectors[conveyor.direction];
      if (this.canTranslate(block, block.x + dx, block.y + dy)) {
        block.x += dx;
        block.y += dy;
        changed = true;
      }
    }
    return changed;
  }
};
var RETIRED_MECHANISM_NAMES = /* @__PURE__ */ new Set();
var RETIRED_LEVEL_FIELDS = /* @__PURE__ */ new Set([
  "keys",
  "keyBlocks",
  "key_blocks",
  "keyLocks",
  "key_locks",
  "arrowBlocks",
  "arrow_blocks"
]);
var RETIRED_BLOCK_FIELDS = /* @__PURE__ */ new Set([
  "key",
  "key_id",
  "isKey",
  "is_key",
  "unlocks",
  "unlocksGateId",
  "unlocks_gate_id",
  "lockId",
  "lock_id",
  "locked",
  "locked_by",
  "requiresKey",
  "requires_key",
  "requiredKey",
  "required_key",
  "arrow",
  "arrowDirection",
  "arrow_direction",
  "direction",
  "moveAxis",
  "move_axis",
  "movement_axis",
  "allowedAxes",
  "allowed_axes",
  "allowedDirections",
  "allowed_directions",
  "directionLock",
  "direction_lock"
]);
var RETIRED_GATE_FIELDS = /* @__PURE__ */ new Set([
  "key",
  "keyId",
  "key_id",
  "lockId",
  "lock_id",
  "locked",
  "lockedByKey",
  "locked_by_key",
  "requiresKey",
  "requires_key",
  "requiredKey",
  "required_key",
  "unlockKeyId",
  "unlock_key_id"
]);
var RETIRED_RUNTIME_ID = /(?:^|[-_])legacy-(?:key|arrow-block|belt-lock)(?:$|[-_])/i;
var retiredFieldsIn = (value, retired) => Object.keys(value).filter((field) => retired.has(field));
var validateLevel = (level) => {
  if (level.mechanismRules !== void 0 && !usesRevisedMechanisms(level)) {
    throw new Error(`Level ${level.id}: unsupported mechanismRules ${String(level.mechanismRules)}`);
  }
  const rawLevel = level;
  const levelFields = retiredFieldsIn(rawLevel, RETIRED_LEVEL_FIELDS);
  const rawMechanisms = Array.isArray(rawLevel.mechanism) ? rawLevel.mechanism : [];
  const rawMechanismConfig = rawLevel.mechanism_config && typeof rawLevel.mechanism_config === "object" ? rawLevel.mechanism_config : {};
  const retiredMechanisms = [
    ...rawMechanisms.filter((name) => typeof name === "string" && RETIRED_MECHANISM_NAMES.has(name)),
    ...Object.keys(rawMechanismConfig).filter((name) => RETIRED_MECHANISM_NAMES.has(name))
  ];
  if (levelFields.length || retiredMechanisms.length) {
    throw new Error(`Level ${level.id}: retired key-lock/arrow-block mechanic is not supported (${[
      ...levelFields,
      ...retiredMechanisms
    ].join(", ")})`);
  }
  if (level.bombFailurePolicy !== void 0 && level.bombFailurePolicy !== "fail") {
    throw new Error(`Level ${level.id}: invalid bombFailurePolicy ${String(level.bombFailurePolicy)}`);
  }
  if (level.width < 2 || level.height < 2) throw new Error(`Level ${level.id}: board is too small`);
  validateBoardSeams(level);
  const ids = /* @__PURE__ */ new Set();
  const playable = /* @__PURE__ */ new Set();
  for (const [x, y] of level.playable ?? rectangularCells(level.width, level.height)) {
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
      throw new Error(`Level ${level.id}: playable cell ${key} is out of bounds`);
    }
    if (playable.has(key)) throw new Error(`Level ${level.id}: duplicate playable cell ${key}`);
    playable.add(key);
  }
  if (!playable.size) throw new Error(`Level ${level.id}: board has no playable cells`);
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
  const occupied = /* @__PURE__ */ new Set();
  const shutters = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  const queuedByBlock = /* @__PURE__ */ new Map();
  const gateCells = /* @__PURE__ */ new Set();
  for (const generator of level.generators ?? []) {
    if (RETIRED_RUNTIME_ID.test(generator.id)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} uses a retired key-lock identifier`);
    }
    if (ids.has(generator.id)) throw new Error(`Level ${level.id}: duplicate id ${generator.id}`);
    ids.add(generator.id);
    const limit = generator.side === "top" || generator.side === "bottom" ? level.width : level.height;
    if (!Number.isInteger(generator.offset) || generator.offset < 0 || generator.offset >= limit) {
      throw new Error(`Level ${level.id}: generator ${generator.id} rim offset is out of bounds`);
    }
    if (generator.spawn.length !== 2 || !generator.spawn.every(Number.isInteger)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} spawn must be an integer board anchor`);
    }
    if (!generator.queueBlockIds.length) {
      throw new Error(`Level ${level.id}: generator ${generator.id} queue is empty`);
    }
    const trigger = generator.trigger ?? "move";
    if (trigger !== "move" && trigger !== "time") {
      throw new Error(`Level ${level.id}: generator ${generator.id} has invalid trigger ${String(trigger)}`);
    }
    if (trigger === "time" && (!Number.isFinite(generator.intervalSeconds) || (generator.intervalSeconds ?? 0) <= 0)) {
      throw new Error(`Level ${level.id}: timed generator ${generator.id} needs a positive intervalSeconds`);
    }
    if (generator.initialDelaySeconds !== void 0 && (!Number.isFinite(generator.initialDelaySeconds) || generator.initialDelaySeconds <= 0)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} has invalid initialDelaySeconds`);
    }
    const ownQueue = /* @__PURE__ */ new Set();
    for (const blockId of generator.queueBlockIds) {
      if (ownQueue.has(blockId)) {
        throw new Error(`Level ${level.id}: generator ${generator.id} repeats queued block ${blockId}`);
      }
      ownQueue.add(blockId);
      if (queuedByBlock.has(blockId)) {
        throw new Error(`Level ${level.id}: queued block ${blockId} belongs to multiple generators`);
      }
      queuedByBlock.set(blockId, generator);
    }
  }
  for (const gate of level.gates) {
    const retiredFields = retiredFieldsIn(gate, RETIRED_GATE_FIELDS);
    if (retiredFields.length || RETIRED_RUNTIME_ID.test(gate.id)) {
      throw new Error(`Level ${level.id}: gate ${gate.id} uses retired key-lock/arrow-block data (${retiredFields.join(", ") || "id"})`);
    }
    if (ids.has(gate.id)) throw new Error(`Level ${level.id}: duplicate id ${gate.id}`);
    ids.add(gate.id);
    if (gate.frozen !== void 0 && (!Number.isInteger(gate.frozen) || gate.frozen <= 0)) {
      throw new Error(`Level ${level.id}: gate ${gate.id} must omit frozen for an ordinary exit or use a positive integer countdown`);
    }
    validateGatePortalGeometry(level, gate, { gateId: gate.id, gateKind: "gate" }, gateCells);
  }
  for (const door of level.flipDoors ?? []) {
    const retiredFields = retiredFieldsIn(door, RETIRED_GATE_FIELDS);
    if (retiredFields.length || RETIRED_RUNTIME_ID.test(door.id)) {
      throw new Error(`Level ${level.id}: flip door ${door.id} uses retired key-lock/arrow-block data (${retiredFields.join(", ") || "id"})`);
    }
    if (ids.has(door.id)) throw new Error(`Level ${level.id}: duplicate id ${door.id}`);
    ids.add(door.id);
    if (typeof door.initiallyOpen !== "boolean") {
      throw new Error(`Level ${level.id}: flip door ${door.id} needs a boolean initiallyOpen state`);
    }
    if (door.frozen !== void 0 && (!Number.isInteger(door.frozen) || door.frozen <= 0)) {
      throw new Error(`Level ${level.id}: flip door ${door.id} must omit frozen or use a positive integer countdown`);
    }
    validateGatePortalGeometry(level, door, { gateId: door.id, gateKind: "flip door" }, gateCells);
  }
  const coloredGridCells = /* @__PURE__ */ new Map();
  for (const grid of level.coloredGrids ?? []) {
    if (ids.has(grid.id)) throw new Error(`Level ${level.id}: duplicate id ${grid.id}`);
    ids.add(grid.id);
    if (!grid.cells.length) throw new Error(`Level ${level.id}: colored grid ${grid.id} has no cells`);
    const ownCells = /* @__PURE__ */ new Set();
    for (const [x, y] of grid.cells) {
      const key = `${x},${y}`;
      if (!Number.isInteger(x) || !Number.isInteger(y) || !playable.has(key) || blocked.has(key)) {
        throw new Error(`Level ${level.id}: colored grid ${grid.id} has invalid cell ${key}`);
      }
      if (ownCells.has(key)) throw new Error(`Level ${level.id}: colored grid ${grid.id} repeats cell ${key}`);
      if (coloredGridCells.has(key)) throw new Error(`Level ${level.id}: colored grids overlap at ${key}`);
      ownCells.add(key);
      coloredGridCells.set(key, grid.color);
    }
  }
  for (const block of level.blocks) {
    const generator = queuedByBlock.get(block.id);
    const retiredFields = retiredFieldsIn(block, RETIRED_BLOCK_FIELDS);
    if (retiredFields.length || RETIRED_RUNTIME_ID.test(block.id)) {
      throw new Error(`Level ${level.id}: block ${block.id} uses retired key-lock/arrow-block data (${retiredFields.join(", ") || "id"})`);
    }
    if (ids.has(block.id)) throw new Error(`Level ${level.id}: duplicate id ${block.id}`);
    ids.add(block.id);
    if (block.layers && block.layers.length === 0) {
      throw new Error(`Level ${level.id}: block ${block.id} layers must contain the body color`);
    }
    if ((block.layers?.length ?? 1) > MAX_BLOCK_LAYERS) {
      throw new Error(`Level ${level.id}: block ${block.id} supports at most one extra shell (${MAX_BLOCK_LAYERS} clear stages)`);
    }
    if (block.layers && block.layers.length > 1 && new Set(block.layers).size !== block.layers.length) {
      throw new Error(`Level ${level.id}: block ${block.id} must use distinct outer and inner shell colors`);
    }
    if (block.movementAxis !== void 0 && block.movementAxis !== "horizontal" && block.movementAxis !== "vertical") {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid movementAxis ${String(block.movementAxis)}`);
    }
    if (block.keyId !== void 0 && (!block.keyId.trim() || block.keyId !== block.keyId.trim())) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid keyId`);
    }
    if (block.lockedBy !== void 0 && (!block.lockedBy.trim() || block.lockedBy !== block.lockedBy.trim())) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid lockedBy`);
    }
    if (block.lockCount !== void 0 && (!block.lockedBy || !Number.isInteger(block.lockCount) || block.lockCount < 1)) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid lockCount`);
    }
    if (block.keyId && block.lockedBy === block.keyId) {
      throw new Error(`Level ${level.id}: block ${block.id} cannot be locked by its own key`);
    }
    if (block.timedBombSeconds !== void 0 && (!Number.isFinite(block.timedBombSeconds) || block.timedBombSeconds <= 0)) {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid timedBombSeconds`);
    }
    if (block.rotationBadge !== void 0 && typeof block.rotationBadge !== "boolean") {
      throw new Error(`Level ${level.id}: block ${block.id} has invalid rotationBadge marker`);
    }
    if (!block.shape.length) throw new Error(`Level ${level.id}: block ${block.id} has no cells`);
    if (block.frozen !== void 0 && (!Number.isInteger(block.frozen) || block.frozen <= 0)) {
      throw new Error(`Level ${level.id}: block ${block.id} must omit frozen when thawed or use a positive integer countdown`);
    }
    if (generator && (block.frozen ?? 0) > 0) {
      throw new Error(`Level ${level.id}: generator ${generator.id} queued block ${block.id} cannot be frozen`);
    }
    if ((block.frozen ?? 0) > 0 && !isIceEligibleBlockShape(block.shape)) {
      throw new Error(`Level ${level.id}: frozen block ${block.id} must use unique integer orthogonally connected cells`);
    }
    if (generator && block.shutterId) {
      throw new Error(`Level ${level.id}: queued block ${block.id} cannot also be shutter-hidden`);
    }
    if (block.shutterId && !shutters.has(block.shutterId)) {
      throw new Error(`Level ${level.id}: block ${block.id} references missing shutter ${block.shutterId}`);
    }
    const effectiveAnchorX = generator?.spawn[0] ?? block.x;
    const effectiveAnchorY = generator?.spawn[1] ?? block.y;
    const effectiveCells = block.shape.map(([dx, dy]) => [effectiveAnchorX + dx, effectiveAnchorY + dy]);
    if (footprintCrossesBoardSeam(level, effectiveCells)) {
      throw new Error(`Level ${level.id}: block ${block.id} crosses a board seam`);
    }
    for (const [dx, dy] of block.shape) {
      const anchorX = effectiveAnchorX;
      const anchorY = effectiveAnchorY;
      const x = anchorX + dx;
      const y = anchorY + dy;
      const key = `${x},${y}`;
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
        throw new Error(`Level ${level.id}: block ${block.id} is out of bounds at ${key}`);
      }
      if (!playable.has(key)) throw new Error(`Level ${level.id}: block ${block.id} starts outside the board at ${key}`);
      if (blocked.has(key)) throw new Error(`Level ${level.id}: block ${block.id} overlaps wall ${key}`);
      const gridColor = coloredGridCells.get(key);
      const activeColor = block.layers?.[0] ?? block.color;
      if (gridColor !== void 0 && gridColor !== activeColor) {
        throw new Error(`Level ${level.id}: block ${block.id} color ${activeColor} mismatches colored grid ${gridColor} at ${key}`);
      }
      if (!block.shutterId && !generator && occupied.has(key)) throw new Error(`Level ${level.id}: overlapping active block cell ${key}`);
      if (!block.shutterId && !generator) occupied.add(key);
    }
  }
  const keyIds = new Set(level.blocks.flatMap((block) => block.keyId ? [block.keyId] : []));
  for (const block of level.blocks) {
    if (block.lockedBy && !keyIds.has(block.lockedBy)) {
      throw new Error(`Level ${level.id}: block ${block.id} references missing key ${block.lockedBy}`);
    }
  }
  for (const [blockId, generator] of queuedByBlock) {
    if (!level.blocks.some((block) => block.id === blockId)) {
      throw new Error(`Level ${level.id}: generator ${generator.id} references missing queued block ${blockId}`);
    }
    if (level.elevators?.some((elevator) => elevator.blockId === blockId) || level.conveyors?.some((conveyor) => conveyor.blockId === blockId)) {
      throw new Error(`Level ${level.id}: queued block ${blockId} cannot start on a progression device`);
    }
  }
  if (level.strategyNudge) {
    const { blockId, from, path, afterMoves } = level.strategyNudge;
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block) throw new Error(`Level ${level.id}: strategy nudge references missing block ${blockId}`);
    if (block.x !== from[0] || block.y !== from[1]) {
      throw new Error(`Level ${level.id}: strategy nudge start does not match block ${blockId}`);
    }
    if (!path.length || afterMoves < 1 || !Number.isInteger(afterMoves)) {
      throw new Error(`Level ${level.id}: strategy nudge must have a path and positive integer threshold`);
    }
  }
  if (level.strategyFocus) {
    const { blockId, afterMoves } = level.strategyFocus;
    if (!level.blocks.some((candidate) => candidate.id === blockId)) {
      throw new Error(`Level ${level.id}: strategy focus references missing block ${blockId}`);
    }
    if (afterMoves < 1 || !Number.isInteger(afterMoves)) {
      throw new Error(`Level ${level.id}: strategy focus must have a positive integer threshold`);
    }
  }
  if (level.rocketRescue) {
    if (level.rocketRescue.trigger !== "no-exit-deadlock") {
      throw new Error(`Level ${level.id}: unsupported rocket rescue trigger`);
    }
    if (!level.blocks.some((candidate) => candidate.id === level.rocketRescue.targetBlockId)) {
      throw new Error(`Level ${level.id}: rocket rescue references missing block ${level.rocketRescue.targetBlockId}`);
    }
    if (!level.blocks.some((candidate) => candidate.id === level.rocketRescue.deadlockBlockId)) {
      throw new Error(`Level ${level.id}: rocket rescue deadlock references missing block ${level.rocketRescue.deadlockBlockId}`);
    }
    if (level.rocketRescue.deadlockPosition.length !== 2 || level.rocketRescue.deadlockPosition.some((value) => !Number.isInteger(value))) {
      throw new Error(`Level ${level.id}: rocket rescue deadlock position must be an integer point`);
    }
  }
  if (level.pulseRescue) {
    if (level.pulseRescue.trigger !== "frozen-one") {
      throw new Error(`Level ${level.id}: unsupported pulse rescue trigger`);
    }
    const target = level.blocks.find((candidate) => candidate.id === level.pulseRescue.targetBlockId);
    if (!target) {
      throw new Error(`Level ${level.id}: pulse rescue references missing block ${level.pulseRescue.targetBlockId}`);
    }
    if (level.pulseRescue.targetPosition.length !== 2 || level.pulseRescue.targetPosition.some((value) => !Number.isInteger(value))) {
      throw new Error(`Level ${level.id}: pulse rescue target position must be an integer point`);
    }
    if (!Number.isInteger(level.pulseRescue.requiredFrozen) || level.pulseRescue.requiredFrozen < 1 || target.frozen !== level.pulseRescue.requiredFrozen) {
      throw new Error(`Level ${level.id}: pulse rescue requiredFrozen must match its target block`);
    }
  }
  for (const shutter of level.shutters ?? []) {
    if (RETIRED_RUNTIME_ID.test(shutter.id)) {
      throw new Error(`Level ${level.id}: shutter ${shutter.id} uses a retired key-lock identifier`);
    }
    const requiresExactCohort = shutter.skin === "lift" && !usesRevisedMechanisms(level) || shutter.skin === "staged-frame";
    const supportsExactCohort = requiresExactCohort || shutter.skin === "staging";
    if (requiresExactCohort && shutter.triggerBlockIds === void 0) {
      throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} requires an exact trigger block cohort`);
    }
    if (supportsExactCohort && shutter.triggerBlockIds?.length === 0) {
      throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} trigger block cohort cannot be empty`);
    }
    if (shutter.triggerBlockIds !== void 0) {
      if (!supportsExactCohort) {
        throw new Error(`Level ${level.id}: shutter ${shutter.id} uses triggerBlockIds without an exact-cohort skin`);
      }
      if (new Set(shutter.triggerBlockIds).size !== shutter.triggerBlockIds.length) {
        throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} repeats a trigger block id`);
      }
      if (shutter.triggerBlockIds.length !== shutter.count) {
        throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} count must equal its trigger block cohort`);
      }
      for (const blockId of shutter.triggerBlockIds) {
        const block = level.blocks.find((candidate) => candidate.id === blockId);
        if (!block) {
          throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} references missing trigger block ${blockId}`);
        }
        if (shutter.skin === "staged-frame") {
          if (block.shutterId || queuedByBlock.has(block.id)) {
            throw new Error(`Level ${level.id}: staged frame ${shutter.id} trigger block ${blockId} must be opening-visible`);
          }
          for (const [dx, dy] of block.shape) {
            const x = block.x + dx;
            const y = block.y + dy;
            if (x < shutter.x || x >= shutter.x + shutter.width || y < shutter.y || y >= shutter.y + shutter.height) {
              throw new Error(`Level ${level.id}: staged frame ${shutter.id} does not contain trigger block ${blockId}`);
            }
          }
        }
        if (block.shutterId === shutter.id) {
          throw new Error(`Level ${level.id}: ${shutter.skin} ${shutter.id} cannot wait for its own hidden block ${blockId}`);
        }
      }
    }
    if (shutter.skin === "staged-frame") {
      const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
      if (!hidden.length) throw new Error(`Level ${level.id}: staged frame ${shutter.id} has no hidden batch`);
      for (const block of hidden) {
        for (const [dx, dy] of block.shape) {
          const x = block.x + dx;
          const y = block.y + dy;
          if (x < shutter.x || x >= shutter.x + shutter.width || y < shutter.y || y >= shutter.y + shutter.height) {
            throw new Error(`Level ${level.id}: staged frame ${shutter.id} does not contain hidden block ${block.id}`);
          }
        }
      }
    }
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        if (!playable.has(`${x},${y}`)) throw new Error(`Level ${level.id}: shutter ${shutter.id} covers void at ${x},${y}`);
      }
    }
  }
  const exactCohorts = new Map((level.shutters ?? []).filter((shutter) => shutter.triggerBlockIds !== void 0).map((shutter) => [shutter.id, shutter]));
  const hiddenByBlock = new Map(level.blocks.flatMap((block) => block.shutterId ? [[block.id, block.shutterId]] : []));
  const visitedCohorts = /* @__PURE__ */ new Set();
  const activeCohorts = /* @__PURE__ */ new Set();
  const visitCohort = (shutterId) => {
    if (visitedCohorts.has(shutterId)) return;
    if (activeCohorts.has(shutterId)) {
      throw new Error(`Level ${level.id}: exact staging cohort dependency cycle includes ${shutterId}`);
    }
    activeCohorts.add(shutterId);
    for (const blockId of exactCohorts.get(shutterId)?.triggerBlockIds ?? []) {
      const dependency = hiddenByBlock.get(blockId);
      if (dependency && exactCohorts.has(dependency)) visitCohort(dependency);
    }
    activeCohorts.delete(shutterId);
    visitedCohorts.add(shutterId);
  };
  for (const shutterId of exactCohorts.keys()) visitCohort(shutterId);
  for (const elevator of level.elevators ?? []) {
    if (RETIRED_RUNTIME_ID.test(elevator.id) || RETIRED_RUNTIME_ID.test(elevator.blockId)) {
      throw new Error(`Level ${level.id}: elevator ${elevator.id} uses a retired key-lock/arrow-block identifier`);
    }
    if (ids.has(elevator.id)) throw new Error(`Level ${level.id}: duplicate id ${elevator.id}`);
    ids.add(elevator.id);
    if (!level.blocks.some((block) => block.id === elevator.blockId)) {
      throw new Error(`Level ${level.id}: elevator ${elevator.id} references missing block ${elevator.blockId}`);
    }
    if (elevator.periodSeconds <= 0 || elevator.width < 1 || elevator.height < 1) {
      throw new Error(`Level ${level.id}: elevator ${elevator.id} has invalid dimensions or period`);
    }
    for (const [x, y] of [[elevator.fromX, elevator.fromY], [elevator.toX, elevator.toY]]) {
      for (let dy = 0; dy < elevator.height; dy += 1) {
        for (let dx = 0; dx < elevator.width; dx += 1) {
          if (!playable.has(`${x + dx},${y + dy}`)) throw new Error(`Level ${level.id}: elevator ${elevator.id} leaves the board`);
        }
      }
    }
  }
  for (const conveyor of level.conveyors ?? []) {
    if (RETIRED_RUNTIME_ID.test(conveyor.id) || RETIRED_RUNTIME_ID.test(conveyor.blockId)) {
      throw new Error(`Level ${level.id}: conveyor ${conveyor.id} uses a retired key-lock/arrow-block identifier`);
    }
    if (ids.has(conveyor.id)) throw new Error(`Level ${level.id}: duplicate id ${conveyor.id}`);
    ids.add(conveyor.id);
    if (!level.blocks.some((block) => block.id === conveyor.blockId)) {
      throw new Error(`Level ${level.id}: conveyor ${conveyor.id} references missing block ${conveyor.blockId}`);
    }
    for (let y = conveyor.y; y < conveyor.y + conveyor.height; y += 1) {
      for (let x = conveyor.x; x < conveyor.x + conveyor.width; x += 1) {
        if (!playable.has(`${x},${y}`)) throw new Error(`Level ${level.id}: conveyor ${conveyor.id} covers void at ${x},${y}`);
      }
    }
  }
  if (usesRevisedMechanisms(level)) assertRevisedMechanismContract(level);
};

// src/game/continuousDrag.ts
var matchingContinuousExitPortals = (snapshot, block, sides) => {
  if (sides.length === 0) return [];
  const requestedSides = new Set(sides);
  const cells = block.shape.map(([x, y]) => [block.x + x, block.y + y]);
  const owners = [
    ...snapshot.gates.map((gate) => ({ gate, gateKind: "fixed" })),
    ...snapshot.flipDoors.map((gate) => ({ gate, gateKind: "flipDoor" }))
  ];
  const matches = [];
  for (const side of ["top", "right", "bottom", "left"]) {
    if (!requestedSides.has(side)) continue;
    for (const { gate, gateKind } of owners) {
      const match = matchingPortalForExitFrontier(snapshot, cells, gate, side);
      if (!match) continue;
      matches.push({
        gateId: gate.id,
        gateKind,
        portalIndex: match.portalIndex,
        portal: match.portal,
        authoredPortal: Boolean(gate.portals?.length)
      });
    }
  }
  return matches;
};
var chooseReleaseExitSide = (possible, point, board, inferred) => {
  if (inferred && possible.includes(inferred)) return inferred;
  const distance = {
    top: Math.abs(point.y - board.innerY),
    right: Math.abs(point.x - (board.innerX + board.innerWidth)),
    bottom: Math.abs(point.y - (board.innerY + board.innerHeight)),
    left: Math.abs(point.x - board.innerX)
  };
  return [...possible].sort((a, b) => distance[a] - distance[b])[0];
};
var portalReleaseDistanceSquared = (point, portal, board) => {
  const [anchorX, anchorY] = portalBoundaryAnchor(portal);
  const centerX = board.innerX + anchorX * board.cell;
  const centerY = board.innerY + anchorY * board.cell;
  const halfSpan = portal.size * board.cell / 2;
  if (portal.side === "top" || portal.side === "bottom") {
    const nearestX = Math.max(centerX - halfSpan, Math.min(centerX + halfSpan, point.x));
    return (point.x - nearestX) ** 2 + (point.y - centerY) ** 2;
  }
  const nearestY = Math.max(centerY - halfSpan, Math.min(centerY + halfSpan, point.y));
  return (point.x - centerX) ** 2 + (point.y - nearestY) ** 2;
};
var choosePortalReleaseCandidate = (candidates, point, board, inferred) => {
  if (candidates.length === 0) return void 0;
  if (candidates.every((candidate) => candidate.authoredPortal === false)) {
    const possible = [...new Set(candidates.map(({ portal }) => portal.side))];
    const side = chooseReleaseExitSide(possible, point, board, inferred);
    return candidates.find(({ portal }) => portal.side === side);
  }
  const inferredCandidates = inferred ? candidates.filter(({ portal }) => portal.side === inferred) : [];
  const eligible = inferredCandidates.length > 0 ? inferredCandidates : candidates;
  return [...eligible].sort((a, b) => portalReleaseDistanceSquared(point, a.portal, board) - portalReleaseDistanceSquared(point, b.portal, board))[0];
};

// src/core/revisedLevelSearch.ts
var STEPS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
var revisedSpatialStateKey = (snapshot) => {
  const { moves: _moves, ...state } = snapshot;
  return JSON.stringify(state);
};
var unsupportedReasons = (level) => {
  const reasons = [];
  if (!usesRevisedMechanisms(level) && level.mechanismRules !== void 0) {
    reasons.push("Unknown mechanism profile; explicit revised or legacy profile required.");
  }
  if (level.blocks.some((block) => block.timedBombSeconds !== void 0)) {
    reasons.push("Bomb deadlines require a time-aware route verifier; this search does not disable or ignore them.");
  }
  if (level.generators?.some((machine) => machine.trigger === "time")) reasons.push("Timed generators are unsupported.");
  if (level.elevators?.length || level.conveyors?.length) reasons.push("Legacy autonomous moving platforms/conveyors are unsupported.");
  if (level.shutters?.some((cover) => cover.skin === "staging" || cover.skin === "staged-frame" || cover.skin === "generator")) {
    reasons.push("Legacy staging/generator shutter skins are not revised mechanisms.");
  }
  if (level.blocks.some((block) => block.rotationBadge)) reasons.push("Legacy rotation badges are unsupported.");
  return reasons;
};
var automaticExitSide = (model, blockId, previous) => {
  const block = model.getBlock(blockId);
  if (!block || !model.isBlockActive(block)) return void 0;
  const sides = model.possibleExitSides(block);
  if (!sides.length) return void 0;
  const snapshot = model.snapshot();
  const candidates = matchingContinuousExitPortals(snapshot, block, sides);
  const [grabX, grabY] = block.shape[0];
  const pointer = { x: block.x + grabX + 0.5, y: block.y + grabY + 0.5 };
  const inferred = previous ? block.x < previous[0] ? "left" : block.x > previous[0] ? "right" : block.y < previous[1] ? "top" : block.y > previous[1] ? "bottom" : void 0 : void 0;
  return choosePortalReleaseCandidate(candidates, pointer, {
    innerX: 0,
    innerY: 0,
    innerWidth: snapshot.width,
    innerHeight: snapshot.height,
    cell: 1
  }, inferred)?.portal.side;
};
var performDrag = (model, drag) => {
  model.beginAction();
  let automatic = automaticExitSide(model, drag.blockId);
  if (automatic && drag.path.length) return `Pointer-down auto-exit of ${drag.blockId} must precede movement.`;
  for (let index = 0; index < drag.path.length; index += 1) {
    const [x, y] = drag.path[index];
    const block = model.getBlock(drag.blockId);
    const previous = block ? [block.x, block.y] : void 0;
    if (!model.moveBlockStep(drag.blockId, x, y)) return `Rejected move of ${drag.blockId} to ${x},${y}.`;
    automatic = automaticExitSide(model, drag.blockId, previous);
    if (automatic && index !== drag.path.length - 1) return `First-contact auto-exit of ${drag.blockId} must end this drag.`;
  }
  if (automatic !== drag.exitSide) return `Exit of ${drag.blockId} does not match canonical pointer auto-exit (${automatic ?? "none"}).`;
  if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
    return `Rejected ${drag.exitSide} exit of ${drag.blockId}.`;
  }
  if (!model.commitAction()) return `Drag of ${drag.blockId} has no effective mutation.`;
  return void 0;
};
var replayRevisedRoute = (level, drags) => {
  const result = { valid: false, complete: false, effectiveDrags: 0, nonClearingDrags: 0, clearEvents: 0 };
  const unsupported = unsupportedReasons(level);
  if (unsupported.length) return { ...result, error: unsupported.join(" ") };
  try {
    const model = new PuzzleModel(level);
    model.startCountdown();
    for (const drag of drags) {
      const before = model.snapshot();
      const error = performDrag(model, drag);
      if (error) return { ...result, error };
      const after = model.snapshot();
      if (after.failed || after.moves !== before.moves + 1) return { ...result, error: "Invalid committed action or failed model state." };
      result.effectiveDrags += 1;
      const clears = after.cleared - before.cleared;
      result.clearEvents += clears;
      if (clears === 0) result.nonClearingDrags += 1;
    }
    const final = model.snapshot();
    return { ...result, valid: true, complete: final.complete, finalStateKey: revisedSpatialStateKey(final) };
  } catch (error) {
    return { ...result, error: error instanceof Error ? error.message : String(error) };
  }
};
var SearchBudgetReached = class extends Error {
  constructor(termination) {
    super(termination);
    this.termination = termination;
  }
};
var positiveBudget = (value, fallback, label) => {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new Error(`${label} must be a positive safe integer.`);
  return resolved;
};
var searchRevisedLevel = (level, options = {}) => {
  const result = {
    status: "unknown",
    termination: "search-exhausted",
    rulesProfile: level.mechanismRules,
    witnessFound: false,
    evidence: "spatial-witness-only",
    lowerBoundCertified: false,
    timeValidated: false,
    pointerReplayValidated: false,
    pointerPolicy: "first-shape-cell-center-and-unit-steps",
    exploredStates: 0,
    discoveredStates: 0,
    attemptedTransitions: 0,
    drags: [],
    reasons: []
  };
  const unsupported = unsupportedReasons(level);
  if (unsupported.length) return { ...result, status: "unsupported", termination: "unsupported", reasons: unsupported };
  try {
    const maxStates = positiveBudget(options.maxStates, 2500, "maxStates");
    const maxDragStates = positiveBudget(options.maxDragStates, 512, "maxDragStates");
    const maxTransitions = positiveBudget(options.maxTransitions, 1e5, "maxTransitions");
    const maxMilliseconds = positiveBudget(options.maxMilliseconds, 5e3, "maxMilliseconds");
    const deadline = Date.now() + maxMilliseconds;
    const spendTransition = () => {
      if (Date.now() >= deadline) throw new SearchBudgetReached("deadline");
      if (result.attemptedTransitions >= maxTransitions) throw new SearchBudgetReached("max-transitions");
      result.attemptedTransitions += 1;
    };
    const initial = new PuzzleModel(level);
    initial.startCountdown();
    const layers = (model) => {
      const state = model.snapshot();
      return [...state.blocks, ...state.queuedBlocks].reduce((sum, block) => sum + block.layers.length, 0);
    };
    const nodes = [{ model: initial, parent: -1, depth: 0, remainingLayers: layers(initial) }];
    const open = [0];
    const seen = /* @__PURE__ */ new Set([revisedSpatialStateKey(initial.snapshot())]);
    result.discoveredStates = 1;
    const routeTo = (index) => {
      const drags = [];
      while (nodes[index].parent !== -1) {
        drags.push(nodes[index].drag);
        index = nodes[index].parent;
      }
      return drags.reverse();
    };
    const witness = (drags) => {
      const replay = replayRevisedRoute(level, drags);
      if (!replay.valid || !replay.complete) {
        return { ...result, status: "invalid", termination: "invalid", replay, reasons: ["Fresh model replay rejected the proposed witness.", replay.error ?? "Replay incomplete."] };
      }
      return { ...result, status: "witness", termination: "witness", witnessFound: true, drags, replay };
    };
    if (initial.snapshot().complete) return witness([]);
    let found;
    const enqueue = (parent, drag) => {
      const model = nodes[parent].model.clone();
      for (let index = 0; index < drag.path.length + Number(Boolean(drag.exitSide)); index += 1) spendTransition();
      const error = performDrag(model, drag);
      if (error) throw new Error(error);
      const snapshot = model.snapshot();
      const key = revisedSpatialStateKey(snapshot);
      if (seen.has(key)) return;
      if (seen.size >= maxStates) throw new SearchBudgetReached("max-states");
      seen.add(key);
      result.discoveredStates = seen.size;
      if (snapshot.complete) {
        found = [...routeTo(parent), drag];
        return;
      }
      nodes.push({ model, parent, drag, depth: nodes[parent].depth + 1, remainingLayers: layers(model) });
      open.push(nodes.length - 1);
    };
    while (open.length) {
      if (Date.now() >= deadline) throw new SearchBudgetReached("deadline");
      let best = 0;
      for (let index = 1; index < open.length; index += 1) {
        const candidate = nodes[open[index]];
        const current = nodes[open[best]];
        if (candidate.remainingLayers < current.remainingLayers || candidate.remainingLayers === current.remainingLayers && candidate.depth < current.depth) best = index;
      }
      const parent = open.splice(best, 1)[0];
      const source = nodes[parent].model;
      result.exploredStates += 1;
      for (const selected of source.snapshot().blocks) {
        if (!source.isBlockActive(selected)) continue;
        const inner = [{ model: source, path: [] }];
        const innerSeen = /* @__PURE__ */ new Set([revisedSpatialStateKey(source.snapshot())]);
        for (let cursor = 0; cursor < inner.length; cursor += 1) {
          const current = inner[cursor];
          const held = current.model.getBlock(selected.id);
          if (!held) continue;
          const previous = current.path.length > 1 ? current.path[current.path.length - 2] : current.path.length ? [selected.x, selected.y] : void 0;
          spendTransition();
          const automatic = automaticExitSide(current.model, held.id, previous);
          if (automatic) {
            enqueue(parent, { blockId: held.id, path: current.path, exitSide: automatic });
            if (found) return witness(found);
            continue;
          }
          if (current.path.length) enqueue(parent, { blockId: held.id, path: current.path });
          for (const [dx, dy] of STEPS) {
            spendTransition();
            const next = current.model.clone();
            next.beginAction();
            const target = [held.x + dx, held.y + dy];
            if (!next.moveBlockStep(held.id, ...target)) continue;
            const key = revisedSpatialStateKey(next.snapshot());
            if (innerSeen.has(key)) continue;
            if (innerSeen.size >= maxDragStates) throw new SearchBudgetReached("max-drag-states");
            innerSeen.add(key);
            inner.push({ model: next, path: [...current.path, target] });
          }
        }
      }
    }
    return { ...result, reasons: ["No witness found in this search; not an unsatisfiability or difficulty certificate."] };
  } catch (error) {
    if (error instanceof SearchBudgetReached) return { ...result, termination: error.termination, reasons: ["Search budget reached; feasibility remains unknown."] };
    return { ...result, status: "invalid", termination: "invalid", reasons: [error instanceof Error ? error.message : String(error)] };
  }
};

// src/core/revisedRepositionFloor.ts
var checkSeamSeparatedChamberFloor = (level, options) => {
  const result = {
    status: "unknown",
    termination: "below-threshold-exhausted",
    floor: options.floor,
    thresholdProven: false,
    abstraction: "seam-chambers-composition-v1",
    hashBindingRequired: true,
    solvabilityValidated: false,
    pointerReplayValidated: false,
    timeValidated: false,
    releaseApproved: false,
    exploredStates: 0,
    discoveredStates: 0,
    attemptedTransitions: 0,
    improvedStateCosts: 0,
    reasons: []
  };
  const proof = level.dailyProof;
  if (!proof || proof.kind !== "seam-chambers-v1") {
    return { ...result, status: "unsupported", termination: "unsupported", reasons: ["No seam-chamber composition certificate is authored."] };
  }
  const componentWidth = proof.componentWidth;
  const componentHeight = proof.componentHeight;
  const componentCount = proof.componentCount;
  const componentFloor = proof.componentFloor;
  const expectedFloor = componentCount * componentFloor;
  const errors = [];
  if (![componentWidth, componentHeight, componentCount, componentFloor].every(Number.isSafeInteger) || componentWidth < 1 || componentHeight < 1 || componentCount < 1 || componentFloor < 1) {
    errors.push("Composition dimensions and floors must be positive integers.");
  }
  if (level.width !== componentWidth || level.height !== componentHeight * componentCount) {
    errors.push("Composition dimensions do not match the LevelSpec.");
  }
  if (options.floor !== expectedFloor) errors.push(`Requested floor ${options.floor} is not the declared sum ${expectedFloor}.`);
  const seams = level.seams ?? [];
  for (let index = 1; index < componentCount; index += 1) {
    const seam = seams.find((candidate) => candidate.orientation === "horizontal" && candidate.offset === index * componentHeight);
    if (!seam || seam.start !== 0 || seam.size !== componentWidth) errors.push(`Missing full-width seam before chamber ${index}.`);
  }
  if (level.flipDoors?.length || level.shutters?.length || level.generators?.length || level.elevators?.length || level.conveyors?.length || level.coloredGrids?.length) {
    errors.push("Static seam composition cannot certify dynamic or cross-component mechanisms.");
  }
  if (errors.length) return { ...result, status: "invalid", termination: "invalid", reasons: errors };
  const componentProofs = [];
  const componentRoutes = [];
  try {
    for (let index = 0; index < componentCount; index += 1) {
      const y0 = index * componentHeight;
      const inComponent = (x, y) => x >= 0 && x < componentWidth && y >= y0 && y < y0 + componentHeight;
      const componentBlocks = level.blocks.filter((block) => block.shape.every(([dx, dy]) => inComponent(block.x + dx, block.y + dy))).map((block) => ({ ...block, x: block.x, y: block.y - y0, shape: block.shape.map(([x, y]) => [x, y]) }));
      const componentGates = level.gates.filter((gate) => gate.offset >= y0 && gate.offset < y0 + componentHeight).map((gate) => ({ ...gate, offset: gate.offset - y0 }));
      const component = {
        ...structuredClone(level),
        id: level.id,
        name: `${level.name} chamber ${index + 1}`,
        width: componentWidth,
        height: componentHeight,
        seams: void 0,
        playable: void 0,
        blocked: void 0,
        gates: componentGates,
        blocks: componentBlocks,
        dailyProof: void 0
      };
      const inner = checkRevisedRepositionFloor(component, {
        floor: componentFloor,
        maxStates: options.maxStates,
        maxDragStates: options.maxDragStates,
        maxTransitions: options.maxTransitions,
        maxMilliseconds: options.componentMaxMilliseconds ?? options.maxMilliseconds
      });
      componentProofs.push(inner);
      if (inner.status !== "threshold-proven") {
        return { ...result, status: inner.status, termination: inner.termination, exploredStates: inner.exploredStates, discoveredStates: inner.discoveredStates, attemptedTransitions: inner.attemptedTransitions, reasons: [`Chamber ${index + 1} did not prove floor ${componentFloor}.`, ...inner.reasons], composition: { componentCount, componentFloor, componentProofs } };
      }
      componentRoutes.push([]);
    }
    return {
      ...result,
      status: "threshold-proven",
      thresholdProven: true,
      termination: "below-threshold-exhausted",
      floor: expectedFloor,
      reasons: [`${componentCount} seam-separated chambers each proved floor ${componentFloor}; summed lower bound is ${expectedFloor}.`],
      composition: { componentCount, componentFloor, componentProofs }
    };
  } catch (error) {
    return { ...result, status: "invalid", termination: "invalid", reasons: [error instanceof Error ? error.message : String(error)], composition: { componentCount, componentFloor, componentProofs } };
  }
};
var STEPS2 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
var SIDES2 = ["top", "right", "bottom", "left"];
var stateKey = (snapshot) => {
  const { moves: _moves, ...state } = snapshot;
  return JSON.stringify(state);
};
var BudgetReached = class extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
};
var positiveInteger = (value, fallback, label) => {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1) throw new Error(`${label} must be a positive safe integer.`);
  return result;
};
var checkRevisedRepositionFloor = (level, options) => {
  const result = {
    status: "unknown",
    termination: "below-threshold-exhausted",
    floor: options.floor,
    thresholdProven: false,
    abstraction: "optional-exit-unit-step-gesture-superset-v1",
    hashBindingRequired: true,
    solvabilityValidated: false,
    pointerReplayValidated: false,
    timeValidated: false,
    releaseApproved: false,
    exploredStates: 0,
    discoveredStates: 0,
    attemptedTransitions: 0,
    improvedStateCosts: 0,
    reasons: []
  };
  if (level.dailyProof?.kind === "seam-chambers-v1") {
    return checkSeamSeparatedChamberFloor(level, options);
  }
  const unsupported = [];
  if (level.mechanismRules !== void 0 && !["revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2", "revised-2026-09-23-v1.4", "revised-2026-09-27-v1.5"].includes(level.mechanismRules)) {
    unsupported.push("Only known revised profiles or an explicit legacy profile are supported.");
  }
  if (["revised-2026-09-23-v1.4", "revised-2026-09-27-v1.5"].includes(level.mechanismRules ?? "") && level.flipDoors?.length) {
    unsupported.push("v1.4/v1.5 deferred flip-door animation interleavings are not qualified for this bound tool.");
  }
  if (level.blocks.some((block) => block.timedBombSeconds !== void 0)) unsupported.push("Bomb clocks are not yet qualified for this bound tool.");
  if (level.generators?.some((generator) => generator.trigger === "time" || generator.intervalSeconds !== void 0 || generator.initialDelaySeconds !== void 0)) unsupported.push("Clock-driven generators are unsupported.");
  if (level.elevators?.length || level.conveyors?.length) unsupported.push("Legacy autonomous platforms/conveyors are unsupported.");
  if (level.blocks.some((block) => block.rotationBadge)) unsupported.push("Legacy rotation metadata is unsupported.");
  if (level.shutters?.some((cover) => cover.skin === "staging" || cover.skin === "staged-frame" || cover.skin === "generator")) {
    unsupported.push("Legacy nonspatial staging/generator covers are unsupported.");
  }
  if (unsupported.length) return { ...result, status: "unsupported", termination: "unsupported", reasons: unsupported };
  try {
    const floor = positiveInteger(options.floor, 0, "floor");
    const maxStates = positiveInteger(options.maxStates, 5e3, "maxStates");
    const maxDragStates = positiveInteger(options.maxDragStates, 1e3, "maxDragStates");
    const maxTransitions = positiveInteger(options.maxTransitions, 25e4, "maxTransitions");
    const milliseconds = positiveInteger(options.maxMilliseconds, 5e3, "maxMilliseconds");
    const deadline = Date.now() + milliseconds;
    const checkDeadline = () => {
      if (Date.now() >= deadline) throw new BudgetReached("deadline");
    };
    const spend = () => {
      checkDeadline();
      if (result.attemptedTransitions >= maxTransitions) throw new BudgetReached("max-transitions");
      result.attemptedTransitions += 1;
    };
    const initial = new PuzzleModel(structuredClone(level));
    initial.startCountdown();
    const initialKey = stateKey(initial.snapshot());
    const nodes = [{ model: initial, key: initialKey, cost: 0, parent: -1 }];
    const distances = /* @__PURE__ */ new Map([[initialKey, 0]]);
    const deque = /* @__PURE__ */ new Map([[0, 0]]);
    let front = 0, back = 1;
    result.discoveredStates = 1;
    const routeTo = (index) => {
      const route = [];
      while (nodes[index].parent >= 0) {
        route.push(nodes[index].drag);
        index = nodes[index].parent;
      }
      return route.reverse();
    };
    const enqueue = (parent, drag) => {
      const model = nodes[parent].model.clone();
      const before = model.snapshot();
      model.beginAction();
      for (const [x, y] of drag.path) {
        spend();
        if (!model.moveBlockStep(drag.blockId, x, y)) throw new Error("Relaxed gesture replay rejected a step.");
      }
      if (drag.exitSide) {
        spend();
        if (!model.tryExit(drag.blockId, drag.exitSide).ok) throw new Error("Relaxed gesture replay rejected an exit.");
      }
      if (!model.commitAction()) throw new Error("Relaxed gesture had no effective mutation.");
      const after = model.snapshot();
      if (after.failed || after.moves !== before.moves + 1 || after.cleared < before.cleared) throw new Error("Invalid relaxed gesture state.");
      const edgeCost = Number(after.cleared === before.cleared);
      const cost = nodes[parent].cost + edgeCost;
      if (cost >= floor) return;
      const key = stateKey(after);
      const prior = distances.get(key);
      if (prior !== void 0 && prior <= cost) return;
      if (prior === void 0 && distances.size >= maxStates) throw new BudgetReached("max-states");
      if (prior !== void 0) result.improvedStateCosts += 1;
      distances.set(key, cost);
      result.discoveredStates = distances.size;
      nodes.push({ model, key, cost, parent, drag });
      const index = nodes.length - 1;
      if (edgeCost === 0) deque.set(--front, index);
      else deque.set(back++, index);
    };
    while (front < back) {
      checkDeadline();
      const parent = deque.get(front);
      deque.delete(front++);
      const node = nodes[parent];
      if (distances.get(node.key) !== node.cost) continue;
      result.exploredStates += 1;
      if (node.model.snapshot().complete) return {
        ...result,
        status: "relaxed-shortcut",
        termination: "relaxed-completion",
        relaxedNonClearingDrags: node.cost,
        relaxedRoute: routeTo(parent),
        reasons: ["A completion below the floor exists only in the relaxed graph; actual difficulty/solvability requires independent pointer and time validation."]
      };
      for (const selected of node.model.snapshot().blocks) {
        if (!node.model.isBlockActive(selected)) continue;
        const inner = [{ model: node.model, path: [] }];
        const innerSeen = /* @__PURE__ */ new Set([node.key]);
        for (let cursor = 0; cursor < inner.length; cursor += 1) {
          checkDeadline();
          const current = inner[cursor];
          const held = current.model.getBlock(selected.id);
          if (!held) throw new Error("Held block disappeared without an exit.");
          if (current.path.length) enqueue(parent, { blockId: held.id, path: current.path });
          for (const side of SIDES2) {
            spend();
            if (current.model.exitAttemptStatus(held.id, side) === "ok") enqueue(parent, { blockId: held.id, path: current.path, exitSide: side });
          }
          for (const [dx, dy] of STEPS2) {
            spend();
            const next = current.model.clone();
            next.beginAction();
            const target = [held.x + dx, held.y + dy];
            if (!next.moveBlockStep(held.id, ...target)) continue;
            const key = stateKey(next.snapshot());
            if (innerSeen.has(key)) continue;
            if (innerSeen.size >= maxDragStates) throw new BudgetReached("max-drag-states");
            innerSeen.add(key);
            inner.push({ model: next, path: [...current.path, target] });
          }
        }
      }
    }
    return {
      ...result,
      status: "threshold-proven",
      thresholdProven: true,
      reasons: ["All relaxed states of cost strictly below the floor were exhausted without completion. This proves only the threshold; it does not prove the level solvable or approved."]
    };
  } catch (error) {
    if (error instanceof BudgetReached) return {
      ...result,
      status: "unknown",
      termination: error.reason,
      reasons: ["Search interrupted before complete below-threshold exhaustion; no bound was certified."]
    };
    return { ...result, status: "invalid", termination: "invalid", reasons: [error instanceof Error ? error.message : String(error)] };
  }
};
var componentKey = ([x, y]) => `${x},${y}`;
var translatePoint = ([x, y], minX, minY) => [x - minX, y - minY];
var gatePortals2 = (gate, width, height) => {
  if (gate.portals?.length) return gate.portals.map((portal) => ({ ...portal, origin: [...portal.origin] }));
  const origin = gate.side === "left" ? [0, gate.offset] : gate.side === "right" ? [width - 1, gate.offset] : gate.side === "top" ? [gate.offset, 0] : [gate.offset, height - 1];
  return [{ side: gate.side, origin, size: gate.size }];
};
var translatedGate = (gate, width, height, minX, minY) => {
  const portals = gatePortals2(gate, width, height).map((portal) => ({
    ...portal,
    origin: translatePoint(portal.origin, minX, minY)
  }));
  const first = portals[0];
  return {
    ...gate,
    offset: first.side === "left" || first.side === "right" ? first.origin[1] : first.origin[0],
    portals
  };
};
var seamComponents = (level) => {
  const playable = level.playable ?? Array.from({ length: level.height }, (_, y) => Array.from({ length: level.width }, (_2, x) => [x, y])).flat();
  const allowed = new Set(playable.map(componentKey));
  const visited = /* @__PURE__ */ new Set();
  const components = [];
  for (const start of playable) {
    const startKey = componentKey(start);
    if (visited.has(startKey)) continue;
    const component = [];
    const queue = [start];
    visited.add(startKey);
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      for (const next of [
        [current[0] + 1, current[1]],
        [current[0] - 1, current[1]],
        [current[0], current[1] + 1],
        [current[0], current[1] - 1]
      ]) {
        const key = componentKey(next);
        if (!allowed.has(key) || visited.has(key) || boardCellsSeparatedBySeam(level, current, next)) continue;
        visited.add(key);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
};
var hasIndependentGlobalMechanism = (level) => {
  if (!level.seams?.length) return "No board seams were authored.";
  if (level.flipDoors?.length) return "Flip doors toggle globally and are not component-separable.";
  if (level.coloredGrids?.length) return "Colored grids cross the component proof boundary.";
  if (level.shutters?.length || level.generators?.length) return "Shutters and generators have cross-clear/reveal state.";
  if (level.elevators?.length || level.conveyors?.length) return "Autonomous platforms are not component-separable.";
  if (level.blocks.some((block) => block.frozen !== void 0 || block.keyId || block.lockedBy || block.timedBombSeconds !== void 0)) return "Frozen, key-locked and timed blocks are excluded from the static sum.";
  if (level.gates.some((gate) => gate.frozen !== void 0)) return "Frozen gates have global clear countdown semantics.";
  if (level.rocketRescue || level.pulseRescue || level.strategyNudge || level.strategyFocus) {
    return "Rescue/strategy triggers are excluded from the static component sum.";
  }
  return void 0;
};
var checkRevisedIndependentSeamFloor = (level, options) => {
  const base = {
    status: "not-applicable",
    termination: "not-applicable",
    floor: options.floor,
    thresholdProven: false,
    abstraction: "static-seam-component-sum-v1",
    hashBindingRequired: true,
    solvabilityValidated: false,
    pointerReplayValidated: false,
    timeValidated: false,
    releaseApproved: false,
    componentFloorSum: 0,
    components: [],
    reasons: []
  };
  const unsupported = hasIndependentGlobalMechanism(level);
  if (unsupported) return { ...base, status: level.seams?.length ? "unsupported" : "not-applicable", termination: level.seams?.length ? "unsupported" : "not-applicable", reasons: [unsupported] };
  const components = seamComponents(level).filter((component) => {
    const keys = new Set(component.map(componentKey));
    return level.blocks.some((block) => block.shape.every(([dx, dy]) => keys.has(`${block.x + dx},${block.y + dy}`)));
  });
  if (components.length < 2) return { ...base, reasons: ["At least two non-empty seam-separated components are required."] };
  const proofs = [];
  try {
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const component = components[componentIndex];
      const componentKeys = new Set(component.map(componentKey));
      const minX = Math.min(...component.map(([x]) => x));
      const minY = Math.min(...component.map(([, y]) => y));
      const maxX = Math.max(...component.map(([x]) => x));
      const maxY = Math.max(...component.map(([, y]) => y));
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const blocks = level.blocks.filter((block) => block.shape.every(([dx, dy]) => componentKeys.has(`${block.x + dx},${block.y + dy}`))).map((block) => ({ ...block, x: block.x - minX, y: block.y - minY, shape: block.shape.map(([x, y]) => [x, y]) }));
      const gates = level.gates.filter((gate) => gatePortals2(gate, level.width, level.height).every((portal) => {
        const [px, py] = portal.origin;
        for (let index = 0; index < portal.size; index += 1) {
          const point = portal.side === "left" || portal.side === "right" ? [px, py + index] : [px + index, py];
          if (!componentKeys.has(componentKey(point))) return false;
        }
        return true;
      })).map((gate) => translatedGate(gate, level.width, level.height, minX, minY));
      if (!gates.length) throw new Error(`Component ${componentIndex} has no complete boundary gate.`);
      const playable = component.map((point) => translatePoint(point, minX, minY));
      const blocked = (level.blocked ?? []).filter(([x, y]) => componentKeys.has(`${x},${y}`)).map((point) => translatePoint(point, minX, minY));
      const atomicLevel = {
        mechanismRules: level.mechanismRules,
        id: level.id * 1e3 + componentIndex + 1,
        name: `${level.name}\xB7component-${componentIndex + 1}`,
        difficulty: level.difficulty,
        timeSeconds: level.timeSeconds,
        reward: 0,
        width,
        height,
        playable,
        blocked,
        gates,
        blocks
      };
      let lowerBound = 0;
      let atomic;
      const maxFloor = Math.max(1, options.floor);
      for (let floor = 1; floor <= maxFloor + 1; floor += 1) {
        const candidate = checkRevisedRepositionFloor(atomicLevel, { ...options, floor });
        if (candidate.status === "threshold-proven") continue;
        if (candidate.status === "relaxed-shortcut") {
          lowerBound = floor - 1;
          atomic = candidate;
          break;
        }
        return { ...base, status: candidate.status === "unsupported" ? "unsupported" : "unknown", termination: candidate.termination, reasons: [`Component ${componentIndex} proof failed: ${candidate.reasons.join(" ")}`], components: proofs };
      }
      if (!atomic) return { ...base, status: "unknown", termination: "max-states", reasons: [`Component ${componentIndex} proof did not find a relaxed completion within the requested floor budget.`], components: proofs };
      proofs.push({ componentIndex, bounds: { minX, minY, width, height }, blockIds: blocks.map((block) => block.id), lowerBound, atomic });
    }
  } catch (error) {
    return { ...base, status: "invalid", termination: "invalid", reasons: [error instanceof Error ? error.message : String(error)], components: proofs };
  }
  const componentFloorSum = proofs.reduce((sum, proof) => sum + proof.lowerBound, 0);
  if (componentFloorSum < options.floor) return { ...base, status: "unknown", termination: "max-states", componentFloorSum, components: proofs, reasons: [`Independent component lower-bound sum ${componentFloorSum} is below requested floor ${options.floor}.`] };
  return { ...base, status: "threshold-proven", termination: "below-threshold-exhausted", thresholdProven: true, componentFloorSum, components: proofs, reasons: [`${proofs.length} seam-separated static components proved independently; lower bounds sum to ${componentFloorSum}.`] };
};
export {
  checkRevisedIndependentSeamFloor,
  checkRevisedRepositionFloor,
  replayRevisedRoute,
  searchRevisedLevel,
  validateLevel
};
