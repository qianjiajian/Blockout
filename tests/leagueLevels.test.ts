import {describe,it,expect} from 'vitest';
// @ts-expect-error Vitest provides Node built-ins; the browser tsconfig excludes Node declarations.
import {readFileSync} from 'node:fs';
// @ts-expect-error Vitest provides Node built-ins; the browser tsconfig excludes Node declarations.
import {createHash} from 'node:crypto';
import {getLeagueLevel,nextLeagueLevel,LEAGUE_LEVEL_COUNT} from '../src/core/leagueLevels';
import {LeagueRun} from '../src/core/leagueRun';
import {createLeague,finishLeagueAttempt,advanceLeague,claimLeague} from '../src/core/league';
import {replayRevisedRoute} from '../src/core/revisedLevelSearch';
import {LEVELS} from '../src/core/levels';
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical((value as Record<string,unknown>)[key])])):value;
const admission=JSON.parse(readFileSync('deliverables/league-v2-20261008/formal-adoption/admission.json','utf8'));
const selected=JSON.parse(readFileSync(admission.selectionFile,'utf8')).selections;
const proofFiles=new Map<number,string>(selected.map((row:{index:number;proofFile:string})=>[row.index,row.proofFile]));
const readProof=(index:number)=>JSON.parse(readFileSync(proofFiles.get(index)!,'utf8'));
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

describe('complete independent league content',()=>{
 it('has 100 distinct playable arrangements with same-object fresh certificates',()=>{
  const keys=new Set<string>(),now=Date.now();
  for(let index=1;index<=LEAGUE_LEVEL_COUNT;index++){
   const entry=getLeagueLevel(index),proof=readProof(index);
   expect(entry.index).toBe(index);expect(entry.level.id).toBe(900000+index);
   expect(entry.level).toEqual(proof.level);expect(hash(entry.level)).toBe(entry.levelSha256);
   expect(proof.accepted).toBe(true);expect(proof.lowerBound.result.thresholdProven).toBe(true);
   expect(proof.lowerBound.inputLevelSha256).toBe(hash(entry.level));
   expect(proof.L).toBe(index%5===3?21:16);
   expect(proof.lowerBound.result.rawFullBoardStates).toBeGreaterThan(0);
   expect(proof.lowerBound.result.rawFullBoardStates).toBeLessThanOrEqual(10000);
   const replay=replayRevisedRoute(entry.level,proof.drags),upper=index%5===3?30:20;
   expect(replay.valid).toBe(true);expect(replay.complete).toBe(true);expect(replay.nonClearingDrags).toBeLessThanOrEqual(upper);
   expect(new LeagueRun(createLeague(now,123,0),index,entry.level,entry.specials,now).specialIds.size).toBe(entry.specials.length);
   keys.add(entry.gameplayKey);
  }
  expect(keys.size).toBe(100);expect(LEVELS).toHaveLength(200);
 });
 it('advances one successful level at a time, survives reload and resets after settlement',()=>{
  const now=Date.now();let state=createLeague(now,123,0),points=0;
  for(let index=1;index<=100;index++){
   expect(nextLeagueLevel(state.season)).toBe(index);
   const e=getLeagueLevel(index),run=new LeagueRun(state,index,e.level,e.specials,now+index);
   run.model.startCountdown();
   // Replay the complete witnessed route so real FIFO cargo, shells and hidden
   // layers participate in the 100-level progression/save round trip.
   for(const drag of readProof(index).drags){
    run.model.beginAction();
    for(const [x,y]of drag.path)expect(run.model.moveBlockStep(drag.blockId,x,y)).toBe(true);
    const result=drag.exitSide?run.model.tryExit(drag.blockId,drag.exitSide):undefined;
    expect(run.model.commitAction()).toBe(true);
    if(result){expect(result.ok).toBe(true);if(result.exitAnimationId)run.model.completeExitAnimation(result.exitAnimationId);run.recordRemoval(result,now+index);}
   }
   expect(run.successful).toBe(true);
   const result=finishLeagueAttempt(state,run.attempt,true,run.completedMs!);state=JSON.parse(JSON.stringify(result.state));points+=e.specials.length*10;
   expect(result.points).toBe(e.specials.length*10);expect(state.season.score).toBe(points);
  }
  expect(nextLeagueLevel(state.season)).toBeUndefined();
  const settled=advanceLeague(state,state.season.endMs);
  const account=claimLeague({coins:123,league:settled},settled.lastNowMs);
  expect(nextLeagueLevel(account.league!.season)).toBe(1);expect(account.league!.season.score).toBe(0);
 });
 it('rejects out of range requests and fills a valid old-save gap before advancing',()=>{
  expect(()=>getLeagueLevel(0)).toThrow();expect(()=>getLeagueLevel(101)).toThrow();
  expect(nextLeagueLevel({cleared:[1,3]})).toBe(2);
 });
});
