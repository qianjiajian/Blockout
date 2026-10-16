import { describe, expect, it } from "vitest";
import { PROFILE_AVATAR_COUNT, PROFILE_FRAME_COUNT } from "../src/core/playerProfile";
import { PROFILE_CATALOG_RECT, profileCatalogCells, profileCatalogMaxScroll, profileTargets, type ProfilePage } from "../src/game/playerProfileUi";

const catalogs = [
  { page: "avatar" as const, count: PROFILE_AVATAR_COUNT, last: 24 },
  { page: "frame" as const, count: PROFILE_FRAME_COUNT, last: 18 },
];
const itemTargets = (page: ProfilePage, scrollOffset: number) =>
  profileTargets({ page, pending: false, scrollOffset }).filter(([key]) => key.startsWith("profile.select."));

describe("profile catalog scroll layout", () => {
  it.each(catalogs)("keeps every $page item reachable with all visible hits clipped to the catalog", ({ page, count }) => {
    const maximum = profileCatalogMaxScroll(page);
    const reachable = new Set<number>();
    expect(maximum).toBeGreaterThan(0);
    for (const offset of [0, maximum / 2, maximum]) {
      const cells = profileCatalogCells(page, offset);
      expect(cells.length).toBeGreaterThan(0);
      for (const { index, rect, hit } of cells) {
        reachable.add(index);
        expect(hit.width).toBeGreaterThan(0);
        expect(hit.height).toBeGreaterThan(0);
        expect(hit.x).toBeGreaterThanOrEqual(PROFILE_CATALOG_RECT.x);
        expect(hit.y).toBeGreaterThanOrEqual(PROFILE_CATALOG_RECT.y);
        expect(hit.x + hit.width).toBeLessThanOrEqual(PROFILE_CATALOG_RECT.x + PROFILE_CATALOG_RECT.width + 1e-8);
        expect(hit.y + hit.height).toBeLessThanOrEqual(PROFILE_CATALOG_RECT.y + PROFILE_CATALOG_RECT.height + 1e-8);
        expect(hit.y).toBeGreaterThanOrEqual(rect.y);
        expect(hit.y + hit.height).toBeLessThanOrEqual(rect.y + rect.height + 1e-8);
      }
      expect(itemTargets(page, offset)).toEqual(cells.map(cell => [`profile.select.${cell.index}`, cell.hit]));
    }
    expect([...reachable].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, index) => index));
  });

  it.each(catalogs)("exposes the complete last $page item at the bottom while hiding offscreen earlier rows", ({ page, last }) => {
    const maximum = profileCatalogMaxScroll(page);
    const cells = profileCatalogCells(page, maximum);
    const final = cells.find(cell => cell.index === last);
    expect(final).toBeDefined();
    for (const dimension of ["x", "y", "width", "height"] as const) {
      expect(final!.hit[dimension]).toBeCloseTo(final!.rect[dimension], 8);
    }
    expect(cells.some(cell => cell.index === 0)).toBe(false);
    expect(itemTargets(page, maximum).some(([key]) => key === `profile.select.${last}`)).toBe(true);
    expect(profileCatalogCells(page, -100)).toEqual(profileCatalogCells(page, 0));
    expect(profileCatalogCells(page, maximum + 100)).toEqual(cells);
  });

  it.each(catalogs)("removes pagination and leaves $page controls fixed throughout scrolling", ({ page }) => {
    const maximum = profileCatalogMaxScroll(page);
    const fixed = (offset: number) => profileTargets({ page, pending: false, scrollOffset: offset })
      .filter(([key]) => !key.startsWith("profile.select."));
    expect(fixed(0)).toEqual(fixed(maximum / 2));
    expect(fixed(0)).toEqual(fixed(maximum));
    expect(fixed(0).map(([key]) => key)).toEqual([
      "profile.close", "profile.editName", "profile.avatarTab", "profile.frameTab", "profile.save",
    ]);
    const save = fixed(0).find(([key]) => key === "profile.save")![1];
    expect(save.y).toBeGreaterThan(PROFILE_CATALOG_RECT.y + PROFILE_CATALOG_RECT.height);
  });

  it.each<ProfilePage>(["avatar", "frame", "stats", "rename"])("exposes only retry during an unconfirmed %s save", page => {
    const targets = profileTargets({ page, pending: true, scrollOffset: 100 });
    expect(targets.map(([key]) => key)).toEqual(["profile.retry"]);
  });

  it.each<ProfilePage>(["stats", "rename"])("never exposes catalog choices on the %s page", page => {
    expect(itemTargets(page, 0)).toEqual([]);
    expect(itemTargets(page, 100)).toEqual([]);
  });
});
