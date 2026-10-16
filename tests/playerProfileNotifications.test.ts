import { describe, expect, it, vi } from "vitest";
import {
  markProfileAppearanceSeen, normalizePlayerProfile, profileAppearanceUnread, profileUnlockLevel,
  PROFILE_AVATAR_COUNT, PROFILE_BASE_AVATAR_COUNT, PROFILE_BASE_FRAME_COUNT, PROFILE_FRAME_COUNT,
  type ProfileAppearanceKind,
} from "../src/core/playerProfile";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { profileCatalogMaxScroll, profileTargets, type ProfileArt } from "../src/game/playerProfileUi";
import type { GameHost } from "../src/platform/Host";

const kinds = ["avatar", "frame"] as const;
const thresholds = kinds.flatMap(kind => Array.from({ length: 10 }, (_, offset) => ({
  kind, index: offset + (kind === "avatar" ? PROFILE_BASE_AVATAR_COUNT : PROFILE_BASE_FRAME_COUNT),
  level: offset * 20 + (kind === "avatar" ? 10 : 20),
})));
const completeProgress = { highestLevel: 200, rewardedLevels: [200] };

describe("profile appearance unread ledger", () => {
  it.each(thresholds)("notifies $kind $index only after clearing level $level and persists its acknowledgement", ({ kind, index, level }) => {
    const profile = normalizePlayerProfile({ avatar: 0, frame: 0 });
    const before = { highestLevel: level, rewardedLevels: [] };
    expect(profileUnlockLevel(kind, index)).toBe(level);
    expect(profileAppearanceUnread(kind, index, profile, before)).toBe(false);
    expect(markProfileAppearanceSeen(profile, kind, index, before)).toBe(false);
    const cleared = { highestLevel: level, rewardedLevels: [level] };
    expect(profileAppearanceUnread(kind, index, profile, cleared)).toBe(true);
    expect(profileAppearanceUnread(kind, index, profile, { highestLevel: level + 1, rewardedLevels: [] })).toBe(true);
    expect(markProfileAppearanceSeen(profile, kind, index, cleared)).toBe(true);
    expect(markProfileAppearanceSeen(profile, kind, index, cleared)).toBe(false);
    expect(profileAppearanceUnread(kind, index, normalizePlayerProfile(profile), cleared)).toBe(false);
    expect(profile).toMatchObject({ avatar: 0, frame: 0 });
  });

  it.each(kinds)("never notifies or acknowledges base or invalid %s indexes", kind => {
    const base = kind === "avatar" ? PROFILE_BASE_AVATAR_COUNT : PROFILE_BASE_FRAME_COUNT;
    const count = kind === "avatar" ? PROFILE_AVATAR_COUNT : PROFILE_FRAME_COUNT;
    const profile = normalizePlayerProfile(undefined), before = structuredClone(profile);
    for (const index of [...Array.from({ length: base }, (_, i) => i), -1, count, 999, 0.5, NaN, Infinity]) {
      expect(profileAppearanceUnread(kind, index, profile, completeProgress)).toBe(false);
      expect(markProfileAppearanceSeen(profile, kind, index, completeProgress)).toBe(false);
    }
    expect(profile).toEqual(before);
  });

  it("migrates only equipped legacy appearances while keeping other earned appearances unread", () => {
    const profile = normalizePlayerProfile({ avatar: 15, frame: 9 });
    expect(profile.seenAvatars).toEqual([15]);
    expect(profile.seenFrames).toEqual([9]);
    expect(profileAppearanceUnread("avatar", 15, profile, completeProgress)).toBe(false);
    expect(profileAppearanceUnread("frame", 9, profile, completeProgress)).toBe(false);
    expect(profileAppearanceUnread("avatar", 16, profile, completeProgress)).toBe(true);
    expect(profileAppearanceUnread("frame", 10, profile, completeProgress)).toBe(true);
  });

  it("preserves explicit empty ledgers, validates entries and copies the original arrays", () => {
    const explicit = normalizePlayerProfile({ avatar: 15, frame: 9, seenAvatars: [], seenFrames: [] });
    expect(explicit.seenAvatars).toEqual([]);
    expect(explicit.seenFrames).toEqual([]);
    expect(profileAppearanceUnread("avatar", 15, explicit, completeProgress)).toBe(false);
    const raw = { seenAvatars: [24, 15, 24, 14, -1, 25, "16", NaN, 15.5], seenFrames: [18, 9, 9, 8, 19] };
    const profile = normalizePlayerProfile(raw);
    expect(profile.seenAvatars).toEqual([15, 24]);
    expect(profile.seenFrames).toEqual([9, 18]);
    expect(profile.seenAvatars).not.toBe(raw.seenAvatars);
    expect(profile.seenFrames).not.toBe(raw.seenFrames);
  });

  it("records an equipped appearance so switching equipment cannot restore its dot", () => {
    const profile = normalizePlayerProfile({ avatar: 15, frame: 9, seenAvatars: [], seenFrames: [] });
    expect(markProfileAppearanceSeen(profile, "avatar", 15, completeProgress)).toBe(true);
    expect(markProfileAppearanceSeen(profile, "frame", 9, completeProgress)).toBe(true);
    profile.avatar = 0; profile.frame = 0;
    expect(profileAppearanceUnread("avatar", 15, profile, completeProgress)).toBe(false);
    expect(profileAppearanceUnread("frame", 9, profile, completeProgress)).toBe(false);
  });
});

function artFixture(): ProfileArt {
  const image = {} as HTMLImageElement;
  return { header: image, panel: image, save: image, edit: image, coin: image,
    avatars: Array.from({ length: 25 }, () => image), frames: Array.from({ length: 19 }, () => image), stats: [] };
}

/** Real Game save/selection methods, with image loads and all storage confined to this fixture. */
function fixture(overrides: Record<string, unknown> = {}) {
  let mode = "commit";
  let data: any = {
    schemaVersion: 1, currentLevel: 21, highestLevel: 21, coins: 240, bestStars: { 1: 3 },
    rewardedLevels: [1, 10, 20], language: "en", sound: false, music: false, collectionIntroShown: true,
    playerProfile: { id: "7654321", name: "Saved name", avatar: 0, frame: 0, attempts: {} }, ...overrides,
  };
  const writes: any[] = [];
  const host = {
    canvas: { setAttribute: vi.fn() }, context: {},
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1, safeTop: 0, safeBottom: 0 }),
    preferredLocales: () => ["en"], onPointer: vi.fn(), onResize: vi.fn(), onHide: vi.fn(), onShow: vi.fn(),
    requestFrame: () => 1, scheduleTimeout: () => 1, cancelTimeout: vi.fn(),
    createImage: () => new Promise(() => {}), releaseImage: vi.fn(),
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
  game.openProfile(); game.profileArt = artFixture(); game.profileArtLoading = false;
  writes.length = 0;
  return { game, writes, stored: () => data, setMode: (next: string) => { mode = next; } };
}

function tap(game: any, key: string) {
  const target = profileTargets(game.profileView()).find(([name]) => name === key);
  expect(target, `expected profile target ${key}`).toBeDefined();
  const rect = target![1];
  game.handleProfilePointer({ id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
}

function select(game: any, kind: ProfileAppearanceKind, index: number) {
  game.profilePage = kind;
  game.profileScrolls[kind].reset(index >= 15 ? profileCatalogMaxScroll(kind) : 0, profileCatalogMaxScroll(kind));
  tap(game, `profile.select.${index}`);
}

function withoutViewed(save: any) {
  const copy = structuredClone(save);
  delete copy.playerProfile.seenAvatars; delete copy.playerProfile.seenFrames;
  return copy;
}

describe("profile notification persistence through actual Game actions", () => {
  it("keeps opening and switching tabs read-only and aggregates both categories", () => {
    const { game, writes } = fixture();
    const initial = structuredClone(game.save), dots = game.profileNotifications();
    expect(dots.unreadAvatars.map((on: boolean, i: number) => on ? i : -1).filter((i: number) => i >= 0)).toEqual([15]);
    expect(dots.unreadFrames.map((on: boolean, i: number) => on ? i : -1).filter((i: number) => i >= 0)).toEqual([9]);
    expect(dots.hasUnread).toBe(true);
    tap(game, "profile.edit"); tap(game, "profile.frameTab"); tap(game, "profile.avatarTab");
    game.openProfile();
    expect(game.profileNotifications()).toEqual(dots);
    expect(game.save).toEqual(initial);
    expect(writes).toHaveLength(0);
  });

  it.each(kinds)("persists a selected %s dot without saving its draft appearance or name", kind => {
    const { game, writes, stored } = fixture();
    const index = kind === "avatar" ? 15 : 9;
    const before = structuredClone(game.save);
    game.profileDraftName = "Unsaved draft";
    select(game, kind, index);
    expect(writes).toHaveLength(1);
    expect(withoutViewed(stored())).toEqual(withoutViewed(before));
    expect(game.save.playerProfile).toMatchObject({ avatar: 0, frame: 0, name: "Saved name" });
    expect(game[kind === "avatar" ? "profileDraftAvatar" : "profileDraftFrame"]).toBe(index);
    expect(game.profileDraftName).toBe("Unsaved draft");
    expect(game.profilePage).toBe(kind);
    expect(game.profileFeedback).toBeUndefined();
    expect(game.buttonHints).toHaveLength(0);
    const dots = game.profileNotifications();
    expect((kind === "avatar" ? dots.unreadAvatars : dots.unreadFrames)[index]).toBe(false);
    expect(dots.hasUnread).toBe(true);
    const reloaded = fixture(stored()).game;
    expect(reloaded.profileNotifications()).toEqual(dots);
    expect(reloaded.save.playerProfile).toMatchObject({ avatar: 0, frame: 0 });
  });

  it("clears aggregate dots only after both items are selected and does not repeat writes", () => {
    const { game, writes } = fixture();
    select(game, "avatar", 15); select(game, "avatar", 15);
    expect(writes).toHaveLength(1);
    expect(game.profileNotifications().hasUnread).toBe(true);
    select(game, "frame", 9);
    expect(writes).toHaveLength(2);
    expect(game.profileNotifications().hasUnread).toBe(false);
    expect(game.save.playerProfile).toMatchObject({ avatar: 0, frame: 0 });
  });

  it("keeps locked previews and base selections out of the viewed ledger", () => {
    const { game, writes } = fixture();
    const before = structuredClone(game.save);
    select(game, "avatar", 16);
    expect(game.profileDraftAvatar).toBe(16);
    expect(game.profileView().saveEnabled).toBe(false);
    select(game, "avatar", 2);
    expect(game.profileDraftAvatar).toBe(2);
    expect(game.save).toEqual(before);
    expect(writes).toHaveLength(0);
    expect(game.profileNotifications().unreadAvatars[15]).toBe(true);
  });

  it("adds only a newly unlocked dot after existing items have been read", () => {
    const { game } = fixture();
    select(game, "avatar", 15); select(game, "frame", 9);
    game.save.highestLevel = 30;
    expect(game.profileNotifications().hasUnread).toBe(false);
    game.save.rewardedLevels.push(30);
    expect(game.profileNotifications().unreadAvatars[16]).toBe(true);
    expect(game.profileNotifications().unreadAvatars[15]).toBe(false);
    expect(game.profileNotifications().unreadFrames.some(Boolean)).toBe(false);
  });

  it("drops premature viewed indexes during load and deep clones both ledgers", () => {
    const { game } = fixture({ playerProfile: { avatar: 0, frame: 0, seenAvatars: [15, 24], seenFrames: [9, 18] } });
    expect(game.save.playerProfile.seenAvatars).toEqual([15]);
    expect(game.save.playerProfile.seenFrames).toEqual([9]);
    const copy = game.cloneSave(game.save);
    copy.playerProfile.seenAvatars.push(16); copy.playerProfile.seenFrames.push(10);
    expect(game.save.playerProfile.seenAvatars).toEqual([15]);
    expect(game.save.playerProfile.seenFrames).toEqual([9]);
  });

  it("keeps loaded equipped appearances read after switching back to base equipment", () => {
    const { game, writes, stored } = fixture({
      playerProfile: { avatar: 15, frame: 9, seenAvatars: [], seenFrames: [] },
    });
    expect(game.save.playerProfile.seenAvatars).toEqual([15]);
    expect(game.save.playerProfile.seenFrames).toEqual([9]);
    expect(game.profileNotifications().hasUnread).toBe(false);
    select(game, "avatar", 0); select(game, "frame", 0);
    expect(writes).toHaveLength(0);
    tap(game, "profile.save");
    expect(stored().playerProfile).toMatchObject({ avatar: 0, frame: 0, seenAvatars: [15], seenFrames: [9] });
    expect(game.profileNotifications().unreadAvatars[15]).toBe(false);
    expect(game.profileNotifications().unreadFrames[9]).toBe(false);
    expect(fixture(stored()).game.profileNotifications().hasUnread).toBe(false);
  });

  it("keeps a rejected acknowledgement unread and retries by selecting the same item", () => {
    const { game, writes, setMode, stored } = fixture();
    const original = structuredClone(game.save);
    setMode("reject"); select(game, "avatar", 15);
    expect(game.save).toEqual(original);
    expect(game.pendingProfileSave).toBeUndefined();
    expect(game.profileNotifications().unreadAvatars[15]).toBe(true);
    expect(game.profileFeedback).toBe("Save unconfirmed. Tap to retry");
    setMode("commit"); select(game, "avatar", 15);
    expect(writes).toHaveLength(2);
    expect(game.profileNotifications().unreadAvatars[15]).toBe(false);
    expect(stored().playerProfile.avatar).toBe(0);
  });

  it.each(["unknown-empty", "unknown-written"])("retries the identical seen-only candidate after %s without equipping or charging", mode => {
    const { game, writes, setMode, stored } = fixture();
    const original = structuredClone(game.save);
    setMode(mode); select(game, "avatar", 15);
    const pending = game.pendingProfileSave, candidate = pending.candidateSave;
    expect(pending.seenOnly).toBe(true);
    expect(game.save).toEqual(original);
    expect(game.profileNotifications().unreadAvatars[15]).toBe(true);
    expect(profileTargets(game.profileView()).map(([key]) => key)).toEqual(["profile.retry"]);
    expect(game.persist(game.cloneSave(game.save))).toBe(false);
    expect(game.ensureDailyTaskCycle()).toBe(false);
    game.refreshLifeState(Date.now() + 3600000); game.refreshLeague();
    game.profileDraftAvatar = 24; game.profileDraftFrame = 18; game.profileDraftName = "Not part of acknowledgement";
    const offset = game.profileScrolls.avatar.offset;
    setMode("commit"); tap(game, "profile.retry");
    expect(writes.at(-1)).toBe(candidate);
    expect(game.pendingProfileSave).toBeUndefined();
    expect(withoutViewed(stored())).toEqual(withoutViewed(original));
    expect(stored().playerProfile.seenAvatars).toEqual([15]);
    expect(game.profileNotifications().unreadAvatars[15]).toBe(false);
    expect(game.profileDraftAvatar).toBe(24);
    expect(game.profileDraftFrame).toBe(18);
    expect(game.profileDraftName).toBe("Not part of acknowledgement");
    expect(game.profileScrolls.avatar.offset).toBe(offset);
    expect(game.profileFeedback).toBeUndefined();
  });

  it("does not replace a pending rename candidate with a viewed-item acknowledgement", () => {
    const { game, writes, setMode } = fixture();
    game.profileDraftName = "Pending name";
    setMode("unknown-written"); game.commitProfile(true);
    const pending = game.pendingProfileSave, candidate = pending.candidateSave, count = writes.length;
    game.acknowledgeProfileAppearance("avatar", 15);
    expect(game.pendingProfileSave).toBe(pending);
    expect(game.pendingProfileSave.candidateSave).toBe(candidate);
    expect(writes).toHaveLength(count);
    expect(game.profileNotifications().unreadAvatars[15]).toBe(true);
  });

  it.each([
    ["pendingRankingSave", "commit"], ["pendingRankingSave", "unknown-empty"],
    ["pendingLifeStart", "commit"], ["pendingLifeStart", "unknown-empty"],
    ["pendingBoosterPurchase", "commit"], ["pendingBoosterPurchase", "unknown-empty"],
    ["pendingJourneyClaim", "commit"], ["pendingJourneyClaim", "unknown-empty"],
    ["pendingAchievementClaim", "unknown-empty"],
  ])("does not interfere with %s when storage is %s", (field, mode) => {
    const { game, writes, setMode } = fixture();
    const baselineSave = game.cloneSave(game.save), candidateSave = game.cloneSave(game.save);
    candidateSave.coins += 50;
    game[field] = { baselineSave, candidateSave };
    setMode(mode);
    game.acknowledgeProfileAppearance("avatar", 15);
    expect(writes).toHaveLength(0);
    expect(game.pendingProfileSave).toBeUndefined();
    expect(game[field].candidateSave).toBe(candidateSave);
    expect(game.save).toEqual(baselineSave);
    expect(game.buttonHints).toHaveLength(0);
    expect(game.profileNotifications().unreadAvatars[15]).toBe(true);
  });

  it("does not create or acknowledge a dot from temporary test progress", () => {
    const { game, writes } = fixture({ highestLevel: 6, currentLevel: 6, rewardedLevels: [1] });
    game.temporaryLevelTestSession = { baselineSave: game.cloneSave(game.save) };
    game.save.highestLevel = 200; game.save.rewardedLevels.push(200);
    expect(game.profileNotifications().hasUnread).toBe(false);
    select(game, "avatar", 24);
    expect(game.profileView().saveEnabled).toBe(false);
    expect(game.save.playerProfile.seenAvatars).toEqual([]);
    expect(writes).toHaveLength(0);
  });
});
