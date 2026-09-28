import { describe, expect, it } from "vitest";
import {
  GAME_LANGUAGES,
  GAME_LANGUAGE_METADATA,
  TRANSLATIONS,
  TRANSLATION_KEYS,
  isGameLanguage,
  resolvePreferredLanguage,
  translate,
  type TranslationKey,
} from "../src/game/localization";

const placeholders = (text: string): string[] => [...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
  .map((match) => match[1])
  .sort();

describe("game localization", () => {
  it("ships exactly ten stable languages with unique native names", () => {
    expect(GAME_LANGUAGES).toEqual([
      "zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru",
    ]);
    expect(GAME_LANGUAGE_METADATA.map(({ language }) => language)).toEqual(GAME_LANGUAGES);
    expect(new Set(GAME_LANGUAGE_METADATA.map(({ nativeName }) => nativeName)).size).toBe(10);
    expect(GAME_LANGUAGE_METADATA.every(({ nativeName, englishName }) => nativeName && englishName)).toBe(true);
  });

  it("recognizes only persisted game-language tags", () => {
    GAME_LANGUAGES.forEach((language) => expect(isGameLanguage(language)).toBe(true));
    ["zh", "zh_HK", "en-US", "it", "", null, 1].forEach((value) => {
      expect(isGameLanguage(value)).toBe(false);
    });
  });

  it.each([
    [["zh_CN"], "zh-CN"],
    [["zh-Hans-CN"], "zh-CN"],
    [["zh"], "zh-CN"],
    [["zh_TW"], "zh-TW"],
    [["zh-Hant-HK"], "zh-TW"],
    [["zh-HK"], "zh-TW"],
    [["en-US"], "en"],
    [["ja-JP"], "ja"],
    [["ko_KR"], "ko"],
    [["es-419"], "es"],
    [["pt-BR"], "pt"],
    [["fr-CA"], "fr"],
    [["de-DE"], "de"],
    [["ru-RU"], "ru"],
    [["ar-SA", "fr-FR", "en-US"], "fr"],
    [["ar-SA", "it-IT"], "en"],
    [[], "en"],
  ] as const)("resolves %j to %s", (input, expected) => {
    expect(resolvePreferredLanguage(input)).toBe(expected);
  });

  it("also accepts one device locale value and safely falls back", () => {
    expect(resolvePreferredLanguage("pt_PT")).toBe("pt");
    expect(resolvePreferredLanguage(undefined)).toBe("en");
    expect(resolvePreferredLanguage(null)).toBe("en");
  });

  it("keeps every dictionary complete, non-empty, and placeholder-compatible", () => {
    const expectedKeys = [...TRANSLATION_KEYS].sort();
    for (const language of GAME_LANGUAGES) {
      const dictionary = TRANSLATIONS[language];
      expect(Object.keys(dictionary).sort()).toEqual(expectedKeys);
      for (const key of TRANSLATION_KEYS) {
        expect(dictionary[key].trim(), `${language}:${key}`).not.toBe("");
        expect(placeholders(dictionary[key]), `${language}:${key}`).toEqual(
          placeholders(TRANSLATIONS.en[key]),
        );
      }
    }
  });

  it("covers every major dynamic player-facing surface", () => {
    const keys = new Set<string>(TRANSLATION_KEYS);
    [
      "startup.preparing",
      "page.retryLoad",
      "update.item.aspectRatio",
      "shop.purchaseSuccess",
      "shop.fullInventory",
      "leaderboard.noData",
      "journey.episodeTitle",
      "journey.finaleTitle",
      "journey.claimAfterLevel",
      "collection.colorBlock.effect",
      "gameplay.undo.none",
      "gameplay.strategy.followup",
      "gameplay.strategy.blocker",
      "gameplay.strategy.focus",
      "gameplay.booster.unlockAtLevel",
      "gameplay.pulse.shutterOpened",
      "settlement.failure.abandonRefundUnknown",
      "settlement.failure.retryOrAbandon",
    ].forEach((key) => expect(keys.has(key), key).toBe(true));

    expect(TRANSLATION_KEYS.filter((key) => (
      key.startsWith("collection.mechanism.") && key.endsWith(".name")
    ))).toHaveLength(17); // 15 displayed mechanics plus two historical compatibility entries.
    expect(TRANSLATION_KEYS.filter((key) => (
      key.startsWith("collection.mechanism.") && key.endsWith(".effect")
    ))).toHaveLength(17);
  });

  it("interpolates named values without treating replacement text as syntax", () => {
    expect(translate("zh-CN", "common.levelNumber", { level: 12 })).toBe("第 12 关");
    expect(translate("de", "timeout.blocksRemaining", { count: 7 })).toBe("Verbleibende Blöcke: 7");
    expect(translate("fr", "settings.languageSaved", { language: "$& Français" }))
      .toBe("Langue définie sur $& Français");
  });

  it("interpolates dynamic page, shop, journey, and gameplay copy", () => {
    expect(translate("zh-CN", "shop.purchaseSuccess", {
      item: "火箭",
      stock: 3,
      max: 9,
    })).toBe("已补充火箭 · 库存 3/9");
    expect(translate("ja", "journey.levelRange", { start: 11, end: 20 }))
      .toBe("レベル 11-20");
    expect(translate("es", "update.date", { date: "2026-09-17" }))
      .toBe("Actualizado el 2026-09-17");
    expect(translate("de", "gameplay.booster.unlockAtLevel", {
      item: "Rakete",
      level: 7,
    })).toBe("Rakete auf Lv. 7 freischalten");
    expect(translate("ru", "journey.episodeTitle", { title: "Golden Bridge" }))
      .toBe("Эпизод: Golden Bridge");
    expect(translate("zh-CN", "settlement.criteria.moves", { target: 12 }))
      .toBe("12次拖动内完成");
    expect(translate("zh-CN", "settlement.criteria.time", { target: 45 }))
      .toBe("45秒内完成");
  });

  it("leaves missing placeholders visible so incomplete call sites are testable", () => {
    const key: TranslationKey = "timeout.blocksRemaining";
    expect(translate("en", key)).toBe("Blocks remaining: {count}");
  });
});
