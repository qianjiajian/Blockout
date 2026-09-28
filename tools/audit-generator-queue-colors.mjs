// Read-only active authoring gate. Does not fix or reinterpret old campaigns.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi} from './remake21to30-v120.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';

export function auditCampaignGeneratorQueueColors(levels){
  assert(Array.isArray(levels));
  const rows=levels.map(level=>({levelId:level.id,levelSha256:digest(level),...auditGeneratorQueueColors(level)}));
  return {schemaVersion:1,ruleVersion:'1.29.0',createdAt:new Date().toISOString(),campaignSha256:digest(levels),
    levelsChecked:levels.length,levelsWithGenerators:rows.filter(r=>r.stats.generators>0).length,
    stats:rows.reduce((sum,row)=>{for(const key of Object.keys(sum))sum[key]+=row.stats[key];return sum;},
      {generators:0,queuedBlocks:0,adjacentPairs:0,consecutiveSameColorPairs:0}),
    passed:rows.every(r=>r.passed),affectedLevelIds:rows.filter(r=>!r.passed).map(r=>r.levelId),rows,
    mapsModified:false,solvabilityValidated:false,difficultyValidated:false,pointerValidated:false,releaseApproved:false};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
  // v1.30-v1.57 and reviewed v1.72/v1.73 keep the queue sub-contract;
  // reviewed v1.105 inherits v1.102's explicit FIFO/adjacent-colour requirement.
  // Reviewed v1.111 inherits v1.108's unchanged full FIFO/adjacent-colour gate;
  // v1.109-v1.111 only adjust specified star targets in other batches.
  // the v1.29 queue-colour sub-contract remains unchanged (not a new certificate).
  assert(['1.29.0','1.30.0','1.31.0','1.32.0','1.33.0','1.34.0','1.35.0','1.36.0','1.37.0','1.38.0','1.39.0','1.40.0','1.41.0','1.42.0','1.43.0','1.44.0','1.45.0','1.46.0','1.47.0','1.48.0','1.49.0','1.50.0','1.51.0','1.52.0','1.53.0','1.54.0','1.55.0','1.56.0','1.57.0','1.72.0','1.73.0','1.105.0','1.111.0'].includes(lock.activeVersion),'Review this authoring gate when active rules change');
  const [mode='campaign',...files]=process.argv.slice(2);
  if(mode==='campaign'){
    assert.equal(files.length,0,'Usage: campaign | check CANDIDATE_JSON...');
    const {api}=await loadApi(),result=auditCampaignGeneratorQueueColors(api.LEVELS);
    console.log(JSON.stringify({...result,activeRulesVersion:lock.activeVersion}));if(!result.passed)process.exitCode=1;
  }else if(mode==='check'){
    assert(files.length,'Provide a candidate JSON containing LevelSpec or {level:LevelSpec}');
    let failed=false;
    for(const file of files){
      const data=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')),level=data.level??data;
      const result=auditGeneratorQueueColors(level);
      console.log(JSON.stringify({input:file,inputSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),...result,activeRulesVersion:lock.activeVersion}));
      failed||=!result.passed;
    }
    if(failed)process.exitCode=1;
  }else throw Error('Usage: campaign | check CANDIDATE_JSON...');
}
