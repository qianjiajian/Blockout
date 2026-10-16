import { describe, expect, it } from "vitest";
import { ProfileScroll } from "../src/game/profileScroll";

const viewport = { x: 50, y: 300, width: 300, height: 200 };
const maximum = 300;

describe("profile appearance scrolling", () => {
  it("keeps a small press stationary and allows selection only on release within the catalog", () => {
    const scroll = new ProfileScroll();
    expect(scroll.begin(1, 100, 350, 0, viewport, maximum)).toBe(true);
    scroll.move(1, 103, 354, 20, maximum);
    expect(scroll.offset).toBe(0);
    expect(scroll.end(1, 103, 354, 30, maximum)).toEqual({ handled: true, tap: true });
    expect(scroll.gesture).toBeUndefined();
    scroll.begin(1, 51, 350, 40, viewport, maximum);
    expect(scroll.end(1, 49, 350, 50, maximum)).toEqual({ handled: true, tap: false });
  });

  it("turns an upward drag into increasing offset without selecting the released item", () => {
    const scroll = new ProfileScroll();
    scroll.begin(1, 100, 450, 0, viewport, maximum);
    scroll.move(1, 100, 390, 50, maximum);
    expect(scroll.offset).toBe(60);
    expect(scroll.end(1, 100, 370, 70, maximum, true)).toEqual({ handled: true, tap: false });
    expect(scroll.offset).toBe(80);
    expect(scroll.velocity).toBe(0);
  });

  it("uses movement across both axes and remembers a drag even if the pointer returns", () => {
    const scroll = new ProfileScroll();
    scroll.begin(1, 100, 350, 0, viewport, maximum);
    scroll.move(1, 106, 356, 20, maximum);
    expect(scroll.gesture?.moved).toBe(true);
    scroll.move(1, 100, 350, 40, maximum);
    expect(scroll.end(1, 100, 350, 50, maximum)).toEqual({ handled: true, tap: false });
    scroll.begin(1, 100, 350, 60, viewport, maximum);
    expect(scroll.end(1, 120, 350, 80, maximum)).toEqual({ handled: true, tap: false });
    expect(scroll.offset).toBe(0);
  });

  it("detects a drag reported only by the release event", () => {
    const scroll = new ProfileScroll();
    scroll.begin(1, 100, 450, 0, viewport, maximum);
    expect(scroll.end(1, 100, 350, 50, maximum)).toEqual({ handled: true, tap: false });
    expect(scroll.offset).toBe(100);
    expect(scroll.velocity).toBe(1800);
  });

  it("rejects starts outside the catalog and ignores another pointer throughout the gesture", () => {
    const scroll = new ProfileScroll();
    expect(scroll.begin(1, 100, 299, 0, viewport, maximum)).toBe(false);
    scroll.begin(1, 100, 450, 10, viewport, maximum);
    expect(scroll.begin(2, 100, 450, 20, viewport, maximum)).toBe(false);
    expect(scroll.move(2, 100, 300, 30, maximum)).toBe(false);
    expect(scroll.end(2, 100, 300, 40, maximum)).toEqual({ handled: false, tap: false });
    expect(scroll.gesture?.id).toBe(1);
    expect(scroll.offset).toBe(0);
    expect(scroll.end(1, 100, 450, 50, maximum)).toEqual({ handled: true, tap: true });
  });

  it("cancel blocks the later release and stops any inertia while retaining position", () => {
    const scroll = new ProfileScroll();
    scroll.begin(1, 100, 450, 0, viewport, maximum);
    scroll.move(1, 100, 350, 50, maximum);
    scroll.cancel();
    expect(scroll.end(1, 100, 350, 60, maximum)).toEqual({ handled: false, tap: false });
    expect(scroll.update(0.05, maximum)).toBe(false);
    expect(scroll.offset).toBe(100);
    scroll.velocity = 100;
    scroll.cancel();
    expect(scroll.velocity).toBe(0);
  });

  it("continues a fresh drag with decaying inertia and lets a new press stop it", () => {
    const scroll = new ProfileScroll();
    scroll.begin(1, 100, 450, 0, viewport, maximum);
    scroll.move(1, 100, 400, 50, maximum);
    scroll.end(1, 100, 400, 60, maximum);
    expect(scroll.velocity).toBe(1000);
    expect(scroll.update(0.02, maximum)).toBe(true);
    expect(scroll.offset).toBe(70);
    expect(scroll.velocity).toBeCloseTo(1000 * Math.exp(-0.14));
    scroll.begin(2, 100, 400, 80, viewport, maximum);
    expect(scroll.velocity).toBe(0);
    expect(scroll.update(0.02, maximum)).toBe(false);
    expect(scroll.offset).toBe(70);
  });

  it("suppresses stale and reduced motion flings", () => {
    for (const reduced of [false, true]) {
      const scroll = new ProfileScroll();
      scroll.begin(1, 100, 450, 0, viewport, maximum);
      scroll.move(1, 100, 350, 50, maximum);
      scroll.end(1, 100, 350, reduced ? 60 : 200, maximum, reduced);
      expect(scroll.velocity).toBe(0);
      expect(scroll.update(0.05, maximum)).toBe(false);
      expect(scroll.offset).toBe(100);
    }
  });

  it("clamps dragging and inertia to both ends without bouncing", () => {
    const scroll = new ProfileScroll();
    scroll.begin(1, 100, 450, 0, viewport, maximum);
    scroll.move(1, 100, -500, 50, maximum);
    scroll.end(1, 100, -500, 60, maximum);
    expect(scroll.offset).toBe(maximum);
    expect(scroll.velocity).toBe(0);
    scroll.begin(1, 100, 350, 70, viewport, maximum);
    scroll.move(1, 100, 1000, 120, maximum);
    scroll.end(1, 100, 1000, 130, maximum);
    expect(scroll.offset).toBe(0);
    expect(scroll.velocity).toBe(0);
    scroll.reset(290, maximum);
    scroll.velocity = 1000;
    scroll.update(0.05, maximum);
    expect(scroll.offset).toBe(maximum);
    expect(scroll.velocity).toBe(0);
    scroll.reset(10, maximum);
    scroll.velocity = -1000;
    scroll.update(0.05, maximum);
    expect(scroll.offset).toBe(0);
    expect(scroll.velocity).toBe(0);
  });

  it("resets transient state, clamps smaller catalogs and bounds a resumed frame delta", () => {
    const scroll = new ProfileScroll();
    scroll.begin(1, 100, 350, 0, viewport, maximum);
    scroll.reset(400, maximum);
    expect(scroll.offset).toBe(maximum);
    expect(scroll.gesture).toBeUndefined();
    expect(scroll.update(0, 80)).toBe(true);
    expect(scroll.offset).toBe(80);
    scroll.reset();
    scroll.velocity = 100;
    scroll.update(10, maximum);
    expect(scroll.offset).toBe(5);
    scroll.reset(20, 0);
    expect(scroll.offset).toBe(0);
  });
});
