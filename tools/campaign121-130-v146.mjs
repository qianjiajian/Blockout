import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {assertBaseline,BASELINE} from './campaign31-200-baseline-v145.mjs';
import {campaignCadence,SOURCE_FILES} from './campaign31-200-plan-v145.mjs';
import {loadApi,geometry} from './native-block-repair-v143.mjs';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';

export const ROOT='deliverables/campaign121-130-v146-20260924';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>121+i));
export const schedule=campaignCadence().rows.filter(row=>IDS.includes(row.id));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export function saveNew(name,value){
  const dest=path.resolve(ROOT,name);
  assert(dest.startsWith(path.resolve(ROOT)+path.sep),'Batch output only');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  return path.relative(process.cwd(),dest).replaceAll('\\','/');
}
export async function inspect(){
  const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
  assert(['1.46.0','1.47.0','1.48.0','1.49.0','1.50.0','1.51.0','1.52.0','1.53.0','1.54.0','1.55.0','1.56.0','1.57.0','1.58.0','1.59.0','1.60.0','1.61.0','1.62.0','1.63.0','1.64.0','1.65.0','1.66.0','1.67.0'].includes(lock.activeVersion),'Only the reviewed v1.45/v1.46 contract and unchanged successors');
  const baseline=assertBaseline(read(BASELINE)),{api,inputs}=await loadApi();
  const source=read(SOURCE_FILES[1]);
  const rows=schedule.map(target=>{
    const level=api.LEVELS.find(l=>l.id===target.id),old=baseline.levels[target.id-1];
    assert.equal(digest(level),old.sha256,`Lv${level.id} changed since authorized campaign baseline; review before authoring`);
    const truth=source.levels.find(l=>l.level===target.id),snap=new api.PuzzleModel(level).snapshot();
    const art=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));
    const m=truth.mechanisms;
    return {target,level,levelSha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level),
      historicalDesignFacts:measureDesignFacts(level,api),
      historicalAudit:{opening:auditOpeningCoverage(snap),hidden:auditHiddenCoverage(level),queue:auditGeneratorQueueColors(level),
        gateSpans:auditGateSpanLimits(level),nativeArt:{passed:art.every(r=>r.match?.quarterTurns===0),unsupported:art.filter(r=>r.match?.quarterTurns!==0)}},
      source:{file:SOURCE_FILES[1],recordSha256:digest(truth),composition:truth.composition,
        mechanismSummary:{ordinaryExits:m.directional_exits.ordinary.length,frozenExits:m.directional_exits.frozen.map(g=>g.frozen.value),
          ice:m.numeric_ice,shells:m.shells,bombs:m.bombs,keysLocks:m.keys_locks,covers:m.covers,generators:m.generators,
          elevators:m.elevators,axis:m.axis_blocks,stars:m.star_blocks,unsupported:m.unsupported},
        requiredMissing:truth.required_exact_fields_missing??[],unclear:truth.source_unclear_fields??[],
        caution:'Historical source summary only. Missing values and contradictory notes require frame review; hidden unknowns may be authored explicitly.'},
      state:'awaiting-reviewed-source-and-new-candidate',freshLowerBound:null,freshRoute:null,pointerValidated:false,formalAdopted:false};
  });
  const bindings=[BASELINE,SOURCE_FILES[1],'tools/campaign121-130-v146.mjs','tools/campaign31-200-plan-v145.mjs',
    'docs/rules/mechanism-rules-v1.60.0.md','docs/rules/mechanism-rules-v1.62.0.md','docs/rules/mechanism-rules-v1.64.0.md','docs/rules/mechanism-rules-v1.65.0.md','docs/rules/mechanism-rules-v1.66.0.md','docs/rules/mechanism-rules-v1.67.0.md','docs/rules/manifest.json',...inputs];
  const result={schemaVersion:1,activeRuleVersion:lock.activeVersion,designContract:'1.45.0',createdAt:new Date().toISOString(),scope:IDS,
    campaignBaseline:BASELINE,baselineCampaignSha256:baseline.campaignSha256,currentCampaignSha256:digest(api.LEVELS),
    protectedOther190Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),protected1to30Sha256:digest(api.LEVELS.filter(l=>l.id<=30)),
    bindings:Object.fromEntries([...new Set(bindings)].map(p=>[p,digest(fs.readFileSync(p))])),rows,
    generated:0,verified:0,adopted:0,releaseApproved:false};
  const file=saveNew('input-audit-'+Date.now()+'.json',result);
  return {file,campaignSha256:result.currentCampaignSha256,rows:rows.map(r=>({id:r.level.id,target:r.target.difficulty,range:r.target.range,
    historicalBlocks:r.level.blocks.length,opening:r.historicalAudit.opening.passed,hidden:r.historicalAudit.hidden.passed,
    queue:r.historicalAudit.queue.passed,native:r.historicalAudit.nativeArt.passed,nativeMissing:r.historicalAudit.nativeArt.unsupported.map(x=>x.id)})),generated:0,verified:0,adopted:0};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  assert.equal(process.argv[2],'inspect','Usage: node tools/campaign121-130-v146.mjs inspect');
  console.log(JSON.stringify(await inspect(),null,2));
}
