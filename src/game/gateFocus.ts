import type { BlockState, GateState } from "../core/types";

export const gateIsAvailableTarget = (block: BlockState | undefined, gate: GateState): boolean => {
  if (!block || block.frozen > 0 || gate.frozen > 0) return false;
  const activeColor = block.layers[0] ?? block.color;
  if (gate.color !== activeColor) return false;
  return !block.star || Boolean(gate.star);
};

export const availableGateTargets = (block: BlockState | undefined, gates: readonly GateState[]): GateState[] => (
  gates.filter((gate) => gateIsAvailableTarget(block, gate))
);
