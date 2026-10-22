import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';

// Pure saved-metadata contracts. No filesystem, runtime, solver or replay.
export const NATIVE_REGISTRY_PATH='src/core/formalDailyChallenge300Data.ts';
const MARKER='export const FORMAL_DAILY_300_ENTRIES: readonly FormalDaily300Entry[] = Object.freeze(';
const REVISION=/FORMAL_DAILY_300_REVISION = "([a-f0-9]{64})"/g;
const sha=text=>createHash('sha256').update(text).digest('hex');
function parseRegistry(text){
 assert.equal(typeof text,'string');assert.equal(text.split(MARKER).length,2,'One registry declaration');
 const revisions=[...text.matchAll(REVISION)];assert.equal(revisions.length,1,'One registry revision');
 const start=text.indexOf(MARKER),end=text.lastIndexOf(');');assert(end>start);
 assert(revisions[0].index<start,'Revision must precede entries');
 const entries=JSON.parse(text.slice(start+MARKER.length,end));assert(Array.isArray(entries));
 assert(entries.length<=300);assert.equal(levelSha256(entries),revisions[0][1],'Registry revision integrity');
 assert.equal(new Set(entries.map(x=>x.formalId)).size,entries.length,'Existing IDs unique');
 assert.equal(new Set(entries.map(x=>x.layoutSha256)).size,entries.length,'Existing layouts unique');
 return{entries,start,end,revision:revisions[0][1]};
}
export function compactNativeRegistryBaselineV198(text){
 const{entries,revision}=parseRegistry(text);
 return{path:NATIVE_REGISTRY_PATH,sha256:sha(text),revision,count:entries.length,entryHashes:entries.map(e=>({formalId:e.formalId,sha256:levelSha256(e)}))};
}
export function buildCompactNativeRegistryAppendV198(text,entry,baseline){
 assert.deepEqual(compactNativeRegistryBaselineV198(text),baseline,'Exact qualified registry must remain unchanged');
 const{entries,start,end}=parseRegistry(text);assert(entries.length<300,'Registry full');
 assert(entry&&typeof entry.formalId==='string'&&entry.formalId.length);
 assert.equal(entry.layoutSha256,levelSha256(entry.level),'New entry binds its actual level');
 assert(!entries.some(e=>e.formalId===entry.formalId||e.layoutSha256===entry.layoutSha256),'Duplicate ID or layout');
 assert(!entries.some(e=>e.stageKey===entry.stageKey&&e.difficulty===entry.difficulty&&e.slot===entry.slot),'Occupied stage/difficulty/slot');
 const nextEntries=[...entries,structuredClone(entry)],revision=levelSha256(nextEntries);
 const next=text.slice(0,start).replace(REVISION,`FORMAL_DAILY_300_REVISION = "${revision}"`)+MARKER+JSON.stringify(nextEntries,null,2)+text.slice(end);
 const parsed=parseRegistry(next);assert.deepEqual(parsed.entries.slice(0,-1),entries,'Every previous entry is unchanged');
 assert.deepEqual(parsed.entries.at(-1),entry);assert.equal(next.slice(next.lastIndexOf(');')),text.slice(end),'Trailing source remains unchanged');
 return{next,revision,entries:nextEntries,previousEntryHashes:baseline.entryHashes};
}

export function assertCompactNativePointerSettlementV198(p,q){
 assert.equal(p.status,'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS');
 assert.equal(p.candidateInjection,true);assert.equal(p.formalRegistryIdentity,false);
 assert.equal(p.playerSaveTouched,false);assert.equal(p.naturalClock,true);assert.equal(p.clockMocked,false);
 for(const k of ['pointerValidated','timeValidated','settlementValidated'])assert.equal(p[k],true,k);
 assert.equal(p.levelSha256,q.levelSha256);assert.equal(p.routeSha256,q.routeSha256);
 assert.equal(p.U,q.U);assert.equal(p.totalDrags,q.drags.length);
 assert.deepEqual(p.initialInventory,{bodies:q.level.blocks.length,queued:0,generators:[]});
 assert.equal(p.finalPuzzle.complete,true);assert.equal(p.finalPuzzle.failed,false);
 assert.equal(p.finalPuzzle.blocks,0);assert.equal(p.finalPuzzle.queuedBlocks,0);assert.equal(p.finalPuzzle.moves,q.drags.length);
 assert(Number.isFinite(p.finalPuzzle.remainingSeconds)&&p.finalPuzzle.remainingSeconds>0);
 const clock=p.naturalClockProbe;assert(Number.isFinite(clock?.before)&&Number.isFinite(clock?.after)&&clock.before>clock.after&&clock.after>0,'Measured natural countdown must advance');
 assert(p.drawAudit.calls>0);assert.equal(p.drawAudit.rotated,0);assert.equal(p.drawAudit.canvasRotationCalls,0);
 assert.deepEqual(p.errors,[]);assert.deepEqual(p.storageViolations,[]);
 const reward={1:{coins:50,inspiration:20},2:{coins:100,inspiration:50},3:{coins:200,inspiration:100}}[q.difficulty];assert(reward);
 const b=p.entryBaseline,s=p.settlement,d=s?.debug;assert.equal(b.dailyMode,true);assert.equal(s.screen,'win');
 assert.deepEqual(s.win,{difficulty:q.difficulty,...reward});
 assert.equal(d.status,'committed');assert.equal(d.kind,'dailyChallenge');assert.equal(d.levelId,q.level.id);
 assert.equal(d.operation,'settle');assert.equal(d.rewardPresented,true);assert.equal(d.retryAvailable,false);
 assert.equal(d.coinReward,reward.coins);assert.equal(d.inspirationReward,reward.inspiration);assert.equal(d.earnedStars,0);assert.equal(d.pendingCoinDelta,0);
 assert.equal(s.coins-b.coins,reward.coins);assert.equal(s.inspiration-b.inspiration,reward.inspiration);
 for(const k of ['currentLevel','highestLevel','bestStars','bestMoves','rewardedLevels','boosters','lifeState'])assert.deepEqual(s[k],b[k],`Mainline/inventory unchanged: ${k}`);
 assert.equal(s.activeRun,null);assert.equal(s.daily.completed[q.difficulty],true);assert.equal(s.daily.rewarded[q.difficulty],true);
 // Candidate injection is not a real registry entry debit. Formal-entry UI
 // verification remains mandatory after registration and must measure 5 -> 4.
 assert.equal(s.daily.attemptsRemaining,b.attemptsRemaining);
 return{naturalClockMeasured:true,fullOriginalInventory:true,realReward:reward,mainlineUnchanged:true,candidateInjection:true,formalEntryDebitVerified:false};
}
