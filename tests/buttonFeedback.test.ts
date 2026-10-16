import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { STACKED_HINT_HOLD } from "../src/game/stackedHintMotion";

// Real profile validation, feature gating and persistence on an isolated prototype.
// Rendering/scheduling are inert; storage is a cloned in-memory account only.
function fixture(coins = 240) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  let mode = "commit";
  const writes: any[] = [];
  game.save = game.sanitizeSave({
    schemaVersion: 1, currentLevel: 2, highestLevel: 2, rewardedLevels: [1],
    language: "zh-CN", coins, sound: false, music: false, reducedMotion: false,
    playerProfile: { id: "7654321", name: "原昵称", avatar: 0, frame: 0, attempts: {} },
  });
  let stored = structuredClone(game.save);
  game.host = {
    storageSet: vi.fn((_key: string, value: any) => {
      writes.push(value);
      if (mode === "commit" || mode === "unknown-written") stored = structuredClone(value);
      return mode === "commit";
    }),
    storageRead: vi.fn(() => mode.startsWith("unknown")
      ? { status: "unavailable" }
      : { status: "ok", value: structuredClone(stored) }),
  };
  game.appVisible = true;
  game.screen = "home";
  game.buttonHints = [];
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.profilePage = "rename";
  game.profileRenameReturnPage = "stats";
  game.profileDraftName = game.save.playerProfile.name;
  game.profileScrolls = { avatar: { cancel: vi.fn() }, frame: { cancel: vi.fn() } };
  game.scheduleFrame = vi.fn();
  game.playSound = vi.fn();
  game.requestHomeProfileArt = vi.fn();
  game.scheduleLifeRefreshWatch = vi.fn();
  game.closePopup = (_key: string, finish: () => void) => finish();
  return { game, writes, stored: () => stored, setMode: (value: string) => { mode = value; } };
}

describe("global button feedback integration", () => {
  it("routes real unchanged-name validation into the shared toast without touching storage", () => {
    const { game } = fixture(), before = structuredClone(game.save);
    game.commitProfile(true);
    expect(game.profileFeedback).toBe("请输入不同的昵称");
    expect(game.buttonHints).toHaveLength(1);
    expect(game.buttonHints[0]).toMatchObject({ text: "请输入不同的昵称", age: 0 });
    expect(game.pendingProfileSave).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.host.storageRead).not.toHaveBeenCalled();
    expect(game.scheduleFrame).toHaveBeenCalled();
  });

  it("routes an unaffordable actual rename to Coins insufficient without constructing a save candidate", () => {
    const { game } = fixture(99), before = structuredClone(game.save);
    game.profileDraftName = "新昵称";
    game.commitProfile(true);
    expect(game.profileFeedback).toBe("金币不足");
    expect(game.buttonHints.at(-1).text).toBe("金币不足");
    expect(game.pendingProfileSave).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.host.storageRead).not.toHaveBeenCalled();
  });

  it("keeps repeated text and messages from different real sources in one independently aged stack", () => {
    const { game } = fixture();
    game.commitProfile(true);
    const first = game.buttonHints[0];
    game.updateButtonHints(0.35);
    game.commitProfile(true);
    const second = game.buttonHints[1];
    game.requireFeature("levels");
    expect(game.buttonHints).toHaveLength(3);
    expect(game.buttonHints.slice(0, 2).map((hint: any) => hint.text)).toEqual(["请输入不同的昵称", "请输入不同的昵称"]);
    expect(game.buttonHints[0]).toBe(first);
    expect(first.age).toBeCloseTo(0.35, 10);
    expect(game.buttonHints[1]).toBe(second);
    expect(second.age).toBe(0);
    expect(game.buttonHints[2]).toMatchObject({ feature: "levels", text: "通关第10关解锁", age: 0 });
    game.updateButtonHints(0.1);
    expect(first.age).toBeCloseTo(0.45, 10);
    expect(second.age).toBeCloseTo(0.1, 10);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("pauses generic and feature hints together in the background, then resumes their existing ages", () => {
    const { game } = fixture();
    game.commitProfile(true);
    game.requireFeature("supply");
    game.updateButtonHints(0.3);
    const before = structuredClone(game.buttonHints);
    game.appVisible = false;
    game.updateButtonHints(30);
    expect(game.buttonHints).toEqual(before);
    game.appVisible = true;
    game.updateButtonHints(0.1);
    expect(game.buttonHints.map((hint: any) => hint.age)).toEqual(before.map((hint: any) => hint.age + 0.1));
  });

  it("retains non-feature toasts when compatibility feedback is cleared or a feature becomes available", () => {
    const { game } = fixture();
    game.commitProfile(true);
    const profileHint = game.buttonHints[0];
    game.requireFeature("levels");
    game.requireFeature("supply");
    game.profileFeedback = undefined;
    expect(game.buttonHints).toHaveLength(3);
    game.save.highestLevel = 11;
    expect(game.requireFeature("levels")).toBe(true);
    expect(game.featureLockFeedback).toBeUndefined();
    expect(game.featureLockFeedbacks).toEqual([]);
    expect(game.buttonHints).toEqual([profileHint]);
    game.featureLockFeedback = undefined;
    expect(game.buttonHints).toEqual([profileHint]);
  });

  it.each(["unknown-unwritten", "unknown-written"])("keeps the exact pending rename candidate after %s toast expires and retries once", mode => {
    const { game, writes, stored, setMode } = fixture();
    game.profileDraftName = "确定的昵称";
    setMode(mode);
    game.commitProfile(true);
    const pending = game.pendingProfileSave, candidate = pending.candidateSave;
    expect(game.buttonHints.at(-1).text).toBe("保存未确认，请重试");
    expect(game.save.coins).toBe(240);
    expect(game.save.playerProfile.name).toBe("原昵称");
    game.updateButtonHints(STACKED_HINT_HOLD + 1);
    expect(game.buttonHints).toEqual([]);
    expect(game.pendingProfileSave).toBe(pending);
    expect(game.pendingProfileSave.candidateSave).toBe(candidate);
    expect(writes).toEqual([candidate]);
    game.profileDraftName = "不能覆盖候选";
    setMode("commit");
    game.commitProfile(true);
    expect(writes).toHaveLength(2);
    expect(writes[1]).toBe(candidate);
    expect(stored().coins).toBe(140);
    expect(stored().playerProfile.name).toBe("确定的昵称");
    expect(game.pendingProfileSave).toBeUndefined();
    expect(game.profilePage).toBe("stats");
  });

  it("preserves feedback payload identity while adding only transient text to the global queue", () => {
    const { game } = fixture(), before = structuredClone(game.save);
    const value = { text: "金币不足", color: "#ff0000" };
    expect(game.notifyButtonFeedback(value)).toBe(value);
    expect(game.notifyButtonFeedback("广告暂不可用")).toBe("广告暂不可用");
    expect(game.buttonHints.map((hint: any) => hint.text)).toEqual(["金币不足", "广告暂不可用"]);
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.host.storageRead).not.toHaveBeenCalled();
  });

  it("centers a message that needs 18px but still fits on one line within its own panel", () => {
    const { game } = fixture();
    const ctx = { font: "", globalAlpha: 1, save: vi.fn(), restore: vi.fn(), drawImage: vi.fn(),
      measureText: vi.fn(() => ({ width: ctx.font.includes("22px") ? 374 : 306 })) };
    game.ctx = ctx;
    game.art = { lockedHintPanel: {} };
    game.label = vi.fn();
    game.wrapText = vi.fn();
    const text = "保存失败，请重试领取，无需重看广告";
    game.drawButtonHint(text, 431.2);
    expect(game.label).toHaveBeenCalledOnce();
    expect(game.label.mock.calls[0].slice(0, 5)).toEqual([text, 248, 431.2, 18, "#ffffff"]);
    expect(game.wrapText).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledOnce();
  });
});
