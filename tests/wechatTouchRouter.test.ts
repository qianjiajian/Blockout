import { describe, expect, it, vi } from "vitest";
import type { PointerHandlers, PointerSample } from "../src/platform/Host";
import { WechatHost, WechatTouchRouter } from "../src/platform/WechatHost";

const touch = (identifier: number, clientX: number, clientY: number) => ({ identifier, clientX, clientY });

const harness = () => {
  const received: Record<keyof PointerHandlers, PointerSample[]> = { down: [], move: [], up: [], cancel: [] };
  const handlers: PointerHandlers = {
    down: vi.fn((sample) => received.down.push(sample)),
    move: vi.fn((sample) => received.move.push(sample)),
    up: vi.fn((sample) => received.up.push(sample)),
    cancel: vi.fn((sample) => received.cancel.push(sample)),
  };
  return { router: new WechatTouchRouter(handlers), received };
};

describe("WeChat primary touch routing", () => {
  it("keeps the original finger when changedTouches is reordered", () => {
    const { router, received } = harness();
    router.start({ changedTouches: [touch(7, 100, 200)], touches: [touch(7, 100, 200)] });
    router.start({ changedTouches: [touch(9, 300, 400)], touches: [touch(7, 100, 200), touch(9, 300, 400)] });
    router.move({
      changedTouches: [touch(9, 320, 420), touch(7, 130, 240)],
      touches: [touch(9, 320, 420), touch(7, 130, 240)],
    });

    expect(received.down).toEqual([{ id: 7, x: 100, y: 200 }]);
    expect(received.move).toEqual([{ id: 7, x: 130, y: 240 }]);
  });

  it("falls back to the owner in touches when changedTouches only lists another finger", () => {
    const { router, received } = harness();
    router.start({ changedTouches: [touch(7, 100, 200)] });
    router.move({
      changedTouches: [touch(9, 320, 420)],
      touches: [touch(9, 320, 420), touch(7, 135, 245)],
    });

    expect(received.move).toEqual([{ id: 7, x: 135, y: 245 }]);
  });

  it("ignores non-owner movement and release until the primary finger ends", () => {
    const { router, received } = harness();
    router.start({ changedTouches: [touch(4, 40, 50)] });
    router.move({ changedTouches: [touch(8, 80, 90)], touches: [touch(4, 40, 50), touch(8, 80, 90)] });
    router.end({ changedTouches: [touch(8, 80, 90)], touches: [touch(4, 40, 50)] });
    expect(received.move).toEqual([]);
    expect(received.up).toEqual([]);

    router.move({ changedTouches: [touch(4, 55, 65)], touches: [touch(4, 55, 65)] });
    router.end({ changedTouches: [touch(4, 55, 65)], touches: [] });
    router.start({ changedTouches: [touch(8, 82, 92)] });

    expect(received.move).toEqual([{ id: 4, x: 55, y: 65 }]);
    expect(received.up).toEqual([{ id: 4, x: 55, y: 65 }]);
    expect(received.down.at(-1)).toEqual({ id: 8, x: 82, y: 92 });
  });

  it("uses the last valid owner position when an end event omits changedTouches", () => {
    const { router, received } = harness();
    router.start({ touches: [{ identifier: 3, pageX: 12, pageY: 24 }] });
    router.move({ touches: [{ identifier: 3, x: 18, y: 30 }] });
    router.end({ changedTouches: [], touches: [] });

    expect(received.down).toEqual([{ id: 3, x: 12, y: 24 }]);
    expect(received.move).toEqual([{ id: 3, x: 18, y: 30 }]);
    expect(received.up).toEqual([{ id: 3, x: 18, y: 30 }]);
  });

  it("cancels only the owner and allows lifecycle reset to release stale ownership", () => {
    const { router, received } = harness();
    router.start({ changedTouches: [touch(1, 10, 20)] });
    router.cancel({ changedTouches: [touch(2, 30, 40)], touches: [touch(1, 10, 20)] });
    expect(received.cancel).toEqual([]);
    router.cancel({ changedTouches: [touch(1, 15, 25)], touches: [] });
    expect(received.cancel).toEqual([{ id: 1, x: 15, y: 25 }]);

    router.start({ changedTouches: [touch(5, 50, 60)] });
    router.reset();
    router.start({ changedTouches: [touch(6, 70, 80)] });
    expect(received.down.at(-1)).toEqual({ id: 6, x: 70, y: 80 });
  });

  it("drops malformed touch samples instead of creating a phantom origin touch", () => {
    const { router, received } = harness();
    router.start({ changedTouches: [{ identifier: "not-a-number", clientX: 1, clientY: 2 }] });
    router.start({ changedTouches: [{ identifier: 1 }] });
    expect(received.down).toEqual([]);
  });

  it("binds the router to WeChat callbacks and releases ownership on hide", () => {
    const callbacks: Record<string, (event?: any) => void> = {};
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
    };
    const getStorageSync = vi.fn();
    const setStorageSync = vi.fn();
    const mockWx = {
      getSystemInfoSync: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 3 }),
      createCanvas: () => canvas,
      onTouchStart: (callback: (event: any) => void) => { callbacks.start = callback; },
      onTouchMove: (callback: (event: any) => void) => { callbacks.move = callback; },
      onTouchEnd: (callback: (event: any) => void) => { callbacks.end = callback; },
      onTouchCancel: (callback: (event: any) => void) => { callbacks.cancel = callback; },
      onHide: (callback: () => void) => { callbacks.hide = callback; },
      onShow: (callback: () => void) => { callbacks.show = callback; },
      onWindowResize: vi.fn(),
      getStorageSync,
      setStorageSync,
    };
    (globalThis as typeof globalThis & { wx: unknown }).wx = mockWx;

    const { received } = harness();
    const host = new WechatHost();
    host.onPointer({
      down: (sample) => received.down.push(sample),
      move: (sample) => received.move.push(sample),
      up: (sample) => received.up.push(sample),
      cancel: (sample) => received.cancel.push(sample),
    });
    const hidden = vi.fn();
    host.onHide(hidden);

    callbacks.start({ changedTouches: [touch(11, 100, 200)] });
    callbacks.start({ changedTouches: [touch(12, 300, 400)] });
    callbacks.move({ changedTouches: [touch(12, 320, 420), touch(11, 130, 240)] });
    expect(received.down).toEqual([{ id: 11, x: 100, y: 200 }]);
    expect(received.move).toEqual([{ id: 11, x: 130, y: 240 }]);

    callbacks.hide();
    callbacks.start({ changedTouches: [touch(12, 330, 430)] });
    expect(hidden).toHaveBeenCalledOnce();
    expect(received.down.at(-1)).toEqual({ id: 12, x: 330, y: 430 });
    expect(canvas.width).toBe(720);
    expect(canvas.height).toBe(1584);

    getStorageSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce({ coins: 1000 })
      .mockImplementationOnce(() => { throw new Error("storage read denied"); });
    expect(host.storageRead("save")).toEqual({ status: "missing" });
    expect(host.storageRead("save")).toEqual({ status: "ok", value: { coins: 1000 } });
    expect(host.storageRead("save")).toEqual({ status: "unavailable" });

    expect(host.storageSet("save", { coins: 1000 })).toBe(true);
    expect(setStorageSync).toHaveBeenCalledWith("save", { coins: 1000 });
    setStorageSync.mockImplementationOnce(() => { throw new Error("storage full"); });
    expect(host.storageSet("save", { coins: 820 })).toBe(false);

    delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
  });
});
