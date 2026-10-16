import {describe,it,expect,vi} from "vitest";
import {ColorEscapeGame} from "../src/game/ColorEscapeGame";
import {LeagueRun} from "../src/core/leagueRun";
import {createLeague} from "../src/core/league";
import type {LevelSpec} from "../src/core/types";
const now=Date.now();
const eventLevel:LevelSpec={id:900002,name:"event fixture",difficulty:"easy",timeSeconds:180,reward:0,width:2,height:2,gates:[{id:"r",color:"red",side:"top",offset:0,size:1}],blocks:[{id:"special",color:"red",x:0,y:0,shape:[[0,0]]}]};
function fixture(past=false){
 const g=Object.create(ColorEscapeGame.prototype) as any;
 g.save={language:"zh-CN",coins:1234,currentLevel:6,highestLevel:6,rewardedLevels:[1,2,3,4,5],bestStars:{},bestMoves:{},lifeState:{lives:5},league:createLeague(past?now-16*86400000:now,123,0)};
 g.leagueRun=new LeagueRun(g.save.league,1,eventLevel,["special"],g.save.league.season.joinedMs);
 g.model=g.leagueRun.model;g.leagueRun.recordRemoval(g.model.removeBlockWithBooster("special"),now+1);
 g.persistVerified=vi.fn(()=>"committed");g.scheduleFrame=vi.fn();g.playSound=vi.fn();g.openLeague=vi.fn();
 return g;
}
describe("real league result/account integration",()=>{
 it("retries the identical unknown candidate and fixed success timestamp",()=>{
  const g=fixture(),before=structuredClone(g.save);g.persistVerified.mockReturnValueOnce("unknown").mockReturnValue("committed");
  g.finishLeaguePrototype();expect(g.screen).toBe("leagueResult");expect(g.save).toEqual(before);
  expect(g.leagueTargets().map(([key]:[string])=>key)).toEqual(["league.resultRetry"]);
  g.returnFromLeaguePrototype();expect(g.openLeague).not.toHaveBeenCalled();
  const candidate=g.leagueTransaction.pendingCandidate;g.loadLevel(1,true);expect(g.model).toBe(g.leagueRun.model);
  g.finishLeaguePrototype();expect(g.persistVerified.mock.calls[1][0]).toBe(candidate);
  expect(g.save.league.season.score).toBe(10);expect(g.save.league.season.cleared).toEqual([1]);
  expect(g.save.coins).toBe(1234);expect(g.save.currentLevel).toBe(6);expect(g.save.bestStars).toEqual({});expect(g.save.lifeState).toEqual(before.lifeState);
  g.finishLeaguePrototype();expect(g.save.league.season.score).toBe(10);
 });
 it("keeps a cross-period result out of both boards",()=>{
  const g=fixture(true);g.finishLeaguePrototype();expect(g.leagueRunResult.status).toBe("expired");
  expect(g.leagueRunResult.points).toBe(0);expect(g.save.league.season.score).toBe(0);expect(g.save.league.season.cleared).toEqual([]);expect(g.save.league.pending).toBeTruthy();
 });
 it("offers retry or abandonment after a confirmed rejected write",()=>{
  const g=fixture();g.persistVerified.mockReturnValue("rejected");g.finishLeaguePrototype();
  expect(g.leagueTargets().map(([key]:[string])=>key)).toEqual(["league.resultRetry","league.resultBack"]);
  expect(g.save.league.season.score).toBe(0);expect(g.leagueTransaction.pending).toBe(false);
 });
 it("continues from the result page directly into the next league level",()=>{
  const g=fixture();g.finishLeaguePrototype();
  g.returnFromLeaguePrototype=vi.fn(()=>{g.screen="league";g.leagueRunResult=undefined;g.save.league.pending=false;});
  g.startLeaguePrototype=vi.fn();
  g.continueLeaguePrototype();
  expect(g.returnFromLeaguePrototype).toHaveBeenCalledOnce();
  expect(g.startLeaguePrototype).toHaveBeenCalledOnce();
 });
});
