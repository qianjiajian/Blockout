import { describe, expect, it } from "vitest";
import { advanceLeague, claimLeague, createLeague, parseLeague, LEAGUE_PERIOD_MS, type LeagueState } from "../src/core/league";
import { RANKING_PLAYER_NAMES } from "../src/core/playerNames";
import { leagueRows } from "../src/game/leagueUi";

const NOW = Date.parse("2026-10-07T10:00:00+08:00");
const oldNames = ["竹影拾光290", "竹影寻路298", "远帆乐园909", "晴空拾光216", "小满2"];
function legacySeason(seed = 12345): LeagueState {
  const state = createLeague(NOW, seed, 0);
  state.season.bots.forEach((bot, i) => { bot.name = oldNames[i % oldNames.length]; });
  return parseLeague(JSON.parse(JSON.stringify(state)))!;
}

function expectCurrentNames(state: LeagueState): void {
  const names = leagueRows(state).filter(row => !row.player).map(row => row.name);
  expect(names).toHaveLength(49);
  expect(new Set(names).size).toBe(49);
  expect(names.every(name => RANKING_PLAYER_NAMES.includes(name as typeof RANKING_PLAYER_NAMES[number]))).toBe(true);
  expect(names.every(name => /^[\u3400-\u9fff]{2,5}$/.test(name))).toBe(true);
  expect(new Set(names.map(name => name.length))).toEqual(new Set([2, 3, 4, 5]));
}

describe("league names on restored seasons", () => {
  it.each([0, 1, 12345, 0x7fffffff])("displays new names over legacy saved names without rewriting seed %i", seed => {
    const state = legacySeason(seed);
    const before = JSON.stringify(state);
    expectCurrentNames(state);
    const rows = leagueRows(state);
    const fresh = createLeague(NOW, seed, 0);
    expect(rows).toEqual(leagueRows(fresh));
    expect(rows.filter(row => !row.player).every(row => row.name === fresh.season.bots.find(bot => bot.id === row.id)!.name)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    expect(leagueRows(parseLeague(JSON.parse(before))!)).toEqual(rows);
  });

  it("keeps names attached to opponents when scores change their ranks", () => {
    const state = legacySeason();
    const before = leagueRows(state);
    const namesById = new Map(before.map(row => [row.id, row.name]));
    const last = before.at(-1)!;
    state.season.bots.find(bot => bot.id === last.id)!.score = 10000;
    const after = leagueRows(state);
    expect(after[0].id).toBe(last.id);
    expect(after.every(row => row.name === namesById.get(row.id))).toBe(true);
  });

  it("preserves pending settlement and uses the current pool after claiming a new season", () => {
    const ended = advanceLeague(legacySeason(), NOW + LEAGUE_PERIOD_MS);
    const before = JSON.stringify(ended);
    expectCurrentNames(ended);
    expect(JSON.stringify(ended)).toBe(before);
    const next = claimLeague({ coins: 100, league: ended }, ended.lastNowMs);
    expectCurrentNames(next.league);
    expect(next.coins).toBe(100 + ended.pending!.coins);
    expect(next.league.season.index).toBe(ended.season.index + 1);
  });
});
