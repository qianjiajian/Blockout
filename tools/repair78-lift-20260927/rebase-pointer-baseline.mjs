import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const root='deliverables/repair78-lift-20260927',sourceFile=root+'/before-write.json',before=JSON.parse(fs.readFileSync(sourceFile));
assert(verifyRulesLock().ok);
const hashes=()=>{const result={};function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+item.name;if(item.isDirectory())walk(p);else result[p]=digest(fs.readFileSync(p));}}walk('src');return result;};
const srcBefore=hashes();
const b=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
assert.deepEqual(hashes(),srcBefore,'Concurrent write during read');
const current=JSON.parse(JSON.stringify(api.LEVELS));assert.equal(digest(current[77]),'1efb98287c492e611e33f5b692d796263b01d41d30ae266f28c30a88389e20af');
const changed=current.filter((l,i)=>l.id!==78&&digest(l)!==digest(before.priorLevels[i])).map(l=>l.id);
assert(changed.every(id=>id>=151&&id<=170),'Only independently authorized 151–170 may advance alongside this repair');
const originalBindings={...before.bindings},sourceChanges=[];
for(const[p,h]of Object.entries(srcBefore)){
 if(p==='src/core/levels.ts'||p==='src/core/level78LateLiftRepair.ts')continue;
 if(originalBindings[p]!==h){
  if(p==='src/game/formalBlockShapes.ts'){
   const text=fs.readFileSync(p,'utf8');
   const prior=text.replace("import { REMADE_161_170_IDS } from '../core/remake161to170';\n",'').replace(' || REMADE_161_170_IDS.includes(levelId)','');
   assert.equal(digest(prior),originalBindings[p],'Only the new 161–170 native-art eligibility may differ');
  }else assert(['src/core/remake151to160.ts','src/core/remake161to170.ts'].includes(p),`Unexpected concurrent source: ${p}`);
  before.bindings[p]=h;sourceChanges.push({path:p,before:originalBindings[p]??null,after:h,...(p==='src/game/formalBlockShapes.ts'?{verifiedOnly161NativeEligibility:true}:{})});
 }
}
// This is an explicit preservation reference, not a new historical before-state:
// preserve current unrelated authorized maps while retaining the real old Lv78.
before.priorLevels=current;before.priorLevels[77]=before.level;before.campaignSha256=digest(before.priorLevels);
before.baselineKind='CONCURRENT_PRESERVATION_REFERENCE';before.referenceCapturedAt=new Date().toISOString();
before.rebase={sourceFile,sourceSha256:digest(fs.readFileSync(sourceFile)),changedOtherIds:changed,sourceChanges,taskLevelRestoredFromOriginal:true,taskOriginalLevelSha256:before.levelSha256,actualCurrentLevelSha256:digest(current[77]),explanation:'Only independently authorized parallel 151–170 maps/sources advance. Lv78 old object and original levels.ts binding remain the actual pre-repair values. New repair module is intentionally absent from before bindings; exact current module is checked by final formal map equality.'};
// current[77] aliases priorLevels after the replacement above; report the verified
// actual accepted hash directly rather than accidentally recording the old map.
before.rebase.actualCurrentLevelSha256='1efb98287c492e611e33f5b692d796263b01d41d30ae266f28c30a88389e20af';
const output=root+`/before-pointer-${Date.now()}.json`;
fs.writeFileSync(output,JSON.stringify(before,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:digest(fs.readFileSync(output)),changedOtherIds:changed,sourceChanges}));
