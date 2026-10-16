import {describe,it,expect,vi} from 'vitest';
import {ColorEscapeGame} from '../src/game/ColorEscapeGame';
import {LeagueScroll} from '../src/game/leagueScroll';
import {createLeague,advanceLeague,claimLeague} from '../src/core/league';
const now=Date.now();
function fixture(unlocked=true){
 const g=Object.create(ColorEscapeGame.prototype) as any;
 g.save=g.sanitizeSave({schemaVersion:1,highestLevel:unlocked?21:20,currentLevel:unlocked?21:20,rewardedLevels:Array.from({length:unlocked?20:19},(_,i)=>i+1),coins:1234});
 if(unlocked)g.save.league=createLeague(now,123,0);
 g.leagueScroll=new LeagueScroll();g.leagueArtStore={art:{},dispose:vi.fn()};g.screen='home';
 g.leagueSettlementArtStore={art:{},request:vi.fn(),dispose:vi.fn()};
 g.refreshLeague=vi.fn(()=>'committed');g.requestLeagueArt=vi.fn();g.requestFormalPageArt=vi.fn();g.releaseFormalPageArt=vi.fn();g.scheduleFrame=vi.fn();g.playSound=vi.fn();g.persistVerified=vi.fn(()=>'committed');
 g.interactionHit=(p:any,r:any)=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;
 return g;
}
function click(g:any,key:string){const r=g.leagueTargets().find(([k]:[string])=>k===key)?.[1];expect(r).toBeTruthy();g.handleLeaguePointer({x:r.x+r.width/2,y:r.y+r.height/2,id:1});}
describe('first league entry explanation',()=>{
 it('shows both pages and acknowledges only after the second, preserving account state',()=>{
  const g=fixture(),before=structuredClone(g.save);g.openLeague();
  expect(g.leagueIntroPage).toBe(0);expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(['league.introContinue']);
  click(g,'league.introContinue');expect(g.leagueIntroPage).toBe(1);expect(g.save.leagueIntroSeen).toBe(false);expect(g.persistVerified).not.toHaveBeenCalled();
  click(g,'league.introContinue');expect(g.leagueIntroPage).toBeUndefined();expect(g.save.leagueIntroSeen).toBe(true);
  expect({...g.save,leagueIntroSeen:false}).toEqual(before);expect(g.persistVerified).toHaveBeenCalledTimes(1);
  g.openLeague();expect(g.leagueIntroPage).toBeUndefined();
  const loaded=g.sanitizeSave(g.cloneSave(g.save));expect(loaded.leagueIntroSeen).toBe(true);
 });
 it('keeps the same unknown acknowledgment candidate and blocks all other actions',()=>{
  const g=fixture();g.openLeague();click(g,'league.introContinue');g.persistVerified.mockReturnValueOnce('unknown').mockReturnValue('committed');
  click(g,'league.introContinue');expect(g.save.leagueIntroSeen).toBe(false);expect(g.leagueIntroPage).toBe(1);
  expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(['league.retry']);const candidate=g.leagueTransaction.pendingCandidate;
  click(g,'league.retry');expect(g.persistVerified.mock.calls[1][0]).toBe(candidate);expect(g.save.leagueIntroSeen).toBe(true);expect(g.leagueIntroPage).toBeUndefined();
 });
 it('does not consume acknowledgment on rejection, locked entry or art failure',()=>{
  const locked=fixture(false);locked.openLeague();expect(locked.leagueIntroPage).toBeUndefined();expect(locked.save.leagueIntroSeen).toBe(false);
  const g=fixture();g.leagueArtStore.art=undefined;g.leagueArtStore.error=true;g.openLeague();expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(['league.back','league.artRetry']);expect(g.save.leagueIntroSeen).toBe(false);
  g.leagueArtStore.art={};click(g,'league.introContinue');g.persistVerified.mockReturnValueOnce('rejected');click(g,'league.introContinue');
  expect(g.save.leagueIntroSeen).toBe(false);expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(['league.retry']);click(g,'league.retry');expect(g.save.leagueIntroSeen).toBe(true);
 });
 it('finishes the explanation before a frozen settlement and retains it across a new season',()=>{
  const g=fixture();g.save.league=advanceLeague(g.save.league,g.save.league.season.endMs);g.openLeague();expect(g.leagueIntroPage).toBe(0);
  click(g,'league.introContinue');click(g,'league.introContinue');expect(g.save.league.pending).toBeTruthy();expect(g.save.coins).toBe(1234);
  expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(['league.back','league.claim']);
  g.save=claimLeague(g.save,g.save.league.lastNowMs);g.openLeague();expect(g.leagueIntroPage).toBeUndefined();expect(g.save.leagueIntroSeen).toBe(true);
 });
 it('restores first-entry explanation after an initially unknown open is confirmed',()=>{
  const g=fixture();g.refreshLeague.mockReturnValueOnce('unknown');g.openLeague();expect(g.leagueIntroPage).toBeUndefined();
  expect(g.leagueTargets().map(([k]:[string])=>k)).toEqual(['league.retry']);click(g,'league.retry');expect(g.leagueIntroPage).toBe(0);
 });
});
