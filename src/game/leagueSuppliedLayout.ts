/** The supplied 720 × 1584 reference, uniformly fitted to the league canvas. */
export const LEAGUE_ART_SCALE = 496 / 720;
export const LEAGUE_ART_OFFSET_Y = (1078 - 1584 * LEAGUE_ART_SCALE) / 2;
export const leagueArtRect = (x: number, y: number, width: number, height: number) => ({
  x: x * LEAGUE_ART_SCALE, y: y * LEAGUE_ART_SCALE + LEAGUE_ART_OFFSET_Y,
  width: width * LEAGUE_ART_SCALE, height: height * LEAGUE_ART_SCALE,
});
export const LEAGUE_SUPPLIED_LAYOUT = {
  stage: leagueArtRect(0, 30, 720, 835),
  header: leagueArtRect(0, 0, 720, 201),
  title: leagueArtRect(236, 86, 235, 71),
  timer: leagueArtRect(153, 168, 415, 89),
  list: leagueArtRect(0, 628, 720, 956),
  footer: leagueArtRect(0, 1460, 720, 124),
  // Keep the existing carousel/title separation, per the later user instruction.
  tierName: leagueArtRect(196, 574, 322, 47),
  detail: leagueArtRect(63, 347, 594, 806),
  detailClose: leagueArtRect(566, 390, 94, 98),
} as const;
