import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {fifoPayload} from './author235-native.mjs';
ruleGate();const {api}=await loadApi();
for(const id of process.argv.slice(2).map(Number)){
 const originalFile=`${ROOT}/author${id}/qualified${id}.json`,old=JSON.parse(fs.readFileSync(originalFile));
 const level=structuredClone(old.level),a=level.mechanismAdaptation;
 assert(a&&a.sourceReference&&!a.sourceFactsFile);
 level.mechanismAdaptation={userAuthorized:'用户要求根据竞品关卡视频继续制作200关以后的关卡；按既有主线合同作必要适配与原创重排。',change:a.change,sourceFactsFile:a.sourceReference};
 const changes=['Source metadata uses the existing LevelSpec field names; no game rule or source fact changed.'];
 if(id===235){for(const g of level.generators){assert.equal(g.size,g.rimSpan);delete g.size;}changes.push('Removed redundant unsupported generator.size; runtime uses the unchanged rimSpan.');assert.deepEqual(fifoPayload(old.level,api).p,fifoPayload(level,api).p);}
 const gameplay=x=>{const y=structuredClone(x);delete y.mechanismAdaptation;for(const g of y.generators??[])delete g.size;return y;};
 assert.deepEqual(gameplay(old.level),gameplay(level));
 const oldModel=new api.PuzzleModel(old.level),newModel=new api.PuzzleModel(level);
 const snapshot=x=>{const s=x.snapshot();if(id===235)for(const g of s.generators)delete g.size;return s;};
 assert.deepEqual(snapshot(oldModel),snapshot(newModel));
 const route=replay(level,old.drags,api,{complete:true,requirePointerCompatible:true});assert(route.valid);
 const rebind={status:'PASS_SCHEMA_ONLY_REBIND',originalFile,originalFileJsonBufferSha256:digest(fs.readFileSync(originalFile)),originalLevelSha256:old.levelSha256,levelSha256:digest(level),gameplaySha256:digest(gameplay(level)),gameplayDeepEqual:true,initialModelSnapshotDeepEqual:true,fifoNativeInputDeepEqual:id===235?true:null,changes,oldProofsRetained:true,requiresFreshFormalPointer:true};
 if(id===235){rebind.initialModelSnapshotDeepEqual=false;rebind.initialModelSnapshotEqualExceptUnsupportedGeneratorSize=true;for(let n=1;n<=old.drags.length;n++){const before=replay(old.level,old.drags.slice(0,n),api),after=replay(level,old.drags.slice(0,n),api);const x=JSON.parse(before.finalStateKey),y=JSON.parse(after.finalStateKey);for(const g of x.generators)delete g.size;assert.deepEqual(x,y);}rebind.all47RouteStatesEqualExceptUnsupportedGeneratorSize=true;}
 const packet={...old,level,levelSha256:digest(level),audit:audit(level,api),strictReplay:route,schemaRebind:rebind,pointerValidated:false,naturalClockValidated:false,formalAccepted:false,formalAdopted:false};
 const file=`${ROOT}/author${id}/qualified${id}-schema.json`;
 if(fs.existsSync(file))assert.deepEqual(JSON.parse(fs.readFileSync(file)),packet);else writeNew(file,packet);
 console.log(JSON.stringify({id,file,levelSha256:packet.levelSha256,rebind:rebind.status}));
}
