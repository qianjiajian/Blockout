// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GAME_LANGUAGES, TRANSLATIONS, translate } from "../src/game/localization";

const GUIDE_IDS = [
  "generator",
  "axis-block",
  "key-lock",
  "star",
  "flip-door",
  "colored-grid",
  "bomb",
  "shutter",
  "layered-lift",
  "color-exit",
  "irregular-block",
  "irregular-board",
  "frozen-exit",
  "numeric-ice",
  "multilayer-shell"
] as const;
const CHINESE_NAMES = [
  "色块生成器",
  "轴向块",
  "钥匙与锁",
  "星标块、星门",
  "翻转门",
  "彩色地格",
  "炸弹",
  "卷帘门",
  "升降台",
  "普通出口",
  "异形色块",
  "异形棋盘",
  "冰冻出口",
  "数字冰块",
  "外壳块"
] as const;
// Fingerprints of pre-change tutorial and retired guide text, not unrelated UI.
// The guide refresh must never rewrite those compatibility paths.
const TUTORIAL_AND_LEGACY_HASHES = {
  "zh-CN": "f7c7beed6a90785db0d03fafad8c416aa943c7aab7ccc0df37b1d12b52916549",
  "zh-TW": "b7fb546e6ac725fd6d499a8e8ee3036681f1d3b33ee9dd9cb591a65325c6d2df",
  "en": "d4c05d41a9cfa23d4146e6ed0729e0e7e23161c28be31bb6aaf5452dc7075034",
  "ja": "33d86e6fc9ec8e64c684ac850de95719c3d642a7af274fc43de365e654f2e3e9",
  "ko": "50ee316e3f2fdf965709ce7646b99faf528cfb7a6f1185ee97ac98df7f1bb3de",
  "es": "167d91933950e50652fc2951c100ff3697af00dd2a2e976410379df1e714bba9",
  "pt": "5f65f6d7a91ec16cabbe6699200b876aa3841c79892fd30fcabfa6562c214d16",
  "fr": "4c4970c35e06ff8993d796c4644cae8d3e274aaf212064729ed2c3479d7d854c",
  "de": "3e5a83fd702786a2eb61e9aecb78fe30ae05d26c7ddba862cb03fd95225cbbde",
  "ru": "7348783763aca0e31f6caff1d7c1c486da1c2e06e239e143e6e62a47fc446f1a"
} as const;

describe("fifteen-rule mechanism guide localization", () => {
  it.each(GAME_LANGUAGES)("%s explicitly localizes every current mechanism", (language) => {
    const names: string[] = [];
    for (const id of GUIDE_IDS) {
      const nameKey = `collection.mechanism.${id}.name` as const;
      const effectKey = `collection.mechanism.${id}.effect` as const;
      const name = translate(language, nameKey);
      const effect = translate(language, effectKey);
      expect(name.trim(), nameKey).not.toBe("");
      expect(effect.length, effectKey).toBeGreaterThan(15);
      expect(name, nameKey).not.toMatch(/collection\.mechanism\.|[{}]/);
      expect(effect, effectKey).not.toMatch(/collection\.mechanism\.|[{}]/);
      if (language !== "en") expect(effect, effectKey).not.toBe(TRANSLATIONS.en[effectKey]);
      names.push(name);
    }
    expect(new Set(names).size).toBe(15);
  });

  it("uses the exact supplied Simplified Chinese mechanism names", () => {
    expect(GUIDE_IDS.map((id) => translate("zh-CN", `collection.mechanism.${id}.name`)))
      .toEqual(CHINESE_NAMES);
  });

  it("explains the frozen rules' critical distinctions rather than old tutorial shortcuts", () => {
    const expected: Partial<Record<(typeof GUIDE_IDS)[number], readonly string[]>> = {
      generator: ["固定队列", "落点全空", "中心口", "不按时间", "不含冰块"],
      "axis-block": ["双向", "离场方向"],
      "key-lock": ["完全消除", "同组所有锁减1", "剥壳不解锁"],
      star: ["只能", "普通块也可", "星门仍保留"],
      "flip-door": ["整块消除或剥层", "所有", "一次", "本次使用", "普通移动不触发"],
      "colored-grid": ["外层同色", "不自动消除或变色", "不含外壳块"],
      bomb: ["可操作后", "暂停", "到0则失败", "剥掉炸弹所在外壳"],
      shutter: ["不可见", "不可移动", "剥层减1", "归零", "整组"],
      "layered-lift": ["全部腾空", "一部分", "移出即可", "不必消除"],
      "color-exit": ["外层颜色", "完整横截面", "同一门口", "细柄"],
      "irregular-block": ["平移", "不能旋转或拆分", "实际占格"],
      "irregular-board": ["所有色块占格", "可玩区域", "缺口", "分隔缝"],
      "frozen-exit": ["归零前不能通行", "整块消除或剥层", "减1"],
      "numeric-ice": ["不能移动或消除", "显示后", "其他块", "剥层", "隐藏期间不减数"],
      "multilayer-shell": ["最多", "两层且异色", "位置、形状不变", "本体颜色", "一次清除"],
    };
    for (const id of GUIDE_IDS) {
      const effect = translate("zh-CN", `collection.mechanism.${id}.effect`);
      for (const phrase of expected[id] ?? []) expect(effect, id).toContain(phrase);
    }
  });

  it.each(GAME_LANGUAGES)("%s preserves tutorials and non-displayed legacy entries", (language) => {
    const legacyEntries = Object.entries(TRANSLATIONS[language])
      .filter(([key]) => key.startsWith("feature.")
        || key.startsWith("collection.colorBlock.")
        || key.startsWith("collection.mechanism.timed-generator.")
        || key.startsWith("collection.mechanism.staged-frame."))
      .sort(([left], [right]) => left.localeCompare(right));
    expect(legacyEntries.length).toBeGreaterThan(6);
    expect(createHash("sha256").update(JSON.stringify(legacyEntries)).digest("hex"))
      .toBe(TUTORIAL_AND_LEGACY_HASHES[language]);
  });
});
