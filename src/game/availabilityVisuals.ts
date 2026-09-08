import type { GateReadiness } from "./gateReadiness";

export interface LockedTargetVisualTreatment {
  baseAlpha: number;
  overlayAlpha: number;
  shadowBlur: number;
}

const ACTIVE_TARGET: LockedTargetVisualTreatment = {
  baseAlpha: 1,
  overlayAlpha: 0,
  shadowBlur: 5,
};

const FROZEN_GATE: LockedTargetVisualTreatment = {
  baseAlpha: 0.38,
  overlayAlpha: 0.54,
  shadowBlur: 4,
};

const LATENT_GATE: LockedTargetVisualTreatment = {
  baseAlpha: 0.52,
  overlayAlpha: 0,
  shadowBlur: 3,
};

const FROZEN_BLOCK: LockedTargetVisualTreatment = {
  baseAlpha: 0.58,
  overlayAlpha: 0.64,
  shadowBlur: 5,
};

export const gateAvailabilityVisual = (frozen: number): LockedTargetVisualTreatment => (
  frozen > 0 ? FROZEN_GATE : ACTIVE_TARGET
);

export const gateReadinessVisual = (readiness: GateReadiness): LockedTargetVisualTreatment => (
  readiness === "frozen" ? FROZEN_GATE : readiness === "latent" ? LATENT_GATE : ACTIVE_TARGET
);

export const blockAvailabilityVisual = (frozen: number): LockedTargetVisualTreatment => (
  frozen > 0 ? FROZEN_BLOCK : ACTIVE_TARGET
);
