import fs from 'node:fs';
import {loadApi,replay} from '../replay.mjs';
import {ruleGate,digest,auditSpatial,writeNew} from '../common.mjs';
import {search} from './search.mjs';
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file));ruleGate();const {api}=await loadApi();
let spatial;try{spatial=auditSpatial(d.level,api);}catch(e){console.log(JSON.stringify({spatialError:e.message}));process.exit(1);}
for(const orderSeed of [0,5,9,13]){
 const budget={maxCost:20,maxMilliseconds:5000,maxStates:250000,orderSeed,weight:1000};
 const witness=search(d.level,budget);let rr,error;
 if(witness.status==='witness')try{rr=replay(d.level,witness.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){error=e.message;}
 const out='deliverables/remake182-185-20260927/author185/assist-check-'+Date.now()+'.json';writeNew(out,{sourceFile:file,level:d.level,levelSha256:digest(d.level),spatial,witness,drags:witness.drags,routeSha256:witness.drags?digest(witness.drags):null,replay:rr,error,budget,formalAdopted:false,pointerValidated:false,sourcePhaseStatus:d.sourcePhaseStatus});console.log(JSON.stringify({out,result:{...witness,drags:undefined},error,replay:!!rr}));if(rr)break;
}
