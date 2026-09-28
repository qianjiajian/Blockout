// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node evidence hashing is outside the browser tsconfig.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/core/levels';
import { REMADE_181_190_IDS } from '../src/core/remake181to190';
import { PuzzleModel } from '../src/core/PuzzleModel';
import { evaluateLevelStars, levelStarTargets } from '../src/core/levelStarConditions';
import type { LevelSpec } from '../src/core/types';
import type { RevisedSearchDrag } from '../src/core/revisedLevelSearch';

type Packet = {
  level: LevelSpec;
  drags: RevisedSearchDrag[];
  mode: 'formal' | 'candidate';
  sourceCandidate: string;
  sourceCandidateSha256: string;
  sourcePhaseApprovalPending: boolean;
  scoringChange: { ruleVersion: string; oldMoveTarget: number; newMoveTarget: number; timeTargetSeconds: number; routeOptimal: boolean };
  upperBound: number;
  sourceAdaptation?: { sourcePhase: { status: string; userApproval: string; sourceInitialOpen: { orange: null; blue: null } } };
};
const root='../deliverables/star-targets182-185-20260928/';
const readJson=(relative:string)=>JSON.parse(readFileSync(new URL(relative,import.meta.url),'utf8'));
const hashFile=(relative:string):string=>createHash('sha256').update(readFileSync(new URL(relative,import.meta.url))).digest('hex');
const before=readJson(root+'before.json') as {levels:{level:LevelSpec}[];oldEvidence:Record<string,string>};
const rows=[
  {id:182,moves:48,seconds:97,totalSeconds:135,clears:28,parking:20,packet:readJson(root+'packets/level182.json') as Packet},
  {id:185,moves:50,seconds:93,totalSeconds:130,clears:31,parking:19,packet:readJson(root+'packets/level185.json') as Packet},
];

describe('v1.111 separate formal182 and candidate185 star targets',()=>{
  it('preserves the old fixture, source candidates and original two-star evidence bytes',()=>{
    for(const [path,expected] of Object.entries(before.oldEvidence))expect(hashFile('../'+path),path).toBe(expected);
    const fixture=readJson('./fixtures/remake182185-v107.json') as {rows:{level:LevelSpec}[]};
    expect(fixture.rows.map(row=>row.level.id)).toEqual([182]);
    expect(levelStarTargets(fixture.rows[0].level)).toEqual({moveTarget:31,timeTargetSeconds:97});
  });

  it('uses the new182 score in production while keeping the old formal185 unchanged',()=>{
    expect(LEVELS[181]).toEqual(rows[0].packet.level);
    expect(LEVELS[184]).toEqual(before.levels.find(row=>row.level.id===185)!.level);
    expect(LEVELS[184]).not.toEqual(rows[1].packet.level);
    expect(REMADE_181_190_IDS).not.toContain(185);
    expect(rows[0].packet.mode).toBe('formal');
    expect(rows[1].packet.mode).toBe('candidate');
    expect(rows[1].packet.sourcePhaseApprovalPending).toBe(true);
    expect(rows[1].packet.sourceAdaptation!.sourcePhase.status).toBe('UNKNOWN_INITIAL_PHASE');
    expect(rows[1].packet.sourceAdaptation!.sourcePhase.userApproval).toBe('PENDING_EXPLICIT_185_AUTHORIZATION');
    expect(rows[1].packet.sourceAdaptation!.sourcePhase.sourceInitialOpen.orange).toBeNull();
    expect(rows[1].packet.sourceAdaptation!.sourcePhase.sourceInitialOpen.blue).toBeNull();
  });

  it.each(rows)('changes only Lv$id move scoring and retains the exact full route',({id,moves,seconds,totalSeconds,packet})=>{
    const original=readJson('../'+packet.sourceCandidate) as {level:LevelSpec;drags:RevisedSearchDrag[]};
    expect(hashFile('../'+packet.sourceCandidate)).toBe(packet.sourceCandidateSha256);
    expect(packet.level).toEqual({...original.level,preservedMoveTarget:moves});
    expect(packet.drags).toEqual(original.drags);
    expect(packet.drags.length).toBe(moves);
    expect(levelStarTargets(original.level)).toEqual({moveTarget:31,timeTargetSeconds:seconds});
    expect(levelStarTargets(packet.level)).toEqual({moveTarget:moves,timeTargetSeconds:seconds});
    expect(packet.level.id).toBe(id);
    expect(packet.level.timeSeconds).toBe(totalSeconds);
    expect(packet.level.parMoves).toBe(31);
    expect(packet.level.reward).toBe(200);
    expect(packet.scoringChange.ruleVersion).toBe('1.111.0');
    expect(packet.scoringChange.routeOptimal).toBe(false);
  });

  it.each(rows)('keeps inclusive move and rounded-up time boundaries for Lv$id',({moves,seconds,packet})=>{
    const score=(m:number,t:number)=>evaluateLevelStars(packet.level,{moves:m,elapsedSeconds:t});
    expect(score(moves,seconds)).toMatchObject({earnedStars:3,moveAchieved:true,timeAchieved:true});
    expect(score(moves+1,seconds)).toMatchObject({earnedStars:2,moveAchieved:false,timeAchieved:true});
    expect(score(moves,seconds+.001)).toMatchObject({earnedStars:2,moveAchieved:true,timeAchieved:false,elapsedSeconds:seconds+1});
    expect(score(moves+1,seconds+.001).earnedStars).toBe(1);
    expect(score(moves,seconds-.001)).toMatchObject({earnedStars:3,elapsedSeconds:seconds});
  });

  it.each(rows)('completes the unchanged Lv$id route under real deferred exit events',({id,moves,seconds,clears,parking,packet})=>{
    const m=new PuzzleModel(structuredClone(packet.level),{deferExitCompletion:true});m.startCountdown();
    let actualParking=0,thawCheckpoint=false,nextFlipCheckpoint=false;
    for(const drag of packet.drags){
      const beforeDrag=m.snapshot();m.beginAction();
      for(const p of drag.path)expect(m.moveBlockStep(drag.blockId,...p),drag.blockId).toBe(true);
      if(drag.exitSide){
        const beforeExit=m.snapshot(),result=m.tryExit(drag.blockId,drag.exitSide);expect(result.ok).toBe(true);
        const immediate=m.snapshot();expect(immediate.cleared).toBe(beforeExit.cleared+1);
        for(const g of beforeExit.flipDoors){
          const after=immediate.flipDoors.find(x=>x.id===g.id)!;
          expect(after.open).toBe(g.open);expect(after.frozen).toBe(Math.max(0,g.frozen-1));
        }
        if(result.exitAnimationId){
          expect(immediate.pendingExitFlipDoorIds?.[result.exitAnimationId]).toEqual(beforeExit.flipDoors.filter(g=>g.frozen===0).map(g=>g.id));
          expect(m.completeExitAnimation(result.exitAnimationId)).toBe(true);
          expect(m.completeExitAnimation(result.exitAnimationId)).toBe(false);
        }
        const settled=m.snapshot();
        for(const g of beforeExit.flipDoors)expect(settled.flipDoors.find(x=>x.id===g.id)!.open).toBe(g.frozen===0?!g.open:g.open);
        if(id===185&&[14,15].includes(settled.cleared)){
          const frozenIds=packet.level.flipDoors!.filter(g=>g.frozen).map(g=>g.id);
          const frozenFlips=settled.flipDoors.filter(g=>frozenIds.includes(g.id));
          expect(frozenFlips).toHaveLength(2);
          expect(frozenFlips.every(g=>g.frozen===0&&g.open===(settled.cleared===15))).toBe(true);
          if(settled.cleared===14){thawCheckpoint=true;expect(settled.shutters[0].revealed).toBe(true);expect(settled.blocks).toHaveLength(17);}
          else nextFlipCheckpoint=true;
        }
      }
      expect(m.commitAction()).toBe(true);const afterDrag=m.snapshot();
      expect(afterDrag.moves).toBe(beforeDrag.moves+1);actualParking+=Number(afterDrag.cleared===beforeDrag.cleared);
    }
    const end=m.snapshot();expect(end.complete).toBe(true);expect(end.failed).toBe(false);
    expect(end.blocks).toEqual([]);expect(end.queuedBlocks).toEqual([]);expect(end.shutters.every(s=>s.revealed)).toBe(true);
    expect(end.moves).toBe(moves);expect(end.cleared).toBe(clears);expect(actualParking).toBe(parking);
    if(id===185){expect(thawCheckpoint).toBe(true);expect(nextFlipCheckpoint).toBe(true);}
    // Score boundary evidence only; natural-clock and GUI evidence are separate.
    expect(evaluateLevelStars(packet.level,{moves:end.moves,elapsedSeconds:seconds}).earnedStars).toBe(3);
    const old=readJson('../'+packet.sourceCandidate) as {level:LevelSpec};
    expect(evaluateLevelStars(old.level,{moves:end.moves,elapsedSeconds:seconds}).earnedStars).toBe(2);
  });
});
