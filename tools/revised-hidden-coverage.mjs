/**
 * v1.22 authoring-only subcheck of each authored hidden batch's initial footprint.
 * This deliberately does not run from PuzzleModel construction: historical maps
 * remain loadable and must be reported, not silently migrated or made to crash.
 * A pass is neither a full mechanism audit nor a solvability/difficulty certificate.
 */
const REVISED_PROFILES = new Set([
  'revised-2026-09-21', 'revised-2026-09-21-v1.1', 'revised-2026-09-21-v1.2',
  'revised-2026-09-23-v1.3', 'revised-2026-09-23-v1.4',
  'revised-2026-09-27-v1.5',
]);
// A resource guard, not an additional gameplay size rule; oversized input fails
// explicitly as unaudited rather than hanging or receiving a truncated pass.
const MAX_AUDIT_CELLS = 100_000;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && value.length > 0 && value.trim() === value;
const point = value => Array.isArray(value) && value.length === 2 && value.every(Number.isSafeInteger);
const key = ([x, y]) => `${x},${y}`;

export function auditHiddenCoverage(level) {
  const issues = [], regions = [];
  const add = (code, details = {}, region) => {
    const issue = { code, ...details };
    issues.push(issue);
    if (region) region.issues.push(issue);
  };
  const finish = () => ({
    passed: issues.length === 0,
    regions,
    regionCount: regions.length,
    totalCells: regions.reduce((sum, region) => sum + region.regionCells, 0),
    coveredCells: regions.reduce((sum, region) => sum + region.coveredCells, 0),
    missingCells: regions.reduce((sum, region) => sum + region.missingCells, 0),
    issues,
    releaseApproved: false,
    solvabilityValidated: false,
  });
  if (!object(level) || !Array.isArray(level.blocks)) {
    add('invalid-hidden-coverage-level'); return finish();
  }
  if (![level.width, level.height].every(Number.isSafeInteger) || level.width <= 0 || level.height <= 0) {
    add('invalid-board-dimensions'); return finish();
  }
  if (!Number.isSafeInteger(level.width * level.height) || level.width * level.height > MAX_AUDIT_CELLS) {
    add('hidden-coverage-resource-limit'); return finish();
  }
  const arrays = {};
  for (const field of ['shutters', 'generators', 'elevators', 'playable', 'blocked']) {
    if (level[field] !== undefined && !Array.isArray(level[field])) add('invalid-collection', { field });
    arrays[field] = Array.isArray(level[field]) ? level[field] : [];
  }
  const revised = REVISED_PROFILES.has(level.mechanismRules);
  if (level.mechanismRules !== undefined && !revised) add('unknown-mechanism-profile');
  const boardCell = ([x, y]) => x >= 0 && y >= 0 && x < level.width && y < level.height;
  const pointSet = field => {
    const result = new Set();
    for (const [index, cell] of arrays[field].entries()) {
      if (!point(cell) || !boardCell(cell)) { add('invalid-board-cell', { field, index }); continue; }
      if (result.has(key(cell))) add('duplicate-board-cell', { field, cell: [...cell] });
      result.add(key(cell));
    }
    return result;
  };
  const playable = level.playable === undefined ? undefined : pointSet('playable');
  const blocked = pointSet('blocked');
  const isPlayable = cell => boardCell(cell) && (!playable || playable.has(key(cell))) && !blocked.has(key(cell));
  const allIds = new Map(), blockIds = new Map(), shutterIds = new Map();
  const register = (entry, index, field, local) => {
    if (!object(entry) || !id(entry.id)) { add('invalid-entity-id', { field, index }); return; }
    // Block IDs and shutter IDs are separate runtime namespaces. Sharing a
    // spelling across them does not make a shutterId reference ambiguous.
    const identity = `${field}:${entry.id}`;
    if (allIds.has(identity)) add('duplicate-entity-id', { id: entry.id, field, index, previous: allIds.get(identity) });
    else allIds.set(identity, index);
    if (local) local.set(entry.id, (local.get(entry.id) ?? 0) + 1);
  };
  level.blocks.forEach((entry, index) => register(entry, index, 'blocks', blockIds));
  arrays.shutters.forEach((entry, index) => register(entry, index, 'shutters', shutterIds));
  arrays.generators.forEach((entry, index) => register(entry, index, 'generators'));
  arrays.elevators.forEach((entry, index) => {
    register(entry, index, 'elevators');
    add('legacy-moving-elevator-not-hidden-layer', { elevatorId: entry?.id, index });
  });

  // A GeneratorSpec is an external sequential queue, never a spatial layer.
  // Its independent mouth, ice and spawn rules belong to mechanism validation.
  const queued = new Set();
  for (const [index, generator] of arrays.generators.entries()) {
    if (!object(generator) || !Array.isArray(generator.queueBlockIds)) {
      add('invalid-generator-queue', { index }); continue;
    }
    for (const blockId of generator.queueBlockIds) {
      if (!id(blockId) || !blockIds.has(blockId)) add('unknown-queued-block', { generatorId: generator.id, blockId });
      if (queued.has(blockId)) add('duplicate-queued-block', { generatorId: generator.id, blockId });
      queued.add(blockId);
    }
  }
  const members = new Map();
  for (const [index, block] of level.blocks.entries()) {
    if (!object(block) || block.shutterId === undefined) continue;
    if (!id(block.shutterId) || !shutterIds.has(block.shutterId)) {
      add('unknown-hidden-region', { blockId: block.id, shutterId: block.shutterId, index }); continue;
    }
    if (shutterIds.get(block.shutterId) !== 1) add('ambiguous-hidden-region', { blockId: block.id, shutterId: block.shutterId });
    if (queued.has(block.id)) add('queued-and-hidden-block', { blockId: block.id, shutterId: block.shutterId });
    const batch = members.get(block.shutterId) ?? [];
    batch.push(block); members.set(block.shutterId, batch);
  }

  for (const [index, shutter] of arrays.shutters.entries()) {
    const ordinary = object(shutter) && (shutter.skin === undefined || shutter.skin === 'shutter');
    const lift = object(shutter) && shutter.skin === 'lift' && revised;
    const batch = members.get(shutter?.id) ?? [];
    const region = {
      shutterId: shutter?.id, index, kind: ordinary ? 'shutter' : lift ? 'lift' : 'unsupported',
      blockIds: batch.map(block => block.id), cells: [], covered: [], missing: [],
      regionCells: 0, coveredCells: 0, missingCells: 0, issues: [], passed: false,
    };
    regions.push(region);
    const detail = { shutterId: shutter?.id, index };
    if (!ordinary && !lift) add('unsupported-hidden-region', { ...detail, skin: shutter?.skin }, region);
    if (!id(shutter?.id) || shutterIds.get(shutter.id) !== 1) add('ambiguous-region-id', detail, region);
    if (revised && shutter?.triggerBlockIds !== undefined) add('unsupported-hidden-trigger-cohort', detail, region);
    if (!Number.isSafeInteger(shutter?.count) || shutter.count < 0) add('invalid-region-count', detail, region);
    if (!object(shutter) || ![shutter.x, shutter.y, shutter.width, shutter.height].every(Number.isSafeInteger)
      || shutter.width <= 0 || shutter.height <= 0
      || !Number.isSafeInteger(shutter.x + shutter.width) || !Number.isSafeInteger(shutter.y + shutter.height)) {
      add('invalid-hidden-region-geometry', detail, region); continue;
    }
    if (!Number.isSafeInteger(shutter.width * shutter.height) || shutter.width * shutter.height > MAX_AUDIT_CELLS) {
      add('hidden-coverage-resource-limit', detail, region); continue;
    }
    for (let y = shutter.y; y < shutter.y + shutter.height; y++) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x++) {
        const cell = [x, y]; region.cells.push(cell);
        if (!isPlayable(cell)) add('hidden-region-outside-playable', { ...detail, cell }, region);
      }
    }
    const cover = new Set(region.cells.map(key)), occupants = new Map();
    if (!batch.length) add('empty-hidden-batch', detail, region);
    for (const block of batch) {
      const owner = { ...detail, blockId: block.id };
      if (queued.has(block.id)) { add('queued-and-hidden-block', owner, region); continue; }
      if (blockIds.get(block.id) !== 1) add('ambiguous-hidden-block-id', owner, region);
      if (![block.x, block.y].every(Number.isSafeInteger) || !Array.isArray(block.shape) || !block.shape.length
        || !block.shape.every(point)) {
        add('invalid-hidden-block-shape', owner, region); continue;
      }
      const local = new Set();
      for (const offset of block.shape) {
        const offsetKey = key(offset);
        if (local.has(offsetKey)) add('duplicate-hidden-shape-cell', { ...owner, offset: [...offset] }, region);
        local.add(offsetKey);
      }
      const reached = new Set(), pending = [block.shape[0]];
      for (let cursor = 0; cursor < pending.length; cursor++) {
        const [x, y] = pending[cursor], at = key([x, y]);
        if (reached.has(at)) continue;
        reached.add(at);
        for (const neighbor of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (local.has(key(neighbor)) && !reached.has(key(neighbor))) pending.push(neighbor);
        }
      }
      if (reached.size !== local.size) add('disconnected-hidden-block-shape', owner, region);
      for (const [dx, dy] of block.shape) {
        const cell = [block.x + dx, block.y + dy];
        if (!cell.every(Number.isSafeInteger)) { add('invalid-hidden-block-cell', owner, region); continue; }
        const at = key(cell);
        if (!cover.has(at)) add('hidden-cell-outside-region', { ...owner, cell }, region);
        if (!isPlayable(cell)) add('hidden-cell-outside-playable', { ...owner, cell }, region);
        if (occupants.has(at)) add('hidden-cell-overlap', { ...owner, cell, otherBlockId: occupants.get(at) }, region);
        else occupants.set(at, block.id);
      }
    }
    // Only this exact shutterId cohort counts. Visible occupants, another lift
    // layer at the same coordinates, shells and external queues never fill gaps.
    region.covered = region.cells.filter(cell => occupants.has(key(cell)));
    region.missing = region.cells.filter(cell => !occupants.has(key(cell)));
    region.regionCells = region.cells.length;
    region.coveredCells = region.covered.length;
    region.missingCells = region.missing.length;
    if (region.missing.length) add('hidden-region-not-filled', { ...detail, cells: region.missing.map(cell => [...cell]) }, region);
    region.passed = region.issues.length === 0;
  }
  return finish();
}
