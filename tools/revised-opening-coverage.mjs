/** v1.4 layout subcheck on a settled, authoritative PuzzleModel snapshot.
 * Not a complete level validator or evidence of solvability/difficulty.
 * Never use raw authored blocks: queued cargo/automatic releases differ.
 */
export function auditOpeningCoverage(snapshot) {
  const issues = [], occupied = new Map();
  const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isSafeInteger);
  if (!snapshot || !Array.isArray(snapshot.playable) || !snapshot.playable.length
    || !snapshot.playable.every(point) || !Array.isArray(snapshot.blocks) || !Array.isArray(snapshot.shutters)) {
    return { passed: false, issues: [{ code: 'invalid-coverage-snapshot' }], releaseApproved: false };
  }
  const playable = new Set(snapshot.playable.map(p => p.join(',')));
  const queuedIds = new Set((snapshot.queuedBlocks ?? []).map(b => b.id));
  const shutters = new Map(snapshot.shutters.map(s => [s.id, s]));
  const visible = snapshot.blocks.filter(b => !queuedIds.has(b.id)
    && (!b.shutterId || shutters.get(b.shutterId)?.revealed === true));
  const add = (x, y, owner) => {
    const key = `${x},${y}`;
    if (!playable.has(key)) issues.push({ code: 'coverage-outside-playable', cell: [x, y], owner });
    if (occupied.has(key)) issues.push({ code: 'opening-coverage-overlap', cell: [x, y], owners: [occupied.get(key), owner] });
    else occupied.set(key, owner);
  };
  let visibleBlockCells = 0, shutterCells = 0;
  for (const b of visible) {
    if (!Number.isSafeInteger(b.x) || !Number.isSafeInteger(b.y) || !Array.isArray(b.shape) || !b.shape.length || !b.shape.every(point)) {
      issues.push({ code: 'invalid-coverage-block', id: b.id }); continue;
    }
    for (const [dx, dy] of b.shape) { add(b.x + dx, b.y + dy, `block:${b.id}`); visibleBlockCells++; }
  }
  for (const s of snapshot.shutters) {
    // Revealed is authoritative under revised rules: a zero-count curtain
    // can still be waiting for collision-safe release of its entire cohort.
    const closed = s.revealed === false || (s.revealed !== true && s.count > 0);
    if (!closed || (s.skin !== undefined && s.skin !== 'shutter')) continue;
    if (![s.x, s.y, s.width, s.height].every(Number.isSafeInteger) || s.width < 1 || s.height < 1 || s.width * s.height > playable.size) {
      issues.push({ code: 'invalid-coverage-shutter', id: s.id }); continue;
    }
    if (!snapshot.blocks.some(b => b.shutterId === s.id)) {
      issues.push({ code: 'empty-coverage-shutter', id: s.id }); continue;
    }
    for (let y = s.y; y < s.y + s.height; y++) for (let x = s.x; x < s.x + s.width; x++) {
      add(x, y, `shutter:${s.id}`); shutterCells++;
    }
  }
  const uncoveredCells = snapshot.playable.filter(p => !occupied.has(p.join(',')));
  if (uncoveredCells.length) issues.push({ code: 'opening-not-filled', cells: uncoveredCells });
  const coveredCells = [...occupied.keys()].filter(k => playable.has(k)).length;
  return { passed: issues.length === 0, playableCells: playable.size, coveredCells,
    visibleBlockCount: visible.length, visibleBlockCells, shutterCells,
    coverageRatio: coveredCells / playable.size, uncoveredCells, issues, releaseApproved: false };
}
