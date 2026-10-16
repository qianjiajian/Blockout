import { describe, expect, it, vi } from "vitest";
import { createLeague, advanceLeague, leagueRank } from "../src/core/league";
import { leagueCountdown, gloryTitle, leagueRows } from "../src/game/leagueUi";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LeagueScroll } from "../src/game/leagueScroll";
const now=Date.now();
function gameFixture(){
  const g=Object.create(ColorEscapeGame.prototype) as any;
  g.save={...g.sanitizeSave(undefined),league:createLeague(now,123,0)};
  g.leagueScroll=new LeagueScroll();g.leagueArtStore={art:{},dispose:vi.fn()};g.leagueChallengeNotice=false;g.leagueTier=0;g.leagueInfo=false;g.leagueAction="open";
  g.leagueSettlementArtStore={art:{},request:vi.fn(),dispose:vi.fn()};
  g.screen="league";g.storageBaselineReady=true;g.artReady=true;
  g.interactionHit=(p:any,r:any)=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;
  g.playSound=vi.fn();g.scheduleFrame=vi.fn();g.releaseFormalPageArt=vi.fn();g.requestFormalPageArt=vi.fn();
  return g;
}
function press(g:any,key:string){const r=g.leagueTargets().find(([k]:[string])=>k===key)?.[1];expect(r).toBeTruthy();g.handleLeaguePointer({x:r.x+r.width/2,y:r.y+r.height/2,id:1});}
describe("league presentation and navigation",()=>{
  it("formats countdown and the five glory titles",()=>{
    expect(leagueCountdown(now+86400000+3600000+61000,now)).toBe("1天 01:01:01");
    expect(leagueCountdown(now-1,now)).toBe("0天 00:00:00");
    expect([0,10,30,50,100].map(gloryTitle)).toEqual(["荣耀","荣耀·崇高","荣耀·至尊","荣耀·永恒","荣耀·传奇"]);
  });
  it("renders a consistent 50-person ranking with player ties first",()=>{
    const s=createLeague(now,123,0);s.season.score=80;
    const rows=leagueRows(s);expect(rows).toHaveLength(50);expect(rows.find(r=>r.player)!.rank).toBe(leagueRank(s.season));
    expect(rows.filter(r=>r.score===80)[0].player).toBe(true);
  });
  it("uses scrolling, previews tiers and keeps modal clicks isolated",()=>{
    const g=gameFixture();expect(g.leagueTargets().some(([k]:[string])=>k==="league.previous")).toBe(false);
    expect(g.leagueTargets().some(([k]:[string])=>k==="league.next")).toBe(false);
    for(let i=0;i<7;i++)press(g,"league.tierNext");expect(g.leagueTier).toBe(7);
    press(g,"league.info");expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(["league.dismiss"]);
    press(g,"league.dismiss");press(g,"league.challenge");expect(g.leagueChallengeNotice).toBe(true);
    expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(["league.start","league.dismiss"]);
    press(g,"league.dismiss");press(g,"league.self");expect(g.leagueScroll.offset).toBeGreaterThanOrEqual(0);
    press(g,"league.back");expect(g.screen).toBe("home");
  });
  it("gates pending settlement and prevents leaving an unknown save",()=>{
    const g=gameFixture();g.save.league=advanceLeague(g.save.league,g.save.league.season.endMs);
    expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(["league.back","league.claim"]);
    g.claimLeagueReward=vi.fn(()=>"unknown");press(g,"league.claim");
    expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(["league.retry"]);
    g.claimLeagueReward.mockReturnValue("committed");press(g,"league.retry");expect(g.claimLeagueReward).toHaveBeenCalledTimes(2);
    expect(g.leaguePersistence).toBeUndefined();
  });
});
