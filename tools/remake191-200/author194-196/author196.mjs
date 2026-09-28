import fs from 'node:fs';
import {loadApi,original,PROFILE,auditSpatial,digest,ruleGate} from '../common.mjs';
import {replay} from '../replay.mjs';
import {searchFlipWitness} from './flip-search.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {pack,SHAPES,seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
ruleGate();const{api}=await loadApi(),R=seededRng(Number(process.env.SEED??196108)),OUT='deliverables/remake191-200-20260927/author194-196';
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const originalLevel=original().levels[195].level,log=[],save=(n,d)=>{let p=OUT+'/'+n+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return p;};
const tiles=[['purple','H2'],['cyan','H2'],['green','H3'],['orange','V3'],['pink','H2'],['cyan','H2'],['purple','H2'],['yellow','H3'],['pink','H2'],['green','H2'],['purple','SINGLE'],['red','H2'],['blue','H3'],['orange','V2'],['orange','SQ2'],['yellow','H2'],['red','H2']].map(([color,kind],i)=>({color,kind,sourceId:i}));
const end=Date.now()+Number(process.env.SECONDS??90)*1000;let packed=0,witnesses=0,best=Infinity;
for(let a=0;Date.now()<end;a++){
 const seed=R.state(),spec=structuredClone(tiles);const h2=R.shuffle(spec.filter(t=>t.kind==='H2'));for(let i=0;i<3;i++)h2[i].kind='SQ2';for(let i=3;i<6;i++)h2[i].kind='H3';
 const pieces=pack(spec,rect(6,8),R,2500,true);if(!pieces)continue;packed++;
 const l=structuredClone(originalLevel);Object.assign(l,{mechanismRules:PROFILE,difficulty:'easy',blocks:pieces.map(({kind,sourceId,...p})=>({...p,id:'r108-196-s'+sourceId})),gates:[],flipDoors:[]});for(const k of ['shutters','generators','coloredGrids'])delete l[k];
 const ports=R.shuffle([['top',0,3],['top',3,3],['bottom',0,3],['bottom',3,3],['left',0,3],['left',4,3],['right',0,3],['right',4,3]]);
 for(const[i,color]of ['orange','blue','cyan','red','yellow','green','pink','purple'].entries()){const[side,offset,size]=ports[i],g={id:'r108-196-g'+color,color,side,offset,size,...color==='orange'?{}:{frozen:2}};if(['green','pink','purple'].includes(color))l.flipDoors.push({...g,initiallyOpen:color==='pink'});else l.gates.push(g);}
 let spatial;try{spatial=auditSpatial(l,api);}catch(e){log.push({a,seed,hash:digest(l),status:'static-fail',error:e.message});continue;}
 const witness=searchFlipWitness(l,{maxCost:10,maxStates:20000,maxMilliseconds:250,orderSeed:a%17});let row={a,seed,hash:digest(l),status:witness.status,U:witness.cost,states:witness.states,ms:witness.milliseconds};log.push(row);if(witness.status!=='witness')continue;witnesses++;
 let rep;try{rep=replay(l,witness.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){row.replayError=e.message;continue;}
 const p=structuredClone(l);p.mechanismRules='revised-2026-09-23-v1.4';p.gates.push(...p.flipDoors.map(({initiallyOpen,...g})=>g));p.flipDoors=[];
 const proof=checkSymmetryFloor(p,{floor:5,maxStates:100000,maxMilliseconds:1600});row.proof=proof.status;row.shortcut=proof.relaxedNonClearingDrags;
 if(witness.cost<best){best=witness.cost;console.log(JSON.stringify(row));}
 if(proof.thresholdProven){row.file=save('candidate196',{ruleVersion:'1.108.0',level:l,levelSha256:digest(l),drags:witness.drags,spatial,witness,replay:rep,proof,projection:p,projectionReason:'Flip doors permanently open after original ice2; preserves all bodies and gate counts. Optional exits admit every actual delayed flip schedule at no higher cost.',sourceAdaptation:'Source 17 whole bodies retained. Seven ice2 doors, three observed flips pink initially open / green purple initially closed. Nine source colors/doors mapped to eight by source lime -> orange and removing lime ordinary gate; orange ordinary stays. Six H2 bodies expanded (three SQ2,three H3) to fill48 vs39 source cells under v108 shape authorization. No source timers/axis/lifts/generator.',sourceEvidence:['.codex-temp/video-audit-170-200/194-197/frames-1fps/sec-0218.jpg','.codex-temp/video-audit-170-200/194-197/frames-1fps/sec-0226.jpg','.codex-temp/video-audit-170-200/194-197/frames-1fps/sec-0232.jpg'],budgets:{witnessMilliseconds:250,witnessStates:20000,proofMilliseconds:1600,proofStates:100000},formalAdopted:false,pointerValidated:false});console.log(row.file);break;}
}
console.log(JSON.stringify({packed,witnesses,best,attempts:save('attempts196',log)}));
