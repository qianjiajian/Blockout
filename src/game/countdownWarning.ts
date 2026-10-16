import type { PuzzleSnapshot } from "../core/types";

type CountdownSnapshot = Pick<PuzzleSnapshot, "started" | "remainingSeconds" | "timeFreezeSeconds" | "complete" | "failed">;

const BREATH_SECONDS = 1.2;
const PUNCH_SECONDS = 0.36;

/** Presentation only. Observes both frame and input-event ticks without writing the clock. */
export class CountdownWarning {
  private warningTriggered = false;
  private criticalTriggered = false;
  private pendingWarning = false;
  private pendingCritical = false;
  private pendingCriticalSecond: number | null = null;
  private lastPunchedSecond: number | null = null;
  private phaseSeconds = 0;
  private punchSeconds: number | null = null;

  reset(): void {
    this.warningTriggered = false;
    this.criticalTriggered = false;
    this.pendingWarning = false;
    this.pendingCritical = false;
    this.pendingCriticalSecond = null;
    this.lastPunchedSecond = null;
    this.phaseSeconds = 0;
    this.punchSeconds = null;
  }

  observe(before: CountdownSnapshot, after: CountdownSnapshot): void {
    if (after.complete || after.failed) { this.reset(); return; }
    if (!before.started || before.complete || before.failed
      || !(after.remainingSeconds < before.remainingSeconds)) return;
    if (after.remainingSeconds <= 30 && !this.warningTriggered) this.pendingWarning = true;
    // Match the displayed number (ceil), not a separate repeating wall timer.
    // Coalesce missed seconds so a slow frame never queues a burst of punches.
    const displayedSecond = Math.ceil(after.remainingSeconds);
    if (displayedSecond > 0 && displayedSecond <= 10
      && displayedSecond < (this.lastPunchedSecond ?? 11)) {
      this.pendingCritical = true;
      this.pendingCriticalSecond = Math.min(this.pendingCriticalSecond ?? displayedSecond, displayedSecond);
    }
  }

  /** Returns the newly presented second so its sound shares the visual event. */
  update(snapshot: CountdownSnapshot, active: boolean, delta: number): number | undefined {
    if (snapshot.complete || snapshot.failed) { this.reset(); return; }
    if (!active || !snapshot.started || (snapshot.timeFreezeSeconds ?? 0) > 0) return;

    const elapsed = Number.isFinite(delta) ? Math.max(0, Math.min(0.05, delta)) : 0;
    if (this.warningTriggered) this.phaseSeconds = (this.phaseSeconds + elapsed) % BREATH_SECONDS;
    if (this.punchSeconds !== null) {
      this.punchSeconds += elapsed;
      if (this.punchSeconds >= PUNCH_SECONDS) this.punchSeconds = null;
    }
    // An input-event tick can cross a threshold just before pause/hide/freeze.
    // Keep that notification pending until the countdown is active again.
    if (this.pendingWarning && snapshot.remainingSeconds <= 30) {
      this.pendingWarning = false;
      this.warningTriggered = true;
      this.phaseSeconds = 0;
    }
    const displayedSecond = Math.ceil(snapshot.remainingSeconds);
    if (this.pendingCritical && this.pendingCriticalSecond !== null
      && displayedSecond > 0 && displayedSecond <= this.pendingCriticalSecond
      && displayedSecond < (this.lastPunchedSecond ?? 11)) {
      this.pendingCritical = false;
      this.pendingCriticalSecond = null;
      this.criticalTriggered = true;
      this.lastPunchedSecond = displayedSecond;
      this.punchSeconds = 0;
      return displayedSecond;
    }
  }

  visual(snapshot: CountdownSnapshot, reducedMotion: boolean) {
    const ended = snapshot.complete || snapshot.failed;
    const stage = !ended && this.criticalTriggered && snapshot.remainingSeconds <= 10 ? "critical"
      : !ended && this.warningTriggered && snapshot.remainingSeconds <= 30 ? "warning" : "normal";
    const breath = reducedMotion ? 0.5 : (1 - Math.cos(this.phaseSeconds / BREATH_SECONDS * Math.PI * 2)) / 2;
    const punch = stage === "critical" && !reducedMotion && this.punchSeconds !== null
      ? Math.sin(Math.PI * this.punchSeconds / PUNCH_SECONDS) : 0;
    return {
      stage,
      panelColor: stage === "critical" ? "#e52c41" : "#ff6337",
      panelAlpha: stage === "normal" ? 0 : (stage === "critical" ? 0.22 : 0.2) + breath * 0.36,
      digitScale: 1 + punch * 0.18,
      // Keep the enlarged first digit clear of the fixed clock icon.
      digitOffsetX: punch * 4,
      digitOffsetY: -punch * 4,
    };
  }

  debug(snapshot: CountdownSnapshot, reducedMotion: boolean) {
    return {
      warningTriggered: this.warningTriggered,
      criticalTriggered: this.criticalTriggered,
      pendingWarning: this.pendingWarning,
      pendingCritical: this.pendingCritical,
      pendingCriticalSecond: this.pendingCriticalSecond,
      lastPunchedSecond: this.lastPunchedSecond,
      phaseSeconds: this.phaseSeconds,
      punchSeconds: this.punchSeconds,
      ...this.visual(snapshot, reducedMotion),
    };
  }
}
