import { BOOSTER_PURCHASE_ART } from "./artManifest";

/** Supplied independent PNG slices, loaded only while the purchase popup is open. */
export const BOOSTER_PURCHASE_ART_PATH = BOOSTER_PURCHASE_ART.panel;
export const BOOSTER_PURCHASE_ART_URLS = BOOSTER_PURCHASE_ART;
export type BoosterPurchaseArt = { [Key in keyof typeof BOOSTER_PURCHASE_ART]: HTMLImageElement };

export const BOOSTER_PURCHASE_RAW_SIZE = { width: 594, height: 889 } as const;
