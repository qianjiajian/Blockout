import { describe, expect, it, vi } from "vitest";
import { POPUP_ENTRANCE_DURATION, POPUP_EXIT_DURATION, POPUP_EXIT_PEAK_TIME,
  PopupEntranceController, popupBounds, samplePopupExit } from "../src/game/popupEntrance";

const PANEL = { x: 50, y: 200, width: 400, height: 500 };

function canvas(alpha = 1) {
  type State = { alpha: number; matrix: number[] };
  let state: State = { alpha, matrix: [2, 0, 0, 2, 3, 7] };
  const stack: State[] = [];
  const read = () => ({ alpha: state.alpha, matrix: [...state.matrix] });
  const ctx = {
    get globalAlpha() { return state.alpha; },
    set globalAlpha(value: number) { state.alpha = value; },
    save: vi.fn(() => stack.push(read())),
    restore: vi.fn(() => { state = stack.pop()!; }),
    translate: vi.fn((x: number, y: number) => {
      const [a, b, c, d, e, f] = state.matrix;
      state.matrix = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
    }),
    scale: vi.fn((x: number, y: number) => {
      const [a, b, c, d, e, f] = state.matrix;
      state.matrix = [a * x, b * x, c * y, d * y, e, f];
    }),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, read, depth: () => stack.length };
}

function frame(controller: PopupEntranceController, ctx: CanvasRenderingContext2D,
  keys = ["panel"], reducedMotion = false) {
  controller.beginFrame();
  for (const key of keys) controller.draw(ctx, key, PANEL, () => {}, reducedMotion);
  controller.endFrame();
}

describe("popup entrance lifecycle", () => {
  it("draws a newly visible window at 80% scale and zero opacity on its first frame", () => {
    const controller = new PopupEntranceController(), { ctx, read } = canvas();
    controller.beginFrame();
    let drawn: ReturnType<typeof read> | undefined;
    controller.draw(ctx, "panel", PANEL, () => { drawn = read(); }, false);
    controller.endFrame();
    expect(controller.snapshot()).toEqual([{ key: "panel", phase: "enter", age: 0, scale: 0.8, alpha: 0, bounds: PANEL }]);
    expect(drawn?.alpha).toBe(0);
    expect(drawn?.matrix).toEqual([1.6, 0, 0, 1.6, 103, 187]);
    expect(controller.active).toBe(true);
  });

  it("rises monotonically to 110%, then settles monotonically to 100% while staying opaque", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx);
    let last = controller.snapshot()[0];
    for (const age of [0.03, 0.06, 0.09, 0.12, 0.15, 0.18]) {
      expect(controller.update(age - last.age, true, false)).toBe(true);
      frame(controller, ctx);
      const current = controller.snapshot()[0];
      expect(current.scale).toBeGreaterThan(last.scale);
      expect(current.alpha).toBeGreaterThan(last.alpha);
      expect(current.scale).toBeLessThanOrEqual(1.1 + Number.EPSILON);
      expect(current.alpha).toBeLessThanOrEqual(1);
      last = current;
    }
    expect(last).toMatchObject({ age: 0.18, alpha: 1 });
    expect(last.scale).toBeCloseTo(1.1, 14);
    expect(controller.active).toBe(true);
    for (const age of [0.2, 0.24, 0.28, POPUP_ENTRANCE_DURATION]) {
      expect(controller.update(age - last.age, true, false)).toBe(true);
      frame(controller, ctx);
      const current = controller.snapshot()[0];
      expect(current.scale).toBeLessThan(last.scale);
      expect(current.scale).toBeGreaterThanOrEqual(1);
      expect(current.alpha).toBe(1);
      last = current;
    }
    expect(controller.snapshot()[0]).toMatchObject({ age: POPUP_ENTRANCE_DURATION, scale: 1, alpha: 1 });
    expect(controller.active).toBe(false);
    expect(controller.update(100, true, false)).toBe(false);
  });

  it("caps a long frame and ignores negative elapsed time", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx);
    expect(controller.update(-10, true, false)).toBe(false);
    expect(controller.snapshot()[0].age).toBe(0);
    expect(controller.update(100, true, false)).toBe(true);
    expect(controller.snapshot()[0]).toMatchObject({ age: POPUP_ENTRANCE_DURATION, scale: 1, alpha: 1 });
  });

  it("keeps the same window's age when loading, feedback or layout content changes", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx);
    controller.update(POPUP_ENTRANCE_DURATION / 2, true, false);
    const before = controller.snapshot()[0];
    const resized = { x: 40, y: 190, width: 410, height: 540 };
    const updatedContent = vi.fn();
    controller.beginFrame();
    controller.draw(ctx, "panel", resized, updatedContent, false);
    controller.endFrame();
    expect(updatedContent).toHaveBeenCalledOnce();
    expect(controller.snapshot()[0]).toEqual({ ...before, bounds: resized });
    controller.snapshot()[0].bounds.x = -999;
    expect(controller.snapshot()[0].bounds).toEqual(resized);
  });

  it("opens and closes a child independently without replaying the visible parent", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx, ["profile"]);
    controller.update(1, true, false);
    frame(controller, ctx, ["profile", "profile.rename"]);
    expect(controller.snapshot().map(({ key, alpha }) => [key, alpha])).toEqual([
      ["profile", 1], ["profile.rename", 0],
    ]);
    controller.update(POPUP_ENTRANCE_DURATION / 2, true, false);
    frame(controller, ctx, ["profile", "profile.rename"]);
    expect(controller.snapshot()[0].alpha).toBe(1);
    expect(controller.snapshot()[1].alpha).toBeGreaterThan(0);
    frame(controller, ctx, ["profile"]);
    expect(controller.snapshot()).toHaveLength(1);
    expect(controller.active).toBe(false);
    frame(controller, ctx, ["profile", "profile.rename"]);
    expect(controller.snapshot().map(({ key, alpha }) => [key, alpha])).toEqual([
      ["profile", 1], ["profile.rename", 0],
    ]);
  });

  it("restarts a window only after it is absent from a completed frame", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx);
    controller.update(1, true, false);
    frame(controller, ctx);
    expect(controller.snapshot()[0].alpha).toBe(1);
    frame(controller, ctx, []);
    expect(controller.snapshot()).toEqual([]);
    expect(controller.active).toBe(false);
    frame(controller, ctx);
    expect(controller.snapshot()[0]).toMatchObject({ age: 0, alpha: 0, scale: 0.8 });
  });

  it("does not duplicate or restart a key drawn twice in one frame", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx);
    controller.update(0.1, true, false);
    const before = controller.snapshot();
    frame(controller, ctx, ["panel", "panel"]);
    expect(controller.snapshot()).toEqual(before);
  });

  it("retains stable identity but restarts a newly queued instance of the same popup kind", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    const first = { feature: "leaderboard" }, next = { feature: "supply" };
    controller.beginFrame();
    controller.draw(ctx, "featureUnlock", PANEL, () => {}, false, first);
    controller.endFrame();
    controller.update(1, true, false);
    controller.beginFrame();
    controller.draw(ctx, "featureUnlock", PANEL, () => {}, false, first);
    expect(controller.snapshot()[0]).toMatchObject({ age: POPUP_ENTRANCE_DURATION, scale: 1, alpha: 1 });
    controller.draw(ctx, "featureUnlock", PANEL, () => {}, false, next);
    controller.endFrame();
    expect(controller.snapshot()).toHaveLength(1);
    expect(controller.snapshot()[0]).toMatchObject({ age: 0, scale: 0.8, alpha: 0 });
    expect(controller.active).toBe(true);
  });

  it("freezes in the background and resumes from its preserved age", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx);
    controller.update(0.05, true, false);
    const before = controller.snapshot();
    expect(controller.update(30, false, false)).toBe(false);
    expect(controller.update(30, false, true)).toBe(false);
    expect(controller.snapshot()).toEqual(before);
    expect(controller.active).toBe(true);
    expect(controller.update(0.05, true, false)).toBe(true);
    expect(controller.snapshot()[0].age).toBeCloseTo(0.1);
  });

  it("shows reduced-motion windows fully on the first frame", () => {
    const controller = new PopupEntranceController(), { ctx, read } = canvas(0.4);
    const before = read();
    let drawn: ReturnType<typeof read> | undefined;
    controller.beginFrame();
    controller.draw(ctx, "panel", PANEL, () => { drawn = read(); }, true);
    controller.endFrame();
    expect(controller.snapshot()[0]).toMatchObject({ age: POPUP_ENTRANCE_DURATION, alpha: 1, scale: 1 });
    expect(controller.active).toBe(false);
    expect(drawn).toEqual(before);
    expect(controller.update(0.05, true, true)).toBe(false);
  });

  it("finishes an existing entrance when reduced motion is enabled", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx);
    expect(controller.update(0, true, true)).toBe(true);
    expect(controller.active).toBe(false);
    frame(controller, ctx, ["panel"], false);
    expect(controller.snapshot()[0]).toMatchObject({ alpha: 1, scale: 1 });
  });

  it("multiplies inherited opacity and restores the canvas for later background drawing", () => {
    const controller = new PopupEntranceController(), { ctx, read, depth } = canvas(0.4);
    frame(controller, ctx);
    controller.update(0.1, true, false);
    const before = read();
    let drawn: ReturnType<typeof read> | undefined;
    controller.beginFrame();
    controller.draw(ctx, "panel", PANEL, () => { drawn = read(); }, false);
    controller.endFrame();
    expect(drawn?.alpha).toBeCloseTo(before.alpha * controller.snapshot()[0].alpha);
    expect(drawn?.matrix).not.toEqual(before.matrix);
    expect(read()).toEqual(before);
    expect(depth()).toBe(0);
  });

  it("restores the canvas and propagates a drawing error", () => {
    const controller = new PopupEntranceController(), { ctx, read, depth } = canvas(0.7);
    const before = read(), error = new Error("failed draw");
    controller.beginFrame();
    expect(() => controller.draw(ctx, "panel", PANEL, () => { throw error; }, false)).toThrow(error);
    expect(read()).toEqual(before);
    expect(depth()).toBe(0);
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("includes a close button that extends above and right of the panel in the visual bounds", () => {
    expect(popupBounds({ x: 21, y: 342, width: 679, height: 960 },
      { x: 625, y: 300, width: 94, height: 98 })).toEqual({ x: 21, y: 300, width: 698, height: 1002 });
  });
});

describe("popup exit lifecycle", () => {
  function ready(keys = ["panel"], alpha = 1) {
    const controller = new PopupEntranceController(), drawing = canvas(alpha);
    frame(controller, drawing.ctx, keys);
    controller.update(POPUP_ENTRANCE_DURATION, true, false);
    frame(controller, drawing.ctx, keys);
    return { controller, ...drawing };
  }

  it("enlarges to 110% fully opaque, then shrinks to 80% while fading out", () => {
    expect(POPUP_EXIT_PEAK_TIME).toBe(0.14);
    expect(POPUP_EXIT_DURATION).toBe(0.32);
    expect(samplePopupExit(-1)).toEqual({ scale: 1, alpha: 1 });
    expect(samplePopupExit(0)).toEqual({ scale: 1, alpha: 1 });
    expect(samplePopupExit(0.07)).toEqual({ scale: 1.0875, alpha: 1 });
    expect(samplePopupExit(0.14)).toEqual({ scale: 1.1, alpha: 1 });
    expect(samplePopupExit(0.23).scale).toBeCloseTo(0.95, 14);
    expect(samplePopupExit(0.23).alpha).toBeCloseTo(0.5, 14);
    expect(samplePopupExit(0.32)).toEqual({ scale: 0.8, alpha: 0 });
    expect(samplePopupExit(20)).toEqual({ scale: 0.8, alpha: 0 });
    let last = samplePopupExit(0);
    for (const age of [0.035, 0.07, 0.105, 0.14]) {
      const current = samplePopupExit(age);
      expect(current.scale).toBeGreaterThan(last.scale);
      expect(current.alpha).toBe(1);
      last = current;
    }
    for (const age of [0.185, 0.23, 0.275, 0.32]) {
      const current = samplePopupExit(age);
      expect(current.scale).toBeLessThan(last.scale);
      expect(current.alpha).toBeLessThan(last.alpha);
      last = current;
    }
  });

  it("selects only existing requested windows and starts exit at full size", () => {
    const controller = new PopupEntranceController(), { ctx } = canvas();
    frame(controller, ctx, ["profile", "profile.rename"]);
    const complete = vi.fn();
    expect(controller.startExit(["missing", "profile.rename", "profile.rename"], complete, false)).toBe(true);
    expect(controller.snapshot()).toEqual([
      { key: "profile", phase: "enter", age: 0, scale: 0.8, alpha: 0, bounds: PANEL },
      { key: "profile.rename", phase: "exit", age: 0, scale: 1, alpha: 1, bounds: PANEL },
    ]);
    expect(controller.active).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    expect(JSON.stringify(controller.snapshot())).not.toContain("complete");
  });

  it("paints the transparent final frame before flushing and removes entries before completing", () => {
    const { controller, ctx, read, depth } = ready(["panel"], 0.4);
    const before = read();
    const complete = vi.fn(() => {
      expect(controller.snapshot()).toEqual([]);
      expect(controller.active).toBe(false);
      expect(controller.flushExits()).toBe(false);
    });
    controller.startExit(["panel"], complete, false);
    controller.update(0.23, true, false);
    let drawn: ReturnType<typeof read> | undefined;
    controller.beginFrame();
    controller.draw(ctx, "panel", PANEL, () => { drawn = read(); }, false);
    controller.endFrame();
    expect(drawn?.alpha).toBeCloseTo(0.2, 14);
    expect(drawn?.matrix[0]).toBeCloseTo(1.9, 14);
    expect(read()).toEqual(before);
    expect(depth()).toBe(0);
    expect(controller.flushExits()).toBe(false);
    controller.update(1, true, false);
    expect(controller.active).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    controller.beginFrame();
    controller.draw(ctx, "panel", PANEL, () => { drawn = read(); }, false);
    controller.endFrame();
    expect(drawn?.alpha).toBe(0);
    expect(drawn?.matrix).toEqual([1.6, 0, 0, 1.6, 103, 187]);
    expect(controller.snapshot()[0]).toMatchObject({ phase: "exit", age: POPUP_EXIT_DURATION, scale: 0.8, alpha: 0 });
    expect(complete).not.toHaveBeenCalled();
    expect(controller.flushExits()).toBe(true);
    expect(complete).toHaveBeenCalledOnce();
    expect(controller.flushExits()).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(read()).toEqual(before);
  });

  it("swallows duplicate exit intents without replacing the original completion", () => {
    const { controller, ctx } = ready(["profile", "profile.rename"]);
    const first = vi.fn(), duplicate = vi.fn();
    expect(controller.startExit(["profile.rename"], first, false)).toBe(true);
    controller.update(0.07, true, false);
    const before = controller.snapshot();
    expect(controller.startExit(["profile"], duplicate, true)).toBe(true);
    expect(controller.snapshot()).toEqual(before);
    expect(duplicate).not.toHaveBeenCalled();
    controller.update(1, true, false);
    frame(controller, ctx, ["profile", "profile.rename"]);
    controller.flushExits();
    expect(first).toHaveBeenCalledOnce();
    expect(duplicate).not.toHaveBeenCalled();
    expect(controller.snapshot()[0]).toMatchObject({ key: "profile", phase: "idle", alpha: 1, scale: 1 });
  });

  it("closes a child independently and reopens it without replaying its parent", () => {
    const { controller, ctx } = ready(["profile", "profile.rename"]);
    controller.startExit(["profile.rename"], () => {}, false);
    controller.update(0.23, true, false);
    frame(controller, ctx, ["profile", "profile.rename"]);
    expect(controller.snapshot()[0]).toMatchObject({ key: "profile", phase: "idle", scale: 1, alpha: 1 });
    expect(controller.snapshot()[1]).toMatchObject({ key: "profile.rename", phase: "exit" });
    controller.update(1, true, false);
    frame(controller, ctx, ["profile", "profile.rename"]);
    controller.flushExits();
    frame(controller, ctx, ["profile", "profile.rename"]);
    expect(controller.snapshot()[0]).toMatchObject({ key: "profile", phase: "idle", scale: 1, alpha: 1 });
    expect(controller.snapshot()[1]).toMatchObject({ key: "profile.rename", phase: "enter", age: 0, scale: 0.8, alpha: 0 });
  });

  it("finishes multiple selected layers together with a single callback", () => {
    const { controller, ctx } = ready(["settings", "resetConfirm"]);
    const complete = vi.fn();
    controller.startExit(["settings", "resetConfirm"], complete, false);
    controller.update(0.14, true, false);
    frame(controller, ctx, ["settings", "resetConfirm"]);
    for (const entry of controller.snapshot()) expect(entry).toMatchObject({ phase: "exit", scale: 1.1, alpha: 1 });
    controller.update(1, true, false);
    frame(controller, ctx, ["settings", "resetConfirm"]);
    controller.flushExits();
    expect(controller.snapshot()).toEqual([]);
    expect(complete).toHaveBeenCalledOnce();
  });

  it("retains and releases the exit callback even when its windows stop drawing", () => {
    const { controller, ctx } = ready();
    const complete = vi.fn();
    controller.startExit(["panel"], complete, false);
    frame(controller, ctx, []);
    expect(controller.snapshot()).toEqual([]);
    expect(controller.active).toBe(true);
    expect(controller.flushExits()).toBe(false);
    controller.update(1, true, false);
    expect(complete).not.toHaveBeenCalled();
    expect(controller.flushExits()).toBe(true);
    expect(complete).toHaveBeenCalledOnce();
    expect(controller.active).toBe(false);
    expect(controller.update(1, true, false)).toBe(false);
    expect(controller.flushExits()).toBe(false);
  });

  it("freezes exit in the background even when reduced motion is requested", () => {
    const { controller } = ready();
    const complete = vi.fn();
    controller.startExit(["panel"], complete, false);
    controller.update(0.07, true, false);
    const before = controller.snapshot();
    expect(controller.update(30, false, false)).toBe(false);
    expect(controller.update(30, false, true)).toBe(false);
    expect(controller.snapshot()).toEqual(before);
    expect(controller.flushExits()).toBe(false);
    expect(complete).not.toHaveBeenCalled();
    controller.update(0.07, true, false);
    expect(controller.snapshot()[0]).toMatchObject({ age: 0.14, scale: 1.1, alpha: 1 });
  });

  it("ignores negative exit time and clamps long frames without running completion", () => {
    const { controller } = ready();
    const complete = vi.fn();
    controller.startExit(["panel"], complete, false);
    expect(controller.update(-10, true, false)).toBe(false);
    expect(controller.snapshot()[0]).toMatchObject({ phase: "exit", age: 0, scale: 1, alpha: 1 });
    expect(controller.update(100, true, false)).toBe(true);
    expect(controller.snapshot()[0]).toMatchObject({ age: POPUP_EXIT_DURATION, scale: 0.8, alpha: 0 });
    expect(controller.update(100, true, false)).toBe(false);
    expect(controller.active).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("completes a reduced-motion exit immediately and clears before the callback", () => {
    const { controller } = ready();
    const complete = vi.fn(() => {
      expect(controller.snapshot()).toEqual([]);
      expect(controller.active).toBe(false);
    });
    expect(controller.startExit(["panel"], complete, true)).toBe(true);
    expect(complete).toHaveBeenCalledOnce();
    expect(controller.flushExits()).toBe(false);
    expect(controller.startExit(["panel"], complete, true)).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
  });

  it("finishes a running exit when reduced motion turns on but still waits for flush", () => {
    const { controller, ctx, read } = ready();
    const complete = vi.fn();
    controller.startExit(["panel"], complete, false);
    controller.update(0.07, true, false);
    expect(controller.update(0, true, true)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    let alpha = -1;
    controller.beginFrame();
    controller.draw(ctx, "panel", PANEL, () => { alpha = read().alpha; }, true);
    controller.endFrame();
    expect(alpha).toBe(0);
    expect(controller.active).toBe(true);
    controller.flushExits();
    expect(complete).toHaveBeenCalledOnce();
  });

  it("returns false without executing completion when no requested window exists", () => {
    const { controller } = ready(["profile"]);
    const complete = vi.fn();
    expect(controller.startExit([], complete, false)).toBe(false);
    expect(controller.startExit(["missing"], complete, true)).toBe(false);
    expect(complete).not.toHaveBeenCalled();
    expect(controller.active).toBe(false);
    expect(controller.snapshot()[0]).toMatchObject({ key: "profile", phase: "idle" });
  });

  it("allows completion to open a new instance under the same key", () => {
    const { controller, ctx } = ready();
    const complete = vi.fn(() => frame(controller, ctx));
    controller.startExit(["panel"], complete, false);
    controller.update(1, true, false);
    frame(controller, ctx);
    controller.flushExits();
    expect(complete).toHaveBeenCalledOnce();
    expect(controller.snapshot()[0]).toMatchObject({ key: "panel", phase: "enter", age: 0, alpha: 0 });
    expect(controller.active).toBe(true);
  });

  it("does not delete an identity replacement while flushing the previous instance", () => {
    const { controller, ctx } = ready();
    const complete = vi.fn();
    controller.startExit(["panel"], complete, false);
    controller.beginFrame();
    controller.draw(ctx, "panel", PANEL, () => {}, false, { reward: "next" });
    controller.endFrame();
    expect(controller.snapshot()[0]).toMatchObject({ key: "panel", phase: "enter", age: 0, alpha: 0 });
    controller.update(1, true, false);
    controller.flushExits();
    expect(complete).toHaveBeenCalledOnce();
    expect(controller.snapshot()[0]).toMatchObject({ key: "panel", phase: "idle", alpha: 1 });
  });

  it("clears a completed exit before propagating a completion error", () => {
    const { controller } = ready();
    const error = new Error("close failed");
    const complete = vi.fn(() => { throw error; });
    controller.startExit(["panel"], complete, false);
    controller.update(1, true, false);
    expect(() => controller.flushExits()).toThrow(error);
    expect(controller.snapshot()).toEqual([]);
    expect(controller.active).toBe(false);
    expect(controller.flushExits()).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
  });
});
