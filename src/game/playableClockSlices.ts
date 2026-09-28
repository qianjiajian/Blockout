/** One shared monotonic time line for animation frames and input events. */
export class PlayableClockSlices {
  private previous?: number;

  reset(): void { this.previous = undefined; }

  sample(nowMilliseconds: number, active: boolean): number {
    if (!active || !Number.isFinite(nowMilliseconds)) { this.reset(); return 0; }
    const previous = this.previous;
    this.previous = previous === undefined ? nowMilliseconds : Math.max(previous, nowMilliseconds);
    return previous === undefined ? 0 : Math.max(0, nowMilliseconds - previous) / 1000;
  }
}

export const monotonicGameTime = (): number => typeof performance !== "undefined"
  && typeof performance.now === "function" ? performance.now() : Date.now();
