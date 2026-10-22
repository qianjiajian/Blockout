import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {FORMAL_231_240_LEVELS,getFormal231to240LevelStrict,FORMAL_231_240_EVIDENCE} from '../src/core/formal231to240Data';
import {LEVELS,getLevelStrict,FORMAL_201_210_LEVELS,FORMAL_211_220_LEVELS,FORMAL_221_230_LEVELS} from '../src/core/levels';
import {PuzzleModel} from '../src/core/PuzzleModel';
import {digest} from '../tools/revised-preview-validation-v160.mjs';
import {replay} from '../tools/remake191-200/replay.mjs';
import {loadApi,audit,BANDS} from '../tools/continue231-240/common.mjs';
const ROOT='deliverables/continue231-240-20261019';
const baseline=JSON.parse(fs.readFileSync(ROOT+'/before.json'));
const {api}=await loadApi();
describe('independent formal continuation 231–240',()=>{
 it('preserves the exact original 1–230 objects and production activity boundary',()=>{
  expect(LEVELS).toHaveLength(200);expect(digest(LEVELS)).toBe(baseline.productionSha256);
  for(const [i,levels]of [FORMAL_201_210_LEVELS,FORMAL_211_220_LEVELS,FORMAL_221_230_LEVELS].entries())expect(digest(levels)).toBe(baseline.existingFormal[i].sha256);
  for(const id of [201,230,231,240,241])expect(()=>getLevelStrict(id)).toThrow();
 });
 it('contains only accepted, unique, independently authored objects and rejects unknown IDs',()=>{
  const status=JSON.parse(fs.readFileSync(ROOT+'/status.json'));
  expect(FORMAL_231_240_LEVELS.map(x=>x.id)).toEqual(status.accepted);
  const geometry=level=>({width:level.width,height:level.height,playable:level.playable,blocks:level.blocks.map(b=>({x:b.x,y:b.y,shape:b.shape})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
  expect(new Set(FORMAL_231_240_LEVELS.map(x=>digest(geometry(x)))).size).toBe(FORMAL_231_240_LEVELS.length);
  for(const level of FORMAL_231_240_LEVELS)expect(getFormal231to240LevelStrict(level.id)).toBe(level);
  for(const id of [200,230,241,NaN,231.5,'231'])expect(()=>getFormal231to240LevelStrict(id)).toThrow();
 });
 for(const level of FORMAL_231_240_LEVELS)it(`Lv${level.id}: same-object full-inventory route, band, art, actual two-screen three-star evidence`,()=>{
  const evidence=FORMAL_231_240_EVIDENCE.find(x=>x.id===level.id),record=JSON.parse(fs.readFileSync(evidence.evidence));
  const packet=JSON.parse(fs.readFileSync(evidence.qualification)),[lo,hi]=BANDS[level.difficulty];
  expect(record.status).toBe('FORMAL_DATA_ACCEPTED');expect(digest(level)).toBe(record.levelSha256);expect(digest(packet.drags)).toBe(record.routeSha256);
  expect(packet.level).toEqual(level);expect(record.L).toBeGreaterThanOrEqual(lo);expect(record.U).toBeLessThanOrEqual(hi);expect(record.L).toBeLessThanOrEqual(record.U);
  const result=replay(level,packet.drags,api,{complete:true,requirePointerCompatible:true});expect(result.valid).toBe(true);expect(result.nonClearingDrags).toBe(record.U);expect(result.effectiveDrags).toBe(record.starMoves);expect(audit(level,api).passed).toBe(true);
  expect(new PuzzleModel(level).snapshot().blocks.length).toBeGreaterThan(0);
  expect(record.pointer.map(x=>x.viewport)).toEqual([{width:320,height:568},{width:496,height:1078}]);
  for(const pointer of record.pointer){const report=JSON.parse(fs.readFileSync(pointer.file)),row=report.rows.find(x=>x.id===level.id);expect(report.status).toBe('PASS');expect(report.formalDataValidated).toBe(true);expect(report.clockFrozen).toBe(false);expect(row.levelSha256).toBe(digest(level));expect(row.candidateOverlay).toBe(false);expect(row.settlement.earnedStars).toBe(3);expect(row.nativeDrawAudit.rotated).toBe(0);expect(row.final.complete).toBe(true);}
 });
});
