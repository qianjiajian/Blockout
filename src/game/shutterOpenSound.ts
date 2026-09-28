import { REVISED_REGION_TIMING } from "./revisedRegionAnimation";

interface ShutterSoundTransition {
  kind: string;
  age: number;
  initial?: boolean;
  openingSoundPlayed?: boolean;
}

/** Consume at the visual opening edge, before the transition is retired.
 * The caller advances ages only during visible gameplay. Consume even while
 * muted so enabling sound later cannot replay an already-opened curtain.
 */
export const consumeShutterOpenSound = (
  transition: ShutterSoundTransition,
  reducedMotion = false,
): boolean => {
  if (transition.kind !== "shutter" || transition.initial || transition.openingSoundPlayed) return false;
  const openingTime = REVISED_REGION_TIMING.shutterOpeningStart * (reducedMotion ? 0.5 : 1);
  if (!Number.isFinite(transition.age) || transition.age < openingTime) return false;
  transition.openingSoundPlayed = true;
  return true;
};
