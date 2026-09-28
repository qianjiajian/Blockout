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
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 3 }),
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

  it("retries a failed formal-page subpackage load before creating its image", async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage: () => {
        const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
        Object.defineProperty(image, "src", {
          get: () => image._src,
          set: (value: string) => {
            image._src = value;
            queueMicrotask(() => (image.onload as (() => void) | null)?.());
          },
        });
        return image;
      },
    };
    let attempts = 0;
    const loadSubpackage = vi.fn(({ success, fail }: { success: () => void; fail: (error: unknown) => void }) => {
      attempts += 1;
      if (attempts === 1) fail("offline");
      else success();
    });
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
      loadSubpackage,
    };

    try {
      const host = new WechatHost();
      await expect(host.createImage("assets/art/ui/formal-pages/shop/reference.png"))
        .rejects.toThrow("Could not load meta-ui subpackage");
      const image = await host.createImage("assets/art/ui/formal-pages/shop/reference.png");
      expect(loadSubpackage).toHaveBeenCalledTimes(2);
      expect(image.src).toBe("meta-ui/formal-pages/shop/reference.png");
    } finally {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("loads the gameplay-art subpackage before mapping concurrent formal block images and reuses its cache", async () => {
    const assignedSources: string[] = [];
    const createImage = vi.fn(() => {
      const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
      Object.defineProperty(image, "src", {
        get: () => image._src,
        set: (value: string) => {
          image._src = value;
          assignedSources.push(value);
          queueMicrotask(() => (image.onload as (() => void) | null)?.());
        },
      });
      return image;
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage,
    };
    let gameplayCallbacks: { success: () => void; fail: (error: unknown) => void } | undefined;
    const loadSubpackage = vi.fn((options: {
      name: string;
      success: () => void;
      fail: (error: unknown) => void;
    }) => { gameplayCallbacks = options; });
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
      loadSubpackage,
    };

    try {
      const host = new WechatHost();
      const redPending = host.createImage("assets/art/gameplay/blocks/formal-v1/red-single.png");
      const bluePending = host.createImage("assets/art/gameplay/blocks/formal-v1/blue-horizontal-2.png");

      expect(loadSubpackage).toHaveBeenCalledTimes(1);
      expect(loadSubpackage.mock.calls[0]?.[0].name).toBe("gameplay-art");
      expect(createImage).not.toHaveBeenCalled();

      gameplayCallbacks?.success();
      const [red, blue] = await Promise.all([redPending, bluePending]);
      expect(red.src).toBe("gameplay-art/formal-v1/red-single.png");
      expect(blue.src).toBe("gameplay-art/formal-v1/blue-horizontal-2.png");

      const green = await host.createImage("assets/art/gameplay/blocks/formal-v1/green-square-2x2.png");
      expect(green.src).toBe("gameplay-art/formal-v1/green-square-2x2.png");
      const orangeSingleShell = await host.createImage("assets/art/gameplay/blocks/formal-v1/orange-shell-single.png");
      expect(orangeSingleShell.src).toBe("gameplay-art/formal-v1/orange-shell-single.png");
      const grabHalo = await host.createImage("assets/art/fx/block-grab-halo-v1.png");
      expect(grabHalo.src).toBe("gameplay-art/fx/block-grab-halo-v1.png");
      expect(loadSubpackage).toHaveBeenCalledTimes(1);
      expect(assignedSources).toEqual([
        "gameplay-art/formal-v1/red-single.png",
        "gameplay-art/formal-v1/blue-horizontal-2.png",
        "gameplay-art/formal-v1/green-square-2x2.png",
        "gameplay-art/formal-v1/orange-shell-single.png",
        "gameplay-art/fx/block-grab-halo-v1.png",
      ]);
    } finally {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("loads gameplay-art when an FX image is the package's first request", async () => {
    const createImage = vi.fn(() => {
      const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
      Object.defineProperty(image, "src", {
        get: () => image._src,
        set: (value: string) => {
          image._src = value;
          queueMicrotask(() => (image.onload as (() => void) | null)?.());
        },
      });
      return image;
    });
    const loadSubpackage = vi.fn(({ success }: { name: string; success: () => void }) => success());
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}), requestAnimationFrame: vi.fn(), createImage }),
      loadSubpackage,
    };
    try {
      const host = new WechatHost();
      const image = await host.createImage("assets/art/fx/block-grab-halo-v1.png");
      expect(loadSubpackage).toHaveBeenCalledOnce();
      expect(loadSubpackage.mock.calls[0]?.[0].name).toBe("gameplay-art");
      expect(image.src).toBe("gameplay-art/fx/block-grab-halo-v1.png");
    } finally {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("keeps meta-ui and gameplay-art loading, failure recovery, and caches isolated", async () => {
    const createImage = vi.fn(() => {
      const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
      Object.defineProperty(image, "src", {
        get: () => image._src,
        set: (value: string) => {
          image._src = value;
          queueMicrotask(() => (image.onload as (() => void) | null)?.());
        },
      });
      return image;
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage,
    };
    const pending = new Map<string, { success: () => void; fail: (error: unknown) => void }>();
    const packageNames: string[] = [];
    const loadSubpackage = vi.fn((options: {
      name: string;
      success: () => void;
      fail: (error: unknown) => void;
    }) => {
      packageNames.push(options.name);
      pending.set(options.name, options);
    });
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
      loadSubpackage,
    };

    try {
      const host = new WechatHost();
      const metaPending = host.createImage("assets/art/ui/formal-pages/shop/panel.png");
      const gameplayPending = host.createImage("assets/art/gameplay/blocks/formal-v1/purple-t-tetromino.png");
      const gameplayRejected = expect(gameplayPending)
        .rejects.toThrow("Could not load gameplay-art subpackage: offline-gameplay");

      expect(packageNames).toEqual(["meta-ui", "gameplay-art"]);
      pending.get("meta-ui")?.success();
      const meta = await metaPending;
      expect(meta.src).toBe("meta-ui/formal-pages/shop/panel.png");
      expect(createImage).toHaveBeenCalledTimes(1);

      pending.get("gameplay-art")?.fail("offline-gameplay");
      await gameplayRejected;
      expect(createImage).toHaveBeenCalledTimes(1);

      const gameplayRetry = host.createImage("assets/art/gameplay/blocks/formal-v1/purple-t-tetromino.png");
      expect(packageNames).toEqual(["meta-ui", "gameplay-art", "gameplay-art"]);
      pending.get("gameplay-art")?.success();
      const gameplay = await gameplayRetry;
      expect(gameplay.src).toBe("gameplay-art/formal-v1/purple-t-tetromino.png");

      const cachedMeta = await host.createImage("assets/art/ui/formal-pages/collection/panel.png");
      expect(cachedMeta.src).toBe("meta-ui/formal-pages/collection/panel.png");
      expect(packageNames).toEqual(["meta-ui", "gameplay-art", "gameplay-art"]);
    } finally {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("loads Collection illustration atlases from their own cached subpackage", async () => {
    const createImage = vi.fn(() => {
      const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
      Object.defineProperty(image, "src", {
        get: () => image._src,
        set: (value: string) => {
          image._src = value;
          queueMicrotask(() => (image.onload as (() => void) | null)?.());
        },
      });
      return image;
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage,
    };
    const packageNames: string[] = [];
    const loadSubpackage = vi.fn((options: { name: string; success: () => void }) => {
      packageNames.push(options.name);
      options.success();
    });
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
      loadSubpackage,
    };

    try {
      const host = new WechatHost();
      const first = await host.createImage(
        "assets/art/ui/formal-pages/collection-card-atlases-v1/level-01.jpg",
      );
      const second = await host.createImage(
        "assets/art/ui/formal-pages/collection-card-atlases-v1/masterpiece-02.jpg",
      );
      expect(first.src).toBe("collection-art/atlases/level-01.jpg");
      expect(second.src).toBe("collection-art/atlases/masterpiece-02.jpg");
      expect(packageNames).toEqual(["collection-art"]);
    } finally {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("reports the mapped gameplay-art path when image creation fails after subpackage load", async () => {
    let assignedSource = "";
    const createImage = vi.fn(() => {
      const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
      Object.defineProperty(image, "src", {
        get: () => image._src,
        set: (value: string) => {
          image._src = value;
          assignedSource = value;
          queueMicrotask(() => (image.onerror as (() => void) | null)?.());
        },
      });
      return image;
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage,
    };
    const loadSubpackage = vi.fn((options: { name: string; success: () => void }) => options.success());
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
      loadSubpackage,
    };

    try {
      const host = new WechatHost();
      await expect(host.createImage("assets/art/gameplay/blocks/formal-v1/orange-l-triomino.png"))
        .rejects.toThrow("Could not load image: gameplay-art/formal-v1/orange-l-triomino.png");
      expect(loadSubpackage.mock.calls[0]?.[0].name).toBe("gameplay-art");
      expect(assignedSource).toBe("");
    } finally {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("fails explicitly instead of requesting a deleted main-package path on old base libraries", async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage: vi.fn(),
    };
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
    };

    try {
      const host = new WechatHost();
      await expect(host.createImage("assets/art/ui/formal-pages/shop/reference.png"))
        .rejects.toThrow("base library is too old");
      expect(canvas.createImage).not.toHaveBeenCalled();
    } finally {
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("allows slow mobile subpackage downloads beyond five seconds", async () => {
    vi.useFakeTimers();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage: () => {
        const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
        Object.defineProperty(image, "src", {
          get: () => image._src,
          set: (value: string) => {
            image._src = value;
            queueMicrotask(() => (image.onload as (() => void) | null)?.());
          },
        });
        return image;
      },
    };
    let callbacks: { success: () => void; fail: (error: unknown) => void } | undefined;
    const loadSubpackage = vi.fn((next: { success: () => void; fail: (error: unknown) => void }) => {
      callbacks = next;
    });
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
      loadSubpackage,
    };

    try {
      const host = new WechatHost();
      const slow = host.createImage("assets/art/ui/formal-pages/shop/reference.png");
      await vi.advanceTimersByTimeAsync(5_500);
      callbacks?.success();
      await expect(slow).resolves.toMatchObject({ src: "meta-ui/formal-pages/shop/reference.png" });
      expect(loadSubpackage).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("times out a truly hung formal-page subpackage and allows a clean retry", async () => {
    vi.useFakeTimers();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage: () => {
        const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
        Object.defineProperty(image, "src", {
          get: () => image._src,
          set: (value: string) => {
            image._src = value;
            queueMicrotask(() => (image.onload as (() => void) | null)?.());
          },
        });
        return image;
      },
    };
    let firstCallbacks: { success: () => void; fail: (error: unknown) => void } | undefined;
    let attempts = 0;
    const loadSubpackage = vi.fn((callbacks: { success: () => void; fail: (error: unknown) => void }) => {
      attempts += 1;
      if (attempts === 1) firstCallbacks = callbacks;
      else callbacks.success();
    });
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
      loadSubpackage,
    };

    try {
      const host = new WechatHost();
      const hung = host.createImage("assets/art/ui/formal-pages/shop/reference.png");
      const rejected = expect(hung).rejects.toThrow("Timed out loading meta-ui subpackage after 60000ms");
      await vi.advanceTimersByTimeAsync(60_000);
      await rejected;
      firstCallbacks?.success();
      const recovered = await host.createImage("assets/art/ui/formal-pages/shop/reference.png");
      expect(loadSubpackage).toHaveBeenCalledTimes(2);
      expect(recovered.src).toBe("meta-ui/formal-pages/shop/reference.png");
    } finally {
      vi.useRealTimers();
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });

  it("times out a hung WeChat image, cancels it, and loads the next image", async () => {
    vi.useFakeTimers();
    let created = 0;
    let firstImage: Record<string, unknown> | undefined;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({}),
      requestAnimationFrame: vi.fn(),
      createImage: () => {
        created += 1;
        const shouldHang = created === 1;
        const image: Record<string, unknown> = { onload: null, onerror: null, _src: "" };
        Object.defineProperty(image, "src", {
          get: () => image._src,
          set: (value: string) => {
            image._src = value;
            if (!shouldHang && value) queueMicrotask(() => (image.onload as (() => void) | null)?.());
          },
        });
        if (shouldHang) firstImage = image;
        return image;
      },
    };
    (globalThis as typeof globalThis & { wx: unknown }).wx = {
      getWindowInfo: () => ({ screenWidth: 360, screenHeight: 792, pixelRatio: 2 }),
      createCanvas: () => canvas,
    };

    try {
      const host = new WechatHost();
      const hung = host.createImage("assets/art/ui/buttons-v1.png");
      const rejected = expect(hung).rejects.toThrow("Timed out loading image after 15000ms");
      await vi.advanceTimersByTimeAsync(15_000);
      await rejected;
      expect(firstImage?.src).toBe("");
      const recovered = await host.createImage("assets/art/ui/buttons-v1.png");
      expect(recovered.src).toBe("assets/art/ui/buttons-v1.png");
    } finally {
      vi.useRealTimers();
      delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
    }
  });
});
