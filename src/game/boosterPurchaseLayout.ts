/** Supplied 720×1584 composition projected into the game's 496×1078 coordinates. */
export const BOOSTER_PURCHASE_ARTBOARD = { width: 496, height: 1078 } as const;
const scale = BOOSTER_PURCHASE_ARTBOARD.width / 720;
const offsetY = (BOOSTER_PURCHASE_ARTBOARD.height - 1584 * scale) / 2;
const rect = (x: number, y: number, width: number, height: number) =>
  ({ x: x * scale, y: y * scale + offsetY, width: width * scale, height: height * scale });
const text = (x: number, y: number, size: number, maxWidth: number) =>
  ({ x: x * scale, y: y * scale + offsetY, size: size * scale, maxWidth: maxWidth * scale });

export const BOOSTER_PURCHASE_LAYOUT = {
  panel: rect(63, 311, 594, 889),
  title: rect(179, 311, 362, 142),
  close: rect(574, 342, 94, 98),
  content: rect(123, 502, 474, 444),
  buy: rect(380, 1017, 225, 84),
  ad: rect(116, 1017, 225, 84),
  titleText: text(360, 378, 60, 330),
  icon: rect(244, 578, 216, 215),
  quantityText: text(422, 775, 54, 100),
  description: rect(136, 850, 448, 91),
  descriptionText: { ...text(360, 884, 33, 445), lineHeight: 38 * scale },
  adIcon: rect(140, 1033, 61, 52),
  adLabel: text(247, 1060, 31, 88),
  adReward: text(197, 1077, 23, 45),
  buyText: text(436, 1060, 31, 66),
  coinIcon: rect(473, 1041, 37, 38),
  priceText: text(546, 1060, 31, 75),
  feedbackText: text(360, 978, 23, 480),
} as const;
