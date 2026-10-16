import { describe, expect, it } from "vitest";
import { normalizePlayerProfile } from "../src/core/playerProfile";
import {
  drawPlayerProfile, PROFILE_CATALOG_RECT, PROFILE_LAYOUT, PROFILE_OFFSET_Y, PROFILE_SCALE,
  profileCatalogCells, profileCatalogMaxScroll, profileNotificationDotRect, profileTargets,
  type ProfileArt, type ProfilePage, type ProfileRect, type ProfileView,
} from "../src/game/playerProfileUi";

function view(page: ProfilePage = "stats"): ProfileView {
  return {
    page, profile: normalizePlayerProfile({ id: "7654321", name: "Player", avatar: 0, frame: 0 }),
    draftAvatar: 0, draftFrame: 0, name: "Player", coins: 200, highest: 20, totalStars: 30,
    levelRank: 12, english: false, pending: false,
    unlockedAvatars: Array(25).fill(true), unlockedFrames: Array(19).fill(true),
    unreadAvatars: Array(25).fill(false), unreadFrames: Array(19).fill(false),
  };
}

function flags(length: number, ...indices: number[]): boolean[] {
  return Array.from({ length }, (_, index) => indices.includes(index));
}

function paint(v: ProfileView, callback = true) {
  const dots: Array<{ rect: ProfileRect; clipped: boolean; afterSelection: boolean }> = [];
  const selected = {} as HTMLImageElement;
  let clipped = false, afterSelection = false;
  const stack: boolean[] = [];
  const target = {
    save() { stack.push(clipped); },
    restore() { clipped = stack.pop() ?? false; },
    clip() { clipped = true; },
    drawImage(image: HTMLImageElement) { if (image === selected) afterSelection = true; },
  };
  const ctx = new Proxy(target, {
    get(object, key) { return key in object ? object[key as keyof typeof target] : () => undefined; },
    set() { return true; },
  }) as unknown as CanvasRenderingContext2D;
  const art = { avatars: [], frames: [], stats: [], ui: { selected } } as unknown as ProfileArt;
  drawPlayerProfile(ctx, v, art, (_key, _rect, draw) => draw(), callback ? {
    notificationDot(rect) { dots.push({ rect, clipped, afterSelection }); },
  } : {});
  return dots;
}

describe("profile appearance notification rendering", () => {
  it("positions a reusable dot inside its owner's top right without mutating the owner", () => {
    const owner = { x: 11, y: 30, width: 62, height: 62 };
    expect(profileNotificationDotRect(owner, 22)).toEqual({ x: 49, y: 32, width: 22, height: 22 });
    expect(owner).toEqual({ x: 11, y: 30, width: 62, height: 62 });
  });

  it.each(["avatar", "frame"] as const)("aggregates unread %s discoveries on the stats avatar", kind => {
    const v = view();
    if (kind === "avatar") v.unreadAvatars = flags(25, 20);
    else v.unreadFrames = flags(19, 18);
    expect(paint(v).map(dot => dot.rect)).toEqual([profileNotificationDotRect(PROFILE_LAYOUT.avatar, 30)]);
    expect(paint(view())).toEqual([]);
  });

  it.each(["avatar", "frame"] as const)("aggregates the editor avatar and only the unread %s tab", kind => {
    const v = view("avatar");
    if (kind === "avatar") v.unreadAvatars = flags(25, 20);
    else v.unreadFrames = flags(19, 18);
    expect(paint(v).map(dot => dot.rect)).toEqual([
      profileNotificationDotRect(PROFILE_LAYOUT.editAvatar, 30),
      profileNotificationDotRect(kind === "avatar" ? PROFILE_LAYOUT.avatarTab : PROFILE_LAYOUT.frameTab, 30),
    ]);
    expect(paint({ ...v, unreadAvatars: flags(25, 20), unreadFrames: flags(19, 18) }).map(dot => dot.rect)).toEqual([
      profileNotificationDotRect(PROFILE_LAYOUT.editAvatar, 30),
      profileNotificationDotRect(PROFILE_LAYOUT.avatarTab, 30),
      profileNotificationDotRect(PROFILE_LAYOUT.frameTab, 30),
    ]);
  });

  it.each(["avatar", "frame"] as const)("filters locked %s cells and paints unread cells after selection inside the clip", kind => {
    const v = view(kind), unlocked = flags(kind === "avatar" ? 25 : 19, 0, 2);
    if (kind === "avatar") { v.unreadAvatars = flags(25, 0, 1, 2); v.unlockedAvatars = unlocked; }
    else { v.unreadFrames = flags(19, 0, 1, 2); v.unlockedFrames = unlocked; }
    const dots = paint(v), cellDots = dots.filter(dot => dot.clipped);
    const expected = profileCatalogCells(kind).filter(cell => cell.index === 0 || cell.index === 2).map(cell =>
      profileNotificationDotRect({
        x: cell.rect.x / PROFILE_SCALE, y: (cell.rect.y - PROFILE_OFFSET_Y) / PROFILE_SCALE,
        width: cell.rect.width / PROFILE_SCALE, height: cell.rect.width / PROFILE_SCALE,
      }, 24));
    expect(cellDots.map(dot => dot.rect)).toEqual(expected);
    expect(cellDots.every(dot => dot.afterSelection)).toBe(true);
    expect(dots).toHaveLength(4); // editor aggregate, current tab, two unlocked cells
    expect(paint({ ...v, unreadAvatars: [], unreadFrames: [] })).toEqual([]);
  });

  it.each(["avatar", "frame"] as const)("keeps the scrolled last %s dot within the catalog and away from the scrollbar", page => {
    const v = view(page), last = page === "avatar" ? 24 : 18;
    v.scrollOffset = profileCatalogMaxScroll(page);
    if (page === "avatar") v.unreadAvatars = flags(25, last);
    else v.unreadFrames = flags(19, last);
    const dot = paint(v).find(item => item.clipped)!;
    expect(dot).toBeDefined();
    const logicalTop = dot.rect.y * PROFILE_SCALE + PROFILE_OFFSET_Y;
    const logicalBottom = (dot.rect.y + dot.rect.height) * PROFILE_SCALE + PROFILE_OFFSET_Y;
    expect(logicalTop).toBeGreaterThanOrEqual(PROFILE_CATALOG_RECT.y);
    expect(logicalBottom).toBeLessThanOrEqual(PROFILE_CATALOG_RECT.y + PROFILE_CATALOG_RECT.height);
    expect(dot.rect.x + dot.rect.width).toBeLessThan(610);
  });

  it("does not add targets or require a painter when discoveries change", () => {
    const baseline = view("avatar"), unread = { ...baseline, unreadAvatars: flags(25, 0, 1) };
    expect(profileTargets(unread)).toEqual(profileTargets(baseline));
    expect(paint(unread, false)).toEqual([]);
    expect(profileTargets({ ...unread, pending: true })).toEqual(profileTargets({ ...baseline, pending: true }));
  });
});
