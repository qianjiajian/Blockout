import { shutterHasPhysicalFootprint, type BlockState, type PuzzleSnapshot, type ShutterState } from "../core/types";
import { usesRevisedMechanisms } from "../core/mechanismRules";

type VisibilitySnapshot = Pick<PuzzleSnapshot, "mechanismRules" | "shutters">;

/** Visual policy only: legacy real curtains use the same reference art/motion.
 * Do not migrate their model-owned counters, reveal rules or clock profile.
 */
export const usesReferenceRegionVisuals = (
  snapshot: Pick<PuzzleSnapshot, "mechanismRules">,
  region: Pick<ShutterState, "skin">,
): boolean => region.skin == null || region.skin === "shutter"
  || (region.skin === "lift" && usesRevisedMechanisms(snapshot));

/** The renderer and pointer collision world consume model-owned reveal state. */
export const isMechanismRegionRevealed = (
  snapshot: Pick<PuzzleSnapshot, "mechanismRules">,
  shutter: ShutterState,
): boolean => usesRevisedMechanisms(snapshot)
  ? shutter.revealed === true
  : shutter.count <= 0;

export const isMechanismBlockVisible = (
  snapshot: VisibilitySnapshot,
  block: Pick<BlockState, "shutterId">,
): boolean => {
  if (!block.shutterId) return true;
  const shutter = snapshot.shutters.find(({ id }) => id === block.shutterId);
  return !shutter || isMechanismRegionRevealed(snapshot, shutter);
};

export const isMechanismRegionBlocking = (
  snapshot: Pick<PuzzleSnapshot, "mechanismRules">,
  shutter: ShutterState,
): boolean => shutterHasPhysicalFootprint(
  usesRevisedMechanisms(snapshot)
    ? { ...shutter, count: isMechanismRegionRevealed(snapshot, shutter) ? 0 : Math.max(1, shutter.count) }
    : shutter,
);
