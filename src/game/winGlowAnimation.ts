export const WIN_GLOW_ROTATION_PERIOD_SECONDS = 12;

export const winGlowRotation = (elapsedSeconds: number, reducedMotion: boolean): number => {
  if (reducedMotion) return 0;
  const safeElapsed = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
  const phase = ((safeElapsed % WIN_GLOW_ROTATION_PERIOD_SECONDS) + WIN_GLOW_ROTATION_PERIOD_SECONDS)
    % WIN_GLOW_ROTATION_PERIOD_SECONDS;
  return (phase / WIN_GLOW_ROTATION_PERIOD_SECONDS) * Math.PI * 2;
};
