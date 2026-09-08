import type { BlockState, PuzzleSnapshot } from "../core/types";
import type { ContinuousPose } from "./continuousDrag";

const CONTACT_EPSILON = 1e-3;
const CONTACT_PROBE = 0.12;

const overlapsCell = (
  x: number,
  y: number,
  cellX: number,
  cellY: number,
): boolean => (
  x < cellX + 1 - CONTACT_EPSILON
  && x + 1 > cellX + CONTACT_EPSILON
  && y < cellY + 1 - CONTACT_EPSILON
  && y + 1 > cellY + CONTACT_EPSILON
);

const isVisibleMovableBlock = (snapshot: PuzzleSnapshot, block: BlockState): boolean => {
  if (block.frozen > 0) return false;
  if (!block.shutterId) return true;
  return !snapshot.shutters.some((shutter) => shutter.id === block.shutterId && shutter.count > 0);
};

/**
 * Finds a movable block overlapping a probed floating pose. Board rims,
 * permanent voids, frozen blocks, and closed shutters deliberately return no
 * target: the focus effect only promises "this other movable block is in the
 * way", never a direction or a solution.
 */
export const blockingBlockAtPose = (
  snapshot: PuzzleSnapshot,
  blockId: string,
  pose: ContinuousPose,
): string | undefined => {
  const moving = snapshot.blocks.find((block) => block.id === blockId);
  if (!moving) return undefined;

  for (const other of snapshot.blocks) {
    if (other.id === blockId || !isVisibleMovableBlock(snapshot, other)) continue;
    const collides = moving.shape.some(([movingX, movingY]) => other.shape.some(([otherX, otherY]) => (
      overlapsCell(
        pose.x + movingX,
        pose.y + movingY,
        other.x + otherX,
        other.y + otherY,
      )
    )));
    if (collides) return other.id;
  }
  return undefined;
};

export interface BlockingSweepInput {
  pose: ContinuousPose;
  pointerDelta: ContinuousPose;
  blockedX: boolean;
  blockedY: boolean;
}

/**
 * Probes just beyond the accepted swept pose on each axis that actually
 * collided. Dominant pointer intent is checked first, matching drag handling.
 */
export const blockingBlockForSweep = (
  snapshot: PuzzleSnapshot,
  blockId: string,
  input: BlockingSweepInput,
): string | undefined => {
  const probes: ContinuousPose[] = [];
  const xProbe = input.blockedX && Math.abs(input.pointerDelta.x) > CONTACT_EPSILON
    ? { x: input.pose.x + Math.sign(input.pointerDelta.x) * CONTACT_PROBE, y: input.pose.y }
    : undefined;
  const yProbe = input.blockedY && Math.abs(input.pointerDelta.y) > CONTACT_EPSILON
    ? { x: input.pose.x, y: input.pose.y + Math.sign(input.pointerDelta.y) * CONTACT_PROBE }
    : undefined;
  if (xProbe && yProbe) {
    if (Math.abs(input.pointerDelta.x) >= Math.abs(input.pointerDelta.y)) probes.push(xProbe, yProbe);
    else probes.push(yProbe, xProbe);
    probes.push({ x: xProbe.x, y: yProbe.y });
  } else if (xProbe) probes.push(xProbe);
  else if (yProbe) probes.push(yProbe);

  for (const probe of probes) {
    const blocker = blockingBlockAtPose(snapshot, blockId, probe);
    if (blocker) return blocker;
  }
  return undefined;
};
