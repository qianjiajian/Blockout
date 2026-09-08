import { describe, expect, it } from "vitest";
import { blockAvailabilityVisual, gateAvailabilityVisual, gateReadinessVisual } from "../src/game/availabilityVisuals";

describe("locked target visual hierarchy", () => {
  it("keeps available exits fully prominent", () => {
    expect(gateAvailabilityVisual(0)).toEqual({ baseAlpha: 1, overlayAlpha: 0, shadowBlur: 5 });
  });

  it("de-emphasizes frozen exits more strongly than frozen blocks", () => {
    const gate = gateAvailabilityVisual(3);
    const block = blockAvailabilityVisual(1);
    expect(gate.baseAlpha).toBeLessThan(block.baseAlpha);
    expect(gate.overlayAlpha).toBeLessThan(block.overlayAlpha);
    expect(gate.baseAlpha).toBeLessThan(0.5);
    expect(block.baseAlpha).toBeGreaterThanOrEqual(0.55);
  });

  it("uses the same locked treatment for every positive counter", () => {
    expect(gateAvailabilityVisual(1)).toEqual(gateAvailabilityVisual(5));
    expect(blockAvailabilityVisual(1)).toEqual(blockAvailabilityVisual(5));
  });

  it("places latent exits between actionable and frozen targets", () => {
    const actionable = gateReadinessVisual("actionable");
    const latent = gateReadinessVisual("latent");
    const frozen = gateReadinessVisual("frozen");
    expect(actionable.baseAlpha).toBeGreaterThan(latent.baseAlpha);
    expect(latent.baseAlpha).toBeGreaterThan(frozen.baseAlpha);
    expect(latent.overlayAlpha).toBe(0);
  });
});
