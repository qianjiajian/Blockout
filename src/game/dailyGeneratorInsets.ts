import type { GameplayBoardVisualInsets } from "./gameplayArtLayout";
import { GENERATOR_RIM_METRICS, type GeneratorRimGeometry } from "./generatorRimGeometry";

/** The authored chassis is drawn at its native aspect ratio. Its painted
 * depth can exceed the logical one-cell generator rail reservation. */
export function includeDailyGeneratorSpriteInsets(
  insets: GameplayBoardVisualInsets,
  geometry: GeneratorRimGeometry,
  columns: number,
  rows: number,
  sourceWidth: number,
  sourceHeight: number,
): void {
  if (!(sourceWidth > 0 && sourceHeight > 0)) return;
  const { x, y, quarterTurns } = geometry.anchor;
  const span = GENERATOR_RIM_METRICS.span;
  const vertical = quarterTurns === 1 || quarterTurns === 3;
  const depth = span * (vertical ? sourceWidth / sourceHeight : sourceHeight / sourceWidth);
  const left = vertical ? quarterTurns === 3 ? x - depth : x : x - span / 2;
  const right = vertical ? quarterTurns === 1 ? x + depth : x : x + span / 2;
  const top = vertical ? y - span / 2 : quarterTurns === 0 ? y - depth : y;
  const bottom = vertical ? y + span / 2 : quarterTurns === 2 ? y + depth : y;
  insets.left = Math.max(insets.left, -left);
  insets.right = Math.max(insets.right, right - columns);
  insets.top = Math.max(insets.top, -top);
  insets.bottom = Math.max(insets.bottom, bottom - rows);
}
