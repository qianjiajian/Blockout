import { PROFILE_AVATAR_COUNT, PROFILE_FRAME_COUNT, PROFILE_FRAME_COLORS, PROFILE_RENAME_PRICE, profileUnlockLevel, type PlayerProfile } from "../core/playerProfile";
import type { ProfileSuppliedArt } from "./profileSuppliedArt";

export type ProfilePage = "stats" | "avatar" | "frame" | "rename";
export interface ProfileRect { x: number; y: number; width: number; height: number }
export const PROFILE_HOME_RECT = { x: 11, y: 30, width: 62, height: 62 };
// Native positions from the 720×1584 supplied reference; project once to logical space.
export const PROFILE_SCALE = 496 / 720;
export const PROFILE_OFFSET_Y = 539 - 792 * PROFILE_SCALE;
export const profileRect = (x: number, y: number, width: number, height: number): ProfileRect => ({
  x: x * PROFILE_SCALE, y: PROFILE_OFFSET_Y + y * PROFILE_SCALE, width: width * PROFILE_SCALE, height: height * PROFILE_SCALE,
});
const logical = (r: ProfileRect) => profileRect(r.x, r.y, r.width, r.height);
export const PROFILE_LAYOUT = {
  statsPanel: { x: 63, y: 306, width: 594, height: 844 },
  editorPanel: { x: 63, y: 306, width: 594, height: 932 },
  close: { x: 584, y: 381, width: 94, height: 98 },
  titleZh: { x: 229, y: 333, width: 263, height: 82 },
  titleEn: { x: 219, y: 334, width: 282, height: 80 },
  avatar: { x: 134, y: 526, width: 110, height: 110 },
  editBadge: { x: 229, y: 603, width: 33, height: 34 },
  name: { x: 261, y: 527, width: 319, height: 49 },
  statsEditName: { x: 536, y: 527, width: 49, height: 49 },
  id: { x: 261, y: 584, width: 319, height: 49 },
  copy: { x: 526, y: 593, width: 31, height: 33 },
  editAvatar: { x: 134, y: 507, width: 98, height: 98 },
  editName: { x: 526, y: 517, width: 66, height: 67 },
  editNameField: { x: 180, y: 517, width: 319, height: 68 },
  avatarPage: { x: 85, y: 638, width: 551, height: 579 },
  avatarTab: { x: 112, y: 638, width: 241, height: 81 },
  frameTab: { x: 367, y: 638, width: 241, height: 81 },
  catalog: { x: 103, y: 764, width: 516, height: 316 },
  save: { x: 248, y: 1100, width: 225, height: 84 },
  renamePanel: { x: 63, y: 590, width: 594, height: 514 },
  renameClose: { x: 584, y: 579, width: 94, height: 98 },
  renameInput: { x: 131, y: 817, width: 458, height: 84 },
  rename: { x: 231, y: 946, width: 258, height: 85 },
} as const;
export const PROFILE_INPUT_RECT = logical(PROFILE_LAYOUT.renameInput);
export const PROFILE_CATALOG_RECT = logical(PROFILE_LAYOUT.catalog);
// Keep dots inside the owner so the last catalog column stays clear of its scrollbar.
// The input and result use the caller's coordinate space (Home logical or profile artwork).
export const profileNotificationDotRect = (rect: ProfileRect, size: number): ProfileRect => ({
  x: rect.x + rect.width - size - 2, y: rect.y + 2, width: size, height: size,
});
// Keep the enlarged touch targets on their own rows at narrow phone widths.
export const PROFILE_STATS_ACTION_BOUNDS = {
  "profile.editName": profileRect(510, 507, 100, 73),
  "profile.copy": profileRect(510, 580, 100, 73),
} as const;
function catalogGrid(page: ProfilePage) {
  return page === "frame"
    ? { count: PROFILE_FRAME_COUNT, columns: 4, x: 123, y: 786, stepX: 126, stepY: 126, width: 100, height: 110 }
    : { count: PROFILE_AVATAR_COUNT, columns: 5, x: 116, y: 787, stepX: 101, stepY: 110, width: 90, height: 100 };
}
export const profileCatalogMaxScroll = (page: ProfilePage): number => {
  const g = catalogGrid(page);
  return Math.max(0, g.y + (Math.ceil(g.count / g.columns) - 1) * g.stepY + g.height + 10
    - PROFILE_LAYOUT.catalog.y - PROFILE_LAYOUT.catalog.height) * PROFILE_SCALE;
};
export function profileCatalogCells(page: ProfilePage, scrollOffset = 0): Array<{ index: number; rect: ProfileRect; hit: ProfileRect }> {
  const g = catalogGrid(page), offset = Math.max(0, Math.min(profileCatalogMaxScroll(page), scrollOffset));
  return Array.from({ length: g.count }, (_, index) => {
    const rect = profileRect(g.x + index % g.columns * g.stepX, g.y + Math.floor(index / g.columns) * g.stepY, g.width, g.height);
    rect.y -= offset;
    const y = Math.max(rect.y, PROFILE_CATALOG_RECT.y);
    const bottom = Math.min(rect.y + rect.height, PROFILE_CATALOG_RECT.y + PROFILE_CATALOG_RECT.height);
    return { index, rect, hit: { ...rect, y, height: Math.max(0, bottom - y) } };
  }).filter(cell => cell.hit.height > 0);
}
export interface ProfileView {
  page: ProfilePage; profile: PlayerProfile; draftAvatar: number; draftFrame: number; name: string; coins: number;
  highest: number; totalStars: number; levelRank: number | null; english: boolean; pending: boolean;
  feedback?: string; loading?: boolean; scrollOffset?: number; saveEnabled?: boolean;
  unlockedAvatars?: readonly boolean[]; unlockedFrames?: readonly boolean[];
  unreadAvatars?: readonly boolean[]; unreadFrames?: readonly boolean[];
  renameReturnPage?: "stats" | "avatar";
}
export interface ProfileArt {
  header: HTMLImageElement; panel: HTMLImageElement; save: HTMLImageElement; edit: HTMLImageElement; coin: HTMLImageElement;
  avatars: HTMLImageElement[]; frames: HTMLImageElement[]; stats: HTMLImageElement[]; ui?: ProfileSuppliedArt;
}
export interface ProfilePaint {
  popup?: (key: string, bounds: ProfileRect, draw: () => void) => void;
  /** Called inside the profile's 720-wide artwork transform and any active catalog clip. */
  notificationDot?: (rect: ProfileRect) => void;
  lockedImage?: (image: HTMLImageElement) => CanvasImageSource | undefined;
}
export function profileTargets(v: Pick<ProfileView, "page" | "pending" | "loading" | "scrollOffset" | "saveEnabled">): Array<[string, ProfileRect]> {
  const l = PROFILE_LAYOUT;
  if (v.loading) return [["profile.close", logical(l.close)]];
  if (v.pending) return [["profile.retry", logical(v.page === "rename" ? l.rename : l.save)]];
  if (v.page === "rename") return [["profile.input", PROFILE_INPUT_RECT], ["profile.rename", logical(l.rename)],
    ["profile.cancelRename", logical(l.renameClose)], ["profile.cancelRenameBottom", profileRect(0, 1104, 720, 480)]];
  const targets: Array<[string, ProfileRect]> = [["profile.close", logical(l.close)]];
  if (v.page === "stats") return [...targets, ["profile.edit", profileRect(134, 526, 130, 114)],
    ["profile.editName", logical(l.statsEditName)], ["profile.copy", logical(l.copy)]];
  targets.push(["profile.editName", logical(l.editName)], ["profile.avatarTab", logical(l.avatarTab)], ["profile.frameTab", logical(l.frameTab)]);
  if (v.saveEnabled !== false) targets.push(["profile.save", logical(l.save)]);
  for (const cell of profileCatalogCells(v.page, v.scrollOffset)) targets.push([`profile.select.${cell.index}`, cell.hit]);
  return targets;
}
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}
function text(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, size: number,
  color = "#582dd8", outline = false, maxWidth = 540, align: CanvasTextAlign = "center", stroke = "#7545c0") {
  ctx.font = `900 ${size}px Arial, "Microsoft YaHei", sans-serif`; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  if (outline) { ctx.strokeStyle = stroke; ctx.lineWidth = 5; ctx.strokeText(label, x, y, maxWidth); }
  ctx.fillStyle = color; ctx.fillText(label, x, y, maxWidth);
}
/** The supplied 146px canvas contains a roughly 100px ring, centered at (73,73).
 * Scale by the ring diameter, keeping the original transparent margins and decorations. */
export function profileFrameImageRect(rect: ProfileRect): ProfileRect {
  const scale = rect.width / 100, edge = 146 * scale;
  return { x: rect.x + rect.width / 2 - edge / 2, y: rect.y + rect.width / 2 - edge / 2, width: edge, height: edge };
}
export function drawProfileAvatar(ctx: CanvasRenderingContext2D, art: Pick<ProfileArt, "avatars" | "frames"> | undefined,
  avatar: number, frame: number, rect: ProfileRect) {
  const { x, y, width: w } = rect;
  const frameImage = art?.frames[frame], radius = frameImage ? w * .44 : w / 2;
  ctx.save(); ctx.beginPath(); ctx.arc(x + w / 2, y + w / 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#916027"; ctx.fill();
  if (!frameImage) { ctx.strokeStyle = PROFILE_FRAME_COLORS[frame % PROFILE_FRAME_COLORS.length]; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.clip();
  if (art?.avatars[avatar]) ctx.drawImage(art.avatars[avatar], x + w / 2 - radius, y + w / 2 - radius, radius * 2, radius * 2);
  else text(ctx, "★", x + w / 2, y + w / 2, w * .55, "#ffd452");
  ctx.restore();
  // Paint the frame after restoring the portrait clip so ears, leaves and other
  // protruding artwork remain intact and always sit above the avatar.
  if (frameImage) {
    const bounds = profileFrameImageRect(rect);
    ctx.drawImage(frameImage, bounds.x, bounds.y, bounds.width, bounds.height);
  }
}
export function drawPlayerProfile(ctx: CanvasRenderingContext2D, v: ProfileView, art: ProfileArt | undefined,
  press: (key: string, rect: ProfileRect, draw: () => void) => void, paint: ProfilePaint = {}) {
  const l = PROFILE_LAYOUT, ui = art?.ui,
    stats = v.page === "stats" || (v.page === "rename" && v.renameReturnPage === "stats"), english = v.english;
  const popup = paint.popup ?? ((_key: string, _bounds: ProfileRect, draw: () => void) => draw());
  const unreadAvatar = v.unreadAvatars?.some(Boolean) ?? false;
  const unreadFrame = v.unreadFrames?.some(Boolean) ?? false;
  const notification = (rect: ProfileRect, visible: boolean, size = 30) => {
    if (visible) paint.notificationDot?.(profileNotificationDotRect(rect, size));
  };
  const image = (bitmap: HTMLImageElement | undefined, r: ProfileRect, fill?: string) => {
    if (bitmap) ctx.drawImage(bitmap, r.x, r.y, r.width, r.height);
    else if (fill) rounded(ctx, r.x, r.y, r.width, r.height, 24, fill);
  };
  const button = (key: string, r: ProfileRect, bitmap: HTMLImageElement | undefined, caption: string, size: number) => {
    press(key, logical(r), () => {
      image(bitmap, r, "#3dcd06");
      if (caption) text(ctx, caption, r.x + r.width / 2, r.y + r.height / 2, size, "#fff", true, r.width - 25, "center", "#286e15");
    });
  };
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(0, 0, 496, 1078);
  const panel = stats ? l.statsPanel : l.editorPanel;
  popup("profile", logical(panel), () => {
    ctx.save(); ctx.translate(0, PROFILE_OFFSET_Y); ctx.scale(PROFILE_SCALE, PROFILE_SCALE);
    image(stats ? ui?.statsPanel : ui?.editorPanel, panel, "#f5ebe3");
    image(english ? ui?.titleEn : ui?.titleZh, english ? l.titleEn : l.titleZh);
    if (!ui) text(ctx, english ? "PROFILE" : "个人资料", 360, 375, 60, "#fff", true);
    if (!v.pending) press("profile.close", logical(l.close), () => {
      image(ui?.close, l.close, "#df4954"); if (!ui) text(ctx, "×", 631, 427, 64, "#fff");
    });
    if (stats) {
      drawProfileAvatar(ctx, art, v.profile.avatar, v.profile.frame, l.avatar);
      notification(l.avatar, unreadAvatar || unreadFrame);
      image(ui?.editBadge, l.editBadge, "#56b532");
      image(ui?.idField, l.name, "#eee0d4"); image(ui?.idField, l.id, "#eee0d4");
      text(ctx, v.profile.name, 276, 551, 30, "#582dd8", false, 244, "left");
      button("profile.editName", l.statsEditName, art?.edit, "", 30);
      text(ctx, `ID : ${v.profile.id}`, 276, 609, 30, "#582dd8", false, 241, "left");
      image(ui?.copy, l.copy); if (!ui) text(ctx, "▣", 542, 609, 31, "#fff");
      text(ctx, english ? "General Stats" : "总体统计", 360, 711, 45, "#fff", true, english ? 330 : 195);
      if (!english) {
        image(ui?.sparkle, { x: 226, y: 691, width: 33, height: 39 });
        image(ui?.sparkle, { x: 463, y: 691, width: 33, height: 39 });
      }
      const values = [v.highest, v.totalStars, v.levelRank ?? "—"];
      const labels = english ? ["Highest Level", "Total Stars", "Level Rank"] : ["最高关卡", "总星级", "关卡排名"];
      const icons = ui ? [ui.statHighest, ui.statStars, ui.statRank] : art?.stats;
      for (let i = 0; i < 3; i++) {
        const x = 145 + 149 * i;
        image(ui?.statCard, { x, y: 775, width: 130, height: 238 }, "#f5ebe3");
        const icon = icons?.[i];
        if (icon) {
          const scale = Math.min(111 / icon.naturalWidth, 105 / icon.naturalHeight);
          const w = icon.naturalWidth * scale, h = icon.naturalHeight * scale;
          image(icon, { x: x + 65 - w / 2, y: 839.5 - h / 2, width: w, height: h });
        }
        image(ui?.statValue, { x: x + 15, y: 905, width: 98, height: 52 }, "#e2d6df");
        text(ctx, String(values[i]), x + 64, 932, 30, "#9d53eb", false, 93);
        text(ctx, labels[i], x + 65, 980, 20, "#7e3de7", false, 118);
      }
      const joined = new Date(v.profile.joinedAt);
      image(ui?.joined, { x: 298, y: 1070, width: 22, height: 20 });
      text(ctx, `${joined.getMonth() + 1}/${joined.getFullYear()}`, 379, 1081, 25, "#af85e4", false, 132);
      ctx.beginPath(); ctx.moveTo(132, 1080); ctx.lineTo(270, 1080); ctx.moveTo(450, 1080); ctx.lineTo(576, 1080);
      ctx.strokeStyle = "#fffaf4"; ctx.lineWidth = 3; ctx.stroke();
    } else {
      image(ui?.idField, l.editNameField, "#eee0d4");
      drawProfileAvatar(ctx, art, v.draftAvatar, v.draftFrame, l.editAvatar);
      notification(l.editAvatar, unreadAvatar || unreadFrame);
      text(ctx, v.profile.name, 360, 552, 30, "#582dd8", false, 252);
      button("profile.editName", l.editName, art?.edit, "", 30);
      image(v.page === "frame" ? ui?.framePage : ui?.avatarPage, l.avatarPage, "#f5ebe3");
      image(ui?.tabButton, v.page === "frame" ? l.avatarTab : l.frameTab, "#f5ebe3");
      text(ctx, english ? "Avatar" : "头像", 232, 680, 41, "#7953c6", false, 217);
      text(ctx, english ? "Frame" : "头像框", 487, 680, 41, "#7953c6", false, 217);
      notification(l.avatarTab, unreadAvatar);
      notification(l.frameTab, unreadFrame);
      image(ui?.catalogPanel, l.catalog, "#eedbcf");
      const kind = v.page === "frame" ? "frame" : "avatar";
      ctx.save(); ctx.beginPath(); ctx.rect(l.catalog.x, l.catalog.y, l.catalog.width, l.catalog.height); ctx.clip();
      for (const cell of profileCatalogCells(v.page, v.scrollOffset)) {
        const index = cell.index, x = cell.rect.x / PROFILE_SCALE, y = (cell.rect.y - PROFILE_OFFSET_Y) / PROFILE_SCALE, size = cell.rect.width / PROFILE_SCALE;
        const unlocked = (kind === "frame" ? v.unlockedFrames : v.unlockedAvatars)?.[index] ?? true;
        const bitmap = kind === "frame" ? art?.frames[index] : art?.avatars[index];
        const gray = !unlocked && bitmap ? paint.lockedImage?.(bitmap) : undefined;
        const bounds = kind === "frame" ? profileFrameImageRect({ x, y, width: size, height: size }) : { x, y, width: size, height: size };
        ctx.save();
        if (!unlocked && !gray) ctx.filter = "grayscale(1)";
        if (gray) ctx.drawImage(gray, bounds.x, bounds.y, bounds.width, bounds.height);
        else image(bitmap, bounds);
        ctx.restore();
        if (!unlocked) {
          rounded(ctx, x + size - 26, y + size - 27, 27, 26, 6, "#654878");
          text(ctx, "🔒", x + size - 12, y + size - 13, 18, "#fff");
        }
        if ((kind === "frame" ? v.draftFrame : v.draftAvatar) === index) {
          if (ui) image(ui.selected, { x: x + size / 2 - 61, y: y + size / 2 - 61, width: 122, height: 122 });
          else { ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2); ctx.strokeStyle = "#9af42b"; ctx.lineWidth = 4; ctx.stroke(); }
        }
        notification({ x, y, width: size, height: size },
          unlocked && Boolean((kind === "frame" ? v.unreadFrames : v.unreadAvatars)?.[index]), 24);
      }
      ctx.restore();
      const maximum = profileCatalogMaxScroll(v.page);
      if (maximum > 0) {
        const h = l.catalog.height, thumb = h * h / (h + maximum / PROFILE_SCALE), offset = Math.max(0, Math.min(maximum, v.scrollOffset ?? 0));
        rounded(ctx, 610, 777, 4, h - 26, 2, "#e3cdbf");
        rounded(ctx, 610, 777 + (h - 26 - thumb) * offset / maximum, 4, thumb, 2, "#b798ba");
      }
      if (v.saveEnabled === false && !v.pending) {
        const avatarLevel = v.unlockedAvatars?.[v.draftAvatar] === false ? profileUnlockLevel("avatar", v.draftAvatar) : 0;
        const frameLevel = v.unlockedFrames?.[v.draftFrame] === false ? profileUnlockLevel("frame", v.draftFrame) : 0;
        const level = kind === "frame" ? (frameLevel || avatarLevel) : (avatarLevel || frameLevel);
        text(ctx, level ? (english ? `Complete level ${level} to unlock` : `通过${level}关解锁`) : (english ? "Locked" : "尚未解锁"),
          360.5, 1142, english ? 27 : 32, "#7953c6", false, 480);
      } else button(v.pending ? "profile.retry" : "profile.save", l.save, ui?.saveButton ?? art?.save,
        v.pending ? (english ? "Retry" : "重试保存") : (english ? "Save" : "保存"), 37);
    }
    if (v.page !== "rename") {
      if (v.loading) text(ctx, english ? "Loading…" : "正在加载…", 360, 740, 30, "#7953c6");
    }
    ctx.restore();
  });
  if (v.page === "rename") {
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(0, 0, 496, 1078);
    popup("profile.rename", logical(l.renamePanel), () => {
      ctx.save(); ctx.translate(0, PROFILE_OFFSET_Y); ctx.scale(PROFILE_SCALE, PROFILE_SCALE);
      image(ui?.renamePanel, l.renamePanel, "#f5ebe3");
      if (!v.pending) press("profile.cancelRename", logical(l.renameClose), () => {
        image(ui?.close, l.renameClose, "#df4954"); if (!ui) text(ctx, "×", 631, 625, 64, "#fff");
      });
      text(ctx, english ? "RENAME" : "修改昵称", 360, 646, 53, "#fff", true, 450);
      text(ctx, english ? "Enter your name" : "请输入你的昵称", 360, 772, 29, "#8052ef", false, 450);
      image(ui?.renameInput, l.renameInput, "#eee0d4");
      text(ctx, v.name, 154, 859, 36, "#582dd8", false, 410, "left");
      button(v.pending ? "profile.retry" : "profile.rename", l.rename, ui?.renameButton,
        v.pending ? (english ? "Retry" : "重试保存") : "", 36);
      if (!v.pending) {
        text(ctx, english ? "Rename" : "改名", 306, 989, 36, "#fff", true, 88, "center", "#286e15");
        image(ui?.coin ?? art?.coin, { x: 355, y: 970, width: 37, height: 38 });
        text(ctx, String(PROFILE_RENAME_PRICE), 430, 989, 36, v.coins < PROFILE_RENAME_PRICE ? "#ed2421" : "#fff", true, 74, "center", "#286e15");
      }
      if (v.loading) text(ctx, english ? "Loading…" : "正在加载…", 360, 926, 24, "#7953c6");
      ctx.restore();
    });
  }
  ctx.restore();
}
