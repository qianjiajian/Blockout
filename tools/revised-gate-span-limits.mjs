/** v1.8 candidate contract; this does not mutate gates or relax collisions. */
export function auditGateSpanLimits(level) {
  const issues = [], portals = [];
  for (const gate of [...(level.gates ?? []), ...(level.flipDoors ?? [])]) {
    for (const portal of gate.portals?.length ? gate.portals : [gate]) {
      const { side, size } = portal;
      if (!['top', 'bottom', 'left', 'right'].includes(side) || !Number.isInteger(size) || size < 1) {
        issues.push({ code: 'invalid-gate-span', gateId: gate.id, side, size });
        continue;
      }
      const horizontalExit = side === 'left' || side === 'right';
      const tangent = horizontalExit ? 1 : 0;
      const blocks = (level.blocks ?? []).filter(block => (
        (block.layers ?? [block.color]).includes(gate.color)
        && (!block.star || gate.star)
        && (!block.movementAxis || block.movementAxis === (horizontalExit ? 'horizontal' : 'vertical'))
      )).map(block => ({
        id: block.id,
        span: block.shape?.length
          ? Math.max(...block.shape.map(cell => cell[tangent])) - Math.min(...block.shape.map(cell => cell[tangent])) + 1
          : NaN,
      }));
      if (blocks.some(block => !Number.isInteger(block.span) || block.span < 1)) {
        issues.push({ code: 'invalid-block-span', gateId: gate.id });
        continue;
      }
      const requiredSpan = Math.max(0, ...blocks.map(block => block.span));
      const allowedMax = Math.max(3, requiredSpan);
      const measurement = { gateId: gate.id, color: gate.color, side, size, requiredSpan, allowedMax,
        wideBlockIds: blocks.filter(block => block.span === requiredSpan && block.span > 3).map(block => block.id) };
      portals.push(measurement);
      if (size > allowedMax) issues.push({ code: 'gate-span-exceeds-needed-width', ...measurement });
      else if (size > 3 && size !== requiredSpan) issues.push({ code: 'wide-gate-not-required-span', ...measurement });
    }
  }
  return { passed: issues.length === 0, issues, portals,
    wideExceptions: portals.filter(portal => portal.size > 3 && portal.size === portal.requiredSpan) };
}
