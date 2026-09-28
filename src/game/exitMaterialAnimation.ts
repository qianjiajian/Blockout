/** Visual time is advanced by the game's active frame clock, never wall timers. */
const unit = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};

export const shellPeelDuration = (reduced: boolean): number => reduced ? 0.14 : 0.34;

export const sampleShellPeel = (age: number, reduced = false) => {
  const duration = shellPeelDuration(reduced);
  const progress = unit(age / duration);
  return {
    duration,
    progress,
    finished: age >= duration,
    // Lv51 11.6–11.9 and 21.6–21.8: the outer material slides into the
    // aperture, exposing a stationary inner piece from its trailing edge.
    travelProgress: smooth(progress),
    materialAlpha: age < 0 || age >= duration ? 0 : 1,
    glint: age < 0 || age >= duration ? 0 : Math.sin(smooth(progress / 0.68) * Math.PI) * (reduced ? 0.12 : 0.32),
  };
};

export const sampleGateExitResponse = (age: number, reduced = false) => {
  if (age < 0 || age >= 0.6) return { displacement: 0, glow: 0, sheen: 0 };
  // Push away from the puzzle, settle through one small recoil, then rest.
  // Units are cells; aperture/collision geometry never moves.
  const displacement = reduced ? 0
    : age < 0.16 ? 0.22 * smooth(age / 0.16)
      : age < 0.34 ? 0.22 - 0.238 * smooth((age - 0.16) / 0.18)
        : -0.018 * (1 - smooth((age - 0.34) / 0.2));
  const peak = reduced ? 0.065 : 0.15;
  const end = reduced ? 0.22 : 0.6;
  const glow = (age < peak ? smooth(age / peak) : 1 - smooth((age - peak) / (end - peak)))
    * (reduced ? 0.32 : 1);
  return { displacement, glow, sheen: unit(age / (reduced ? 0.18 : 0.38)) };
};
