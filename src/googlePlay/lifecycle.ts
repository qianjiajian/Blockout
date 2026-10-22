export type GooglePlayLifecycleEvent = {
  phase: "ready" | "success" | "failed" | "settlement";
  owner: object;
  levelId: number;
  mode: "campaign" | "other";
} | { phase: "reset" };

type Attempt = {
  id: string;
  levelId: number;
  startedAt: number;
  ended: boolean;
  settlementSent: boolean;
};
type LifecycleCommand = "levelStart" | "levelEnd" | "settlement";

/** Only the Google Play build inserts these notifications at concrete game
 * transitions. Shared game files and all other distribution builds stay intact. */
export function emitGooglePlayLifecycle(host: unknown, event: GooglePlayLifecycleEvent): void {
  try {
    (host as { onGooglePlayLifecycle?(event: GooglePlayLifecycleEvent): void }).onGooglePlayLifecycle?.(event);
  } catch { /* Optional ad/analytics callbacks cannot interrupt gameplay/save transactions. */ }
}

export function emitGooglePlayMainReady(host: unknown): void {
  try { (host as { gameReady?(): void }).gameReady?.(); }
  catch { /* Native startup timing is optional and never blocks the first scene. */ }
}

export class GooglePlayLifecycle {
  private readonly attempts = new WeakMap<object, Attempt>();
  private active?: Attempt;
  private counter = 0;
  private readonly prefix = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  constructor(
    private readonly send: (type: LifecycleCommand, payload: Record<string, unknown>) => void,
    private readonly now: () => number = () => performance.now(),
  ) {}

  observe(event: GooglePlayLifecycleEvent): void {
    if (event.phase === "reset") {
      if (this.active) this.end(this.active, "fail");
      this.active = undefined;
      return;
    }
    if (event.mode !== "campaign" || !Number.isSafeInteger(event.levelId) || event.levelId < 1) return;
    let attempt = this.attempts.get(event.owner);
    if (event.phase === "ready") {
      if (attempt) return;
      if (this.active) this.end(this.active, "fail");
      attempt = {
        id: `${this.prefix}-${++this.counter}`, levelId: event.levelId,
        startedAt: this.now(), ended: false, settlementSent: false,
      };
      this.attempts.set(event.owner, attempt);
      this.active = attempt;
      this.send("levelStart", { attemptId: attempt.id, levelId: attempt.levelId });
      return;
    }
    if (!attempt || attempt.levelId !== event.levelId || attempt !== this.active) return;
    if (event.phase === "success" || event.phase === "failed") {
      this.end(attempt, event.phase === "success" ? "success" : "fail");
    } else if (event.phase === "settlement" && attempt.ended && !attempt.settlementSent) {
      attempt.settlementSent = true;
      if (attempt.levelId >= 6) this.send("settlement", { attemptId: attempt.id, levelId: attempt.levelId });
    }
  }

  private end(attempt: Attempt, result: "success" | "fail"): void {
    if (attempt.ended) return;
    attempt.ended = true;
    const elapsed = this.now() - attempt.startedAt;
    const duration = Number.isFinite(elapsed) ? Math.max(0, elapsed / 1000) : 0;
    this.send("levelEnd", { attemptId: attempt.id, levelId: attempt.levelId, result, duration });
  }
}
