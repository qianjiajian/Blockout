import { describe, expect, it, vi } from "vitest";
import { advanceLeague, beijingMidnight, claimLeague, collectLeagueSpecial, createLeague, finishLeagueAttempt, leaguePromotion, leagueRank, leagueReward, leagueWindow, parseLeague, startLeagueAttempt, LEAGUE_DAY_MS, LEAGUE_PERIOD_MS } from "../src/core/league";
import { LeagueAccountTransaction, reconcileLeagueAccount } from "../src/core/leagueAccount";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LEVELS } from "../src/core/levels";
const NOW = Date.parse("2026-10-01T10:00:00+08:00");
const fresh = () => createLeague(NOW, 12345, 0);
function clear(state = fresh(), level = 1, now = NOW + 1000, count = 8) {
  let attempt = startLeagueAttempt(state, level, now - 1000);
  for (let i = 0; i < count; i++) attempt = collectLeagueSpecial(attempt, `block${i}`);
  return { attempt, result: finishLeagueAttempt(state, attempt, true, now) };
}
describe("league rules and account safety", () => {
  it("creates unique names with varied 2-to-5-character lengths", () => {
    const names = fresh().season.bots.map((bot) => bot.name);
    const chineseLength = (name: string) => (name.match(/[\u3400-\u9fff]/g) ?? []).length;
    expect(new Set(names).size).toBe(49);
    expect(names.every((name) => chineseLength(name) >= 2 && chineseLength(name) <= 5)).toBe(true);
    expect(new Set(names.map(chineseLength))).toEqual(new Set([2, 3, 4, 5]));
  });

  it("uses Beijing dates and 15-day windows including exact midnight", () => {
    const state = fresh();
    expect(beijingMidnight(NOW)).toBe(Date.parse("2026-10-01T00:00:00+08:00"));
    expect(state.season.endMs).toBe(Date.parse("2026-10-16T00:00:00+08:00"));
    expect(leagueWindow(state.anchorMs, state.season.endMs).index).toBe(1);
    expect(leagueWindow(state.anchorMs, state.season.endMs + LEAGUE_PERIOD_MS * 3).index).toBe(4);
  });
  it("unlocks only when eligible and keeps the original anchor", () => {
    const old = { coins: 123, highestLevel: 20 };
    expect(reconcileLeagueAccount(old, false, NOW, 1)).toBe(old);
    const unlocked = reconcileLeagueAccount(old, true, NOW, 1);
    expect(unlocked.league!.season.tier).toBe(0);
    expect(reconcileLeagueAccount(unlocked, true, NOW + LEAGUE_DAY_MS, 2).league!.seed).toBe(1);
    expect(unlocked.coins).toBe(123);
  });
  it("has 49 stable bots and places the player first on ties", () => {
    const s = fresh(); expect(s.season.bots).toHaveLength(49);
    s.season.bots.forEach(b => b.score = 0); expect(leagueRank(s.season)).toBe(1);
    s.season.bots.slice(0, 10).forEach(b => b.score = 10); expect(leagueRank(s.season)).toBe(11);
    expect(advanceLeague(s, NOW).season.bots).toEqual(s.season.bots);
  });
  it("credits only success, deduplicates special ids, disallows cleared levels", () => {
    const {attempt, result} = clear(); expect(result.points).toBe(80);
    expect(collectLeagueSpecial(attempt, "block0").specialIds).toHaveLength(8);
    expect(finishLeagueAttempt(fresh(), attempt, false, NOW + 1000).state.season.score).toBe(0);
    expect(finishLeagueAttempt(result.state, attempt, true, NOW + 2000).status).toBe("duplicate");
    expect(() => startLeagueAttempt(result.state, 1, NOW + 2000)).toThrow();
    expect(() => startLeagueAttempt(fresh(), 101, NOW)).toThrow();
  });
  it("does not credit cross-season success to either board", () => {
    const s = fresh(), a = collectLeagueSpecial(startLeagueAttempt(s, 1, NOW), "a");
    const ended = finishLeagueAttempt(s, a, true, s.season.endMs);
    expect(ended.status).toBe("expired"); expect(ended.state.pending!.score).toBe(0);
    const next = claimLeague({coins: 1, league: ended.state}, s.season.endMs).league!;
    expect(finishLeagueAttempt(next, a, true, s.season.endMs + 1000).state.season.score).toBe(0);
  });
  it.each([1,10,11,40,41,50])("applies tier boundaries for rank %i", rank => {
    expect(leaguePromotion(0,0,rank).tier).toBe(rank <= 10 ? 1 : 0);
    expect(leaguePromotion(6,0,rank).tier).toBe(rank <= 10 ? 7 : rank >= 41 ? 5 : 6);
    expect(leaguePromotion(7,1,rank)).toEqual({tier:7,stars:rank===1?6:rank<=3?1+(rank===2?3:2):rank<=10?2:rank>=41?0:1});
    expect(leaguePromotion(7,0,rank).tier).toBe(rank>=41?6:7);
  });
  it("uses the full adopted reward table and pays nothing at zero", () => {
    const rows = [[300,240,200,150,80,40],[400,320,270,200,110,50],[550,440,360,270,150,70],[700,560,460,350,190,90],[900,720,600,450,250,120],[1150,920,760,570,320,150],[1450,1160,960,720,400,190],[1800,1440,1200,900,500,240]];
    rows.forEach((row,tier) => [1,2,3,10,40,50].forEach((rank,i) => {
      expect(leagueReward(tier as 0,rank,10)).toBe(row[i]); expect(leagueReward(tier as 0,rank,0)).toBe(0);
    }));
  });
  it("freezes settlement, skips unjoined periods and claims just once", () => {
    const s = clear().result.state;
    const ended = advanceLeague(s,s.season.endMs);
    expect(advanceLeague(ended,s.season.endMs+LEAGUE_PERIOD_MS*3)).toEqual(ended);
    const account = {coins:123, league:ended, mainProgress:[1,2,3]};
    const now = s.season.endMs+LEAGUE_PERIOD_MS*3;
    const claimed = claimLeague(account,now);
    expect(claimed.coins).toBe(123+ended.pending!.coins);
    expect(claimed.league.season.index).toBe(4); expect(claimed.league.season.score).toBe(0);
    expect(claimLeague(claimed,now)).toEqual(claimed); expect(account.coins).toBe(123);
    expect(claimed.mainProgress).toEqual(account.mainProgress);
    expect(claimed.league.season.bots.map(b=>b.name)).not.toEqual(s.season.bots.map(b=>b.name));
  });
  it("simulation is independent of refresh frequency and only grows", () => {
    const s = clear().result.state, end = s.season.endMs;
    let frequent = s;
    for(let t = NOW+3_600_000;t<end;t+=3_600_000) frequent=advanceLeague(frequent,t);
    expect(advanceLeague(frequent,end)).toEqual(advanceLeague(s,end));
    const later=advanceLeague(s,NOW+LEAGUE_DAY_MS);
    expect(later.season.bots.every((b,i)=>b.score>=s.season.bots[i].score)).toBe(true);
    expect(advanceLeague(later,NOW)).toEqual(later);
  });
  it("unknown writes retry the same candidate without recomputing rewards", () => {
    let account = {coins:20, league:advanceLeague(clear().result.state,fresh().season.endMs)};
    const writes: unknown[]=[]; let outcome: "unknown"|"committed"="unknown";
    const tx=new LeagueAccountTransaction(()=>account,(c)=>{writes.push(c);return outcome;},c=>account=c);
    tx.claim(fresh().season.endMs); expect(tx.pending).toBe(true); expect(account.coins).toBe(20);
    outcome="committed"; tx.claim(fresh().season.endMs+1000);
    expect(writes[0]).toBe(writes[1]); expect(tx.pending).toBe(false);
    const coins=account.coins; tx.claim(fresh().season.endMs+2000); expect(account.coins).toBe(coins);
  });
  it("validates restored data and rejects forged settlement rewards", () => {
    const s = advanceLeague(clear().result.state,fresh().season.endMs);
    expect(parseLeague(JSON.parse(JSON.stringify(s)))).toEqual(s);
    s.pending!.coins++; expect(()=>parseLeague(s)).toThrow();
    expect(parseLeague(undefined)).toBeUndefined();
  });
  it("the real save sanitizer preserves league data without resetting campaign", () => {
    const game = Object.create(ColorEscapeGame.prototype) as any;
    const defaults = game.sanitizeSave(undefined);
    const save = game.sanitizeSave({...defaults,highestLevel:21,currentLevel:21,coins:1234,rewardedLevels:Array.from({length:20},(_,i)=>i+1)});
    expect(save.league.season.tier).toBe(0); expect(save.coins).toBe(1234);
    const cloned = game.cloneSave(save); cloned.league.season.bots[0].score++;
    expect(cloned.league.season.bots[0].score).not.toBe(save.league.season.bots[0].score);
    expect(game.sanitizeSave(save).league.season).toEqual(save.league.season);
  });
  it("actual twentieth-level settlement unlocks in the candidate, not before save commit", () => {
    const game=Object.create(ColorEscapeGame.prototype) as any;
    const defaults=game.sanitizeSave(undefined);
    game.save=game.sanitizeSave({...defaults,highestLevel:20,currentLevel:20,rewardedLevels:Array.from({length:19},(_,i)=>i+1)});
    game.model={level:LEVELS[19],snapshot:()=>({moves:1,remainingSeconds:30})};
    game.completionMetrics={moves:1,elapsedSeconds:1};
    expect(game.save.league).toBeUndefined();
    const pending=game.createPendingSettlement();
    expect(pending.candidateSave.league.season.tier).toBe(0);
    expect(pending.candidateSave.coins).toBe(game.save.coins+40);
    expect(game.save.league).toBeUndefined();
  });
  it("supports all 100 independent clears and sustained progress against opponents", () => {
    let s=fresh(); const initialRank=leagueRank(s.season);
    for(let level=1;level<=100;level++) {
      const now=NOW+level*60*60_000;
      s=clear(advanceLeague(s,now-1000),level,now).result.state;
    }
    expect(s.season.cleared).toHaveLength(100); expect(s.season.score).toBe(8000);
    expect(leagueRank(s.season)).toBeLessThan(initialRank);
    expect(parseLeague(s)).toEqual(s);
  });
  it("real game claim reconciles a lost acknowledgement and preserves campaign fields", () => {
    const game=Object.create(ColorEscapeGame.prototype) as any;
    game.playSound=vi.fn();
    const defaults=game.sanitizeSave(undefined);
    const now=fresh().season.endMs;
    game.save={...defaults,highestLevel:21,coins:500,league:advanceLeague(clear().result.state,now)};
    const baseline=JSON.parse(JSON.stringify(game.save));
    let durable=baseline;
    game.storageBaselineReady=true; game.storageReadAttempts=0;
    game.host={storageSet: (_key: string,value: any)=>{durable=JSON.parse(JSON.stringify(value));return false;},storageRead:()=>({status:"ok",value:durable})};
    const reward=game.save.league.pending.coins;
    expect(game.claimLeagueReward(now)).toBe("committed");
    expect(game.save.coins).toBe(500+reward);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.save.highestLevel).toBe(baseline.highestLevel);
    expect(game.claimLeagueReward(now)).toBe("committed");
    expect(game.save.coins).toBe(500+reward);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });
});
