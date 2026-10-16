import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import {
  drawPlayerProfile,
  profileCatalogCells,
  profileCatalogMaxScroll,
  PROFILE_SCALE,
  profileRect,
  profileTargets,
  type ProfileArt,
} from "../src/game/playerProfileUi";
import type { GameHost } from "../src/platform/Host";

type Catalog = "avatar" | "frame";

function artFixture(): ProfileArt {
  const image = (key: string) => ({ key, naturalWidth: 64, naturalHeight: 64 }) as unknown as HTMLImageElement;
  return {
    header: image("header"), panel: image("panel"), save: image("save"), edit: image("edit"), coin: image("coin"),
    avatars: Array.from({ length: 25 }, (_, index) => image(`avatar-${index}`)),
    frames: Array.from({ length: 19 }, (_, index) => image(`frame-${index}`)),
    stats: [image("stat-0"), image("stat-1"), image("stat-2")],
  };
}

function fixture() {
  let mode = "commit";
  let data: any = {
    schemaVersion: 1, currentLevel: 6, highestLevel: 6, coins: 240,
    bestStars: { 1: 3 }, rewardedLevels: [1], language: "en", sound: false,
    music: false, collectionIntroShown: true,
  };
  const writes: any[] = [];
  const host = {
    canvas: { setAttribute: vi.fn() }, context: {},
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1, safeTop: 0, safeBottom: 0 }),
    preferredLocales: () => ["en"], onPointer: vi.fn(), onResize: vi.fn(), onHide: vi.fn(), onShow: vi.fn(),
    requestFrame: () => 1, scheduleTimeout: () => 1, cancelTimeout: vi.fn(),
    createImage: () => new Promise(() => {}),
    storageRead: () => mode.startsWith("unknown") ? { status: "unavailable" } : { status: "ok", value: structuredClone(data) },
    storageSet: (_key: string, value: any) => {
      writes.push(value);
      if (mode === "commit" || mode === "unknown-written") data = structuredClone(value);
      return mode === "commit";
    },
    storageGet: () => data, music: vi.fn(), sound: vi.fn(), vibrate: vi.fn(),
    musicTransport: () => ({ positionSeconds: 0, durationSeconds: 0, playing: false }),
    setMusicPaused: vi.fn(), seekMusic: vi.fn(),
  };
  const game = new ColorEscapeGame(host as unknown as GameHost) as any;
  game.openProfile();
  game.profileArt = artFixture();
  game.profilePage = "avatar";
  return { game, writes, stored: () => data, setMode: (value: string) => { mode = value; } };
}

function tap(game: any, key: string) {
  const target = profileTargets(game.profileView()).find(([name]) => name === key);
  expect(target, `expected visible target ${key}`).toBeDefined();
  const rect = target![1];
  game.handleProfilePointer({ id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
}

function select(game: any, kind: Catalog, index: number) {
  game.profilePage = kind;
  game.profileScrolls[kind].reset(index >= 15 ? profileCatalogMaxScroll(kind) : 0, profileCatalogMaxScroll(kind));
  tap(game, `profile.select.${index}`);
}

function expectSaveDisabled(game: any) {
  expect(game.profileView().saveEnabled).toBe(false);
  expect(profileTargets(game.profileView()).map(([key]) => key)).not.toContain("profile.save");
}

describe("locked profile appearance previews", () => {
  it.each([
    { kind: "avatar" as const, index: 15, field: "draftAvatar" },
    { kind: "frame" as const, index: 9, field: "draftFrame" },
  ])("selects and previews a locked $kind without equipping or writing it", ({ kind, index, field }) => {
    const { game, writes } = fixture();
    const original = structuredClone(game.save);
    const writeCount = writes.length;
    select(game, kind, index);
    expect(game.profileView()[field]).toBe(index);
    expect(game.profileFeedback).toBeUndefined();
    expectSaveDisabled(game);
    expect(game.save).toEqual(original);
    expect(writes).toHaveLength(writeCount);

    const save = profileRect(248, 1100, 225, 84);
    game.handleProfilePointer({ id: 1, x: save.x + save.width / 2, y: save.y + save.height / 2 });
    expect(game.pendingProfileSave).toBeUndefined();
    expect(writes).toHaveLength(writeCount);
    expect(game.save).toEqual(original);
  });

  it("keeps Save disabled across tabs until both selected appearances are unlocked", () => {
    const { game } = fixture();
    select(game, "avatar", 15);
    select(game, "frame", 9);
    expectSaveDisabled(game);
    select(game, "avatar", 2);
    expectSaveDisabled(game);
    expect(game.profileView().draftFrame).toBe(9);
    select(game, "frame", 4);
    expect(game.profileView().saveEnabled).toBe(true);
    expect(profileTargets(game.profileView()).map(([key]) => key)).toContain("profile.save");
  });

  it("enables and freely saves an eligible combination after previewing a locked choice", () => {
    const { game, stored } = fixture();
    game.save.highestLevel = 21;
    select(game, "avatar", 16);
    expectSaveDisabled(game);
    select(game, "avatar", 15);
    select(game, "frame", 9);
    expect(game.profileView().saveEnabled).toBe(true);
    tap(game, "profile.save");
    expect(stored().playerProfile).toMatchObject({ avatar: 15, frame: 9 });
    expect(stored().coins).toBe(240);
    expect(game.profilePage).toBe("frame");
    expect(game.profileFeedback).toBe("Saved successfully");
  });

  it("discards a locked preview when closed and reopened", () => {
    const { game, writes } = fixture();
    const original = structuredClone(game.save.playerProfile);
    const writeCount = writes.length;
    select(game, "avatar", 24);
    select(game, "frame", 18);
    tap(game, "profile.close");
    game.openProfile();
    expect(game.profileView()).toMatchObject({ draftAvatar: original.avatar, draftFrame: original.frame, saveEnabled: true });
    expect(game.save.playerProfile).toEqual(original);
    expect(writes).toHaveLength(writeCount);
  });

  it("retains the commit guard even if a caller bypasses the disabled Save target", () => {
    const { game, writes } = fixture();
    const original = structuredClone(game.save);
    const writeCount = writes.length;
    select(game, "avatar", 15);
    select(game, "frame", 9);
    game.commitProfile(false);
    expect(game.pendingProfileSave).toBeUndefined();
    expect(game.save).toEqual(original);
    expect(writes).toHaveLength(writeCount);
  });

  it("does not enable previewed cosmetics from temporary test progress", () => {
    const { game } = fixture();
    game.temporaryLevelTestSession = { baselineSave: game.cloneSave(game.save) };
    game.save.highestLevel = 200;
    game.save.rewardedLevels = [200];
    select(game, "avatar", 24);
    select(game, "frame", 18);
    expect(game.profileView()).toMatchObject({ draftAvatar: 24, draftFrame: 18 });
    expectSaveDisabled(game);
  });

  it("requires level 200 to be cleared before enabling the final frame", () => {
    const { game } = fixture();
    game.save.highestLevel = 200;
    select(game, "avatar", 24);
    select(game, "frame", 18);
    expectSaveDisabled(game);
    game.save.rewardedLevels.push(200);
    expect(game.profileView().saveEnabled).toBe(true);
    expect(profileTargets(game.profileView()).map(([key]) => key)).toContain("profile.save");
  });

  it("preserves Retry and the original candidate while a save is unconfirmed", () => {
    const { game, writes, stored, setMode } = fixture();
    game.save.highestLevel = 21;
    select(game, "avatar", 15);
    select(game, "frame", 9);
    game.profileScrolls.frame.reset(12, profileCatalogMaxScroll("frame"));
    const frameOffset = game.profileScrolls.frame.offset;
    setMode("unknown-written");
    tap(game, "profile.save");
    const candidate = game.pendingProfileSave.candidateSave;
    expect(game.profilePage).toBe("frame");
    expect(game.profileFeedback).toBe("Save unconfirmed. Tap to retry");
    game.profileDraftAvatar = 24;
    game.profileDraftFrame = 18;
    expect(profileTargets(game.profileView()).map(([key]) => key)).toEqual(["profile.retry"]);
    setMode("commit");
    tap(game, "profile.retry");
    expect(writes.at(-1)).toBe(candidate);
    expect(stored().playerProfile).toMatchObject({ avatar: 15, frame: 9 });
    expect(stored().coins).toBe(240);
    expect(game.pendingProfileSave).toBeUndefined();
    expect(game.profilePage).toBe("frame");
    expect(game.profileScrolls.frame.offset).toBe(frameOffset);
    expect(game.profileFeedback).toBe("Saved successfully");
    expect(game.profileView()).toMatchObject({ draftAvatar: 15, draftFrame: 9 });
  });
});

describe("appearance save feedback and editor continuity", () => {
  it.each([
    { kind: "avatar" as const, language: "zh-CN", feedback: "保存成功" },
    { kind: "frame" as const, language: "zh-CN", feedback: "保存成功" },
    { kind: "avatar" as const, language: "en", feedback: "Saved successfully" },
    { kind: "frame" as const, language: "en", feedback: "Saved successfully" },
  ])("keeps the $kind editor and both scroll positions after a confirmed $language save", ({ kind, language, feedback }) => {
    const { game, stored } = fixture();
    game.save.language = language;
    game.save.highestLevel = 200;
    game.save.rewardedLevels.push(200);
    select(game, "avatar", 24);
    select(game, "frame", 18);
    game.profilePage = kind;
    const avatarOffset = game.profileScrolls.avatar.offset;
    const frameOffset = game.profileScrolls.frame.offset;
    expect(avatarOffset).toBeGreaterThan(0);
    expect(frameOffset).toBeGreaterThan(0);

    tap(game, "profile.save");

    expect(stored().playerProfile).toMatchObject({ avatar: 24, frame: 18 });
    expect(game.save.playerProfile).toMatchObject({ avatar: 24, frame: 18 });
    expect(stored().coins).toBe(240);
    expect(game.profileView()).toMatchObject({ page: kind, draftAvatar: 24, draftFrame: 18, feedback, pending: false });
    expect(game.profileScrolls.avatar.offset).toBe(avatarOffset);
    expect(game.profileScrolls.frame.offset).toBe(frameOffset);
    expect(profileTargets(game.profileView()).map(([key]) => key)).toContain("profile.save");

    tap(game, "profile.close");
    game.openProfile();
    expect(game.profileView()).toMatchObject({ draftAvatar: 24, draftFrame: 18 });
  });

  it.each(["reject", "unknown-empty", "unknown-written"])("does not show success or equip the draft after %s persistence", mode => {
    const { game, setMode } = fixture();
    const original = structuredClone(game.save);
    select(game, "avatar", 2);
    select(game, "frame", 4);
    game.profileScrolls.frame.reset(12, profileCatalogMaxScroll("frame"));
    const offset = game.profileScrolls.frame.offset;
    setMode(mode);

    tap(game, "profile.save");

    expect(game.save).toEqual(original);
    expect(game.profilePage).toBe("frame");
    expect(game.profileScrolls.frame.offset).toBe(offset);
    expect(game.profileFeedback).toBe("Save unconfirmed. Tap to retry");
    expect(Boolean(game.pendingProfileSave)).toBe(mode !== "reject");
  });

  it("keeps the existing rename return path and 100-coin charge", () => {
    const { game, stored } = fixture();
    game.profilePage = "rename";
    game.profileDraftName = "New name";

    tap(game, "profile.rename");

    expect(stored().playerProfile.name).toBe("New name");
    expect(stored().coins).toBe(140);
    expect(game.profilePage).toBe("avatar");
    expect(game.profileFeedback).toBeUndefined();
  });
});

describe("locked catalog artwork visibility", () => {
  it.each<Catalog>(["avatar", "frame"])("draws locked %s catalog icons in gray while retaining a color preview and disabled Save", kind => {
    const { game } = fixture();
    select(game, kind, kind === "avatar" ? 24 : 18);
    const draws: Array<{ image: HTMLImageElement; alpha: number; filter: string; width: number }> = [];
    const states: Array<{ alpha: number; filter: string }> = [];
    const base: any = { globalAlpha: 1, filter: "none" };
    base.save = () => states.push({ alpha: base.globalAlpha, filter: base.filter });
    base.restore = () => {
      const previous = states.pop()!;
      base.globalAlpha = previous.alpha;
      base.filter = previous.filter;
    };
    base.drawImage = (image: HTMLImageElement, _x: number, _y: number, width: number) => draws.push({ image, alpha: base.globalAlpha, filter: base.filter, width });
    base.createLinearGradient = () => ({ addColorStop: () => {} });
    const ctx = new Proxy(base, { get: (target, key) => key in target ? target[key] : () => {} }) as CanvasRenderingContext2D;
    const pressed: string[] = [];
    drawPlayerProfile(ctx, game.profileView(), game.profileArt, (key, _rect, draw) => { pressed.push(key); draw(); });
    const images = kind === "avatar" ? game.profileArt.avatars.slice(15) : game.profileArt.frames.slice(9);
    const cells = profileCatalogCells(kind, game.profileView().scrollOffset);
    const size = cells[0].rect.width / PROFILE_SCALE * (kind === "frame" ? 1.46 : 1);
    const lockedDraws = draws.filter(draw => images.includes(draw.image) && Math.abs(draw.width - size) < .001);
    expect(lockedDraws.length).toBeGreaterThan(0);
    for (const draw of lockedDraws) {
      expect(draw.alpha).toBe(1);
      expect(draw.filter).toBe("grayscale(1)");
    }
    expect(draws.filter(draw => !lockedDraws.includes(draw)).every(draw => draw.filter === "none")).toBe(true);
    expect(draws.some(draw => images.includes(draw.image) && Math.abs(draw.width - size) >= .001 && draw.filter === "none")).toBe(true);
    expect(pressed).not.toContain("profile.save");
  });
});
