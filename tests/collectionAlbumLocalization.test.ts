import { describe, expect, it } from "vitest";
import { GAME_LANGUAGES } from "../src/game/localization";
import {
  COLLECTION_ALBUM_TEXT_KEYS,
  COLLECTION_ALBUM_TRANSLATIONS,
  collectionAlbumDictionary,
  collectionAlbumText,
} from "../src/game/collectionAlbumLocalization";

const placeholders = (text: string): string[] => [...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
  .map((match) => match[1])
  .sort();

describe("independent Collection album localization", () => {
  it("ships a complete, non-empty dictionary for all ten game languages", () => {
    const expectedKeys = [...COLLECTION_ALBUM_TEXT_KEYS].sort();
    expect(Object.keys(COLLECTION_ALBUM_TRANSLATIONS).sort()).toEqual([...GAME_LANGUAGES].sort());
    for (const language of GAME_LANGUAGES) {
      const dictionary = COLLECTION_ALBUM_TRANSLATIONS[language];
      expect(Object.keys(dictionary).sort(), language).toEqual(expectedKeys);
      for (const key of COLLECTION_ALBUM_TEXT_KEYS) {
        expect(dictionary[key].trim(), `${language}:${key}`).not.toBe("");
        expect(placeholders(dictionary[key]), `${language}:${key}`).toEqual(
          placeholders(COLLECTION_ALBUM_TRANSLATIONS.en[key]),
        );
      }
    }
  });

  it("uses natural Simplified Chinese labels for the independent album", () => {
    expect(COLLECTION_ALBUM_TRANSLATIONS["zh-CN"]).toMatchObject({
      entry: "收藏",
      title: "收藏",
      levelCollection: "关卡收藏",
      masterpieceCollection: "名画收藏",
      gameplayGuide: "玩法图鉴",
      unlockAfterLevel: "通关第 {level} 关解锁",
      cardUnlockAfterLevel: "通关{level}解锁",
      needsRestoration: "待修复",
      currentLevelCollection: "本关收藏",
      originalMasterpiece: "原创名画",
      replayLevel: "重玩关卡",
    });
  });

  it("interpolates every supported album value", () => {
    expect(collectionAlbumText("zh-CN", "collectionProgress", { owned: 4, total: 1201 }))
      .toBe("收藏进度：4/1201");
    expect(collectionAlbumText("zh-CN", "unlockAfterLevel", { level: 18 }))
      .toBe("通关第 18 关解锁");
    expect(collectionAlbumText("en", "restorationCost", { cost: 25 }))
      .toBe("Restore for 25 Inspiration");
    expect(collectionAlbumText("en", "insufficientInspiration", { shortfall: 7 }))
      .toBe("Not enough Inspiration · Need 7 more");
  });

  it.each(GAME_LANGUAGES)("formats the supplied current inspiration balance without accumulating or truncating it in %s", language => {
    const expected = {
      "zh-CN": "灵感：{amount}",
      "zh-TW": "靈感：{amount}",
      en: "Inspiration: {amount}",
      ja: "ひらめき：{amount}",
      ko: "영감: {amount}",
      es: "Inspiración: {amount}",
      pt: "Inspiração: {amount}",
      fr: "Inspiration : {amount}",
      de: "Inspiration: {amount}",
      ru: "Вдохновение: {amount}",
    } as const;
    const template = expected[language];
    expect(COLLECTION_ALBUM_TRANSLATIONS[language].inspirationBalance).toBe(template);
    expect(placeholders(template)).toEqual(["amount"]);
    // Each call is a fresh balance, including decreases and zero after spending.
    for (const amount of [0, 1000, 975, Number.MAX_SAFE_INTEGER, 0]) {
      const text = collectionAlbumText(language, "inspirationBalance", { amount });
      expect(text).toBe(template.replace("{amount}", String(amount)));
      expect(text).not.toMatch(/[{}]/);
      expect(text.match(/\d+/g)).toEqual([String(amount)]);
    }
    expect(collectionAlbumText(language, "inspirationBalance")).toBe(template);
    expect(collectionAlbumText(language, "inspiration"))
      .toBe(template.split(/[:：]/)[0].trim());
  });

  it("uses compact card unlock labels in all ten languages without changing detail labels", () => {
    const expected = {
      "zh-CN": ["通关{level}解锁", "通关第 {level} 关解锁"],
      "zh-TW": ["通關{level}解鎖", "通關第 {level} 關解鎖"],
      en: ["Clear Lv {level}", "Clear Lv {level} to unlock"],
      ja: ["Lv{level}クリアで解放", "Lv {level} クリアで解放"],
      ko: ["Lv{level} 클리어로 해제", "Lv {level} 클리어 시 잠금 해제"],
      es: ["Completa Nv. {level}", "Completa Nv. {level} para desbloquear"],
      pt: ["Conclua Nv. {level}", "Conclua Nv. {level} para desbloquear"],
      fr: ["Terminez le niv. {level}", "Terminez le niv. {level} pour déverrouiller"],
      de: ["Lv. {level} abschließen", "Schließe Lv. {level} zum Freischalten ab"],
      ru: ["Пройдите ур. {level}", "Пройдите ур. {level}, чтобы открыть"],
    } as const;
    expect(Object.keys(expected).sort()).toEqual([...GAME_LANGUAGES].sort());
    for (const language of GAME_LANGUAGES) {
      const [card, detail] = expected[language];
      expect(COLLECTION_ALBUM_TRANSLATIONS[language].cardUnlockAfterLevel, language).toBe(card);
      expect(COLLECTION_ALBUM_TRANSLATIONS[language].unlockAfterLevel, language).toBe(detail);
      expect(card.length, language).toBeLessThan(detail.length);
      for (const level of [25, 200]) {
        const cardText = collectionAlbumText(language, "cardUnlockAfterLevel", { level });
        expect(cardText, language).toBe(card.replace("{level}", String(level)));
        expect(cardText, language).not.toMatch(/[{}]/);
        expect(collectionAlbumText(language, "unlockAfterLevel", { level }), language)
          .toBe(detail.replace("{level}", String(level)));
      }
    }
  });

  it("falls back to English for unknown or missing language tags", () => {
    expect(collectionAlbumDictionary("it")).toBe(COLLECTION_ALBUM_TRANSLATIONS.en);
    expect(collectionAlbumDictionary(undefined)).toBe(COLLECTION_ALBUM_TRANSLATIONS.en);
    expect(collectionAlbumText("it", "close")).toBe("Close");
    expect(collectionAlbumText("it", "cardUnlockAfterLevel", { level: 25 }))
      .toBe("Clear Lv 25");
    expect(collectionAlbumText("it", "inspirationBalance", { amount: 0 }))
      .toBe("Inspiration: 0");
    expect(collectionAlbumText(null, "saveFailed"))
      .toBe("Could not save the collection. Please try again.");
  });

  it("keeps omitted interpolation markers visible for QA", () => {
    expect(collectionAlbumText("en", "collectionProgress", { owned: 3 }))
      .toBe("Collected 3/{total}");
  });
});
