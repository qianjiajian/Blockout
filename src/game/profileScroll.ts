export interface ProfileScrollRect { x: number; y: number; width: number; height: number }

export interface ProfileScrollGesture {
  id: number;
  startX: number;
  startY: number;
  lastY: number;
  startOffset: number;
  moved: boolean;
  lastAt: number;
  velocity: number;
}

const DRAG_THRESHOLD = 8;
const MAX_VELOCITY = 1800;
const clamp = (value: number, maximum: number): number =>
  Math.max(0, Math.min(Number.isNaN(maximum) ? 0 : Math.max(0, maximum), value));
const contains = (rect: ProfileScrollRect, x: number, y: number): boolean =>
  x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;

/** Pointer positions are logical pixels; timestamps are milliseconds and update deltas are seconds. */
export class ProfileScroll {
  offset = 0;
  velocity = 0;
  gesture?: ProfileScrollGesture;
  private viewport?: ProfileScrollRect;

  begin(id: number, x: number, y: number, now: number, viewport: ProfileScrollRect, maxOffset: number): boolean {
    if (this.gesture || !contains(viewport, x, y)) return false;
    this.offset = clamp(this.offset, maxOffset);
    this.velocity = 0;
    this.viewport = { ...viewport };
    this.gesture = { id, startX: x, startY: y, lastY: y, startOffset: this.offset, moved: false, lastAt: now, velocity: 0 };
    return true;
  }

  move(id: number, x: number, y: number, now: number, maxOffset: number): boolean {
    const gesture = this.gesture;
    if (!gesture || gesture.id !== id) return false;
    gesture.moved ||= Math.hypot(x - gesture.startX, y - gesture.startY) > DRAG_THRESHOLD;
    if (gesture.moved) {
      this.offset = clamp(gesture.startOffset + gesture.startY - y, maxOffset);
      const seconds = Math.max(0.008, (now - gesture.lastAt) / 1000);
      gesture.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, (gesture.lastY - y) / seconds));
    }
    gesture.lastY = y;
    gesture.lastAt = now;
    return true;
  }

  end(id: number, x: number, y: number, now: number, maxOffset: number, reducedMotion = false): { handled: boolean; tap: boolean } {
    const gesture = this.gesture;
    if (!gesture || gesture.id !== id) return { handled: false, tap: false };
    const stale = now - gesture.lastAt > 100;
    // A release can contain movement even when the host omitted its last move event.
    if (y !== gesture.lastY || (!gesture.moved && Math.hypot(x - gesture.startX, y - gesture.startY) > DRAG_THRESHOLD)) {
      this.move(id, x, y, now, maxOffset);
    }
    const tap = !gesture.moved && !!this.viewport && contains(this.viewport, x, y);
    this.offset = clamp(this.offset, maxOffset);
    this.velocity = gesture.moved && !stale && !reducedMotion ? gesture.velocity : 0;
    this.stopAtBoundary(maxOffset);
    this.gesture = undefined;
    this.viewport = undefined;
    return { handled: true, tap };
  }

  cancel(): void {
    this.gesture = undefined;
    this.viewport = undefined;
    this.velocity = 0;
  }

  update(delta: number, maxOffset: number): boolean {
    const before = this.offset;
    this.offset = clamp(this.offset, maxOffset);
    if (this.gesture || Math.abs(this.velocity) < 5) {
      this.velocity = 0;
      return this.offset !== before;
    }
    const seconds = Number.isFinite(delta) ? Math.min(0.05, Math.max(0, delta)) : 0;
    this.offset = clamp(this.offset + this.velocity * seconds, maxOffset);
    this.velocity *= Math.exp(-7 * seconds);
    this.stopAtBoundary(maxOffset);
    return this.offset !== before;
  }

  reset(offset = 0, maxOffset = Infinity): void {
    this.cancel();
    this.offset = clamp(Number.isFinite(offset) ? offset : 0, maxOffset);
  }

  private stopAtBoundary(maxOffset: number): void {
    if ((this.offset <= 0 && this.velocity < 0) || (this.offset >= Math.max(0, maxOffset) && this.velocity > 0)) {
      this.velocity = 0;
    }
  }
}
