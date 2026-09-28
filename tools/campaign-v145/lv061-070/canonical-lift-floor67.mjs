import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {qualifyLift} from './lift-floor.mjs';
import {searchCanonical} from './canonical-search68-69.mjs';
// Same exact identity-permutation quotient as canonical-lift-floor.mjs,
// with the qualified same full-inventory transition domain restricted to Lv67.
// Equal full shape/layers/initial ice/owning batch; pose and current ice stay
// paired, ordered reveal flags are retained. IDs have no dynamics in this domain.
// No forced clear, deletion of hidden stock, or final-layer simplification.
export function checkCanonicalLiftFloor67(level,api,options={}){
 const floor=options.floor??11,maxStates=options.maxStates??1500000,maxMilliseconds=options.maxMilliseconds??120000;
 const files=['tools/campaign-v145/lv061-070/canonical-lift-floor67.mjs','tools/campaign-v145/lv061-070/canonical-search68-69.mjs','tools/campaign-v145/lv061-070/lift-floor.mjs','deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs'];
 const base={thresholdProven:false,abstraction:'qualified-full-inventory-lift-optional-exit-label-symmetry-67-v147',costNonincreasing:true,sourceLevelSha256:digest(level),solvabilityValidated:false,timeValidated:false,pointerValidated:false,toolBindings:Object.fromEntries(files.map(f=>[f,digest(fs.readFileSync(f))]))};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...base,status:'invalid',reason:'Positive safe integer budgets required'};
 try{if(level.id!==67)throw Error('Qualified for67 only');qualifyLift(level,api);if(level.blocks.some(b=>!Number.isInteger(b.frozen??0)||(b.frozen??0)<0||(b.frozen??0)>=64||(b.layers?.length??1)>=8))throw Error('Canonical key range exceeded');}catch(e){return{...base,status:'unsupported',reason:e.message};}
 return{...base,...searchCanonical(level,{floor,maxStates,maxMilliseconds,prove:true})};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const{api}=await loadApi(),candidateFile=process.argv[2],d=JSON.parse(fs.readFileSync(candidateFile)),report=checkCanonicalLiftFloor67(d.level,api,{floor:11,maxStates:Number(process.env.MAX_STATES??1500000),maxMilliseconds:Number(process.env.PROOF_MS??120000)}),out=candidateFile.replace(/\.json$/,'.canonical-floor-'+Date.now()+'.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report,drags:undefined,bestState:undefined}));}
