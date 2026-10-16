import assert from 'node:assert/strict';
import {freshRuntime,OUT,sha,write,saveSummary} from './baseline-common.mjs';
const rt=await freshRuntime();const rows=[];
for(const stage of rt.FORMAL_DAILY_CHALLENGE_CATALOG){
 const state=rt.createDailyChallengeState('2026-10-07',stage.unlockLevel,undefined,1);
 for(const difficulty of [1,2,3])for(const assignment of state.pools[difficulty]){
  const source=rt.LEVELS.find(l=>l.id===assignment.sourceLevelId);const level=rt.cloneDailyChallengeLevel(assignment);rt.validateLevel(level);
  const identity=rt.dailyVariantForSource(source,assignment.id);const levelSha256=sha(level);const file=`${OUT}/slots/${assignment.id}.json`;
  const row={formalId:assignment.id,stageKey:stage.stageKey,stageUnlockLevel:stage.unlockLevel,newestMechanism:stage.newestMechanism,difficulty,sourceLevelId:source.id,sourceDifficulty:source.difficulty,levelSha256,sourceLevelSha256:sha(source),sourceSize:[source.width,source.height],actualSize:[level.width,level.height],mechanismRules:level.mechanismRules??'legacy',mechanisms:rt.mechanismsUsedByDailyLevel(level),identity,levelFile:file,status:'PENDING',structure:'PASS',routeStatus:'PENDING',lowerBoundStatus:'PENDING',pointerStatus:'PENDING',timeStatus:'PENDING',formalAccepted:false};
  write(file,{...row,assignment,level});rows.push(row);
 }
}
assert.equal(rows.length,450);assert.equal(new Set(rows.map(x=>x.formalId)).size,450);
console.log(saveSummary(rows));
