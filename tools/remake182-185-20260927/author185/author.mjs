import fs from 'node:fs';
import {loadApi,replay} from '../replay.mjs';
import {ruleGate,PROFILE,digest,auditSpatial,readBaseline,writeNew} from '../common.mjs';
import {pack,SHAPES,seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {search} from './search.mjs';
const ROOT='deliverables/remake182-185-20260927/author185';
ruleGate();const {api}=await loadApi(),base=readBaseline().levels[184].level,rng=seededRng(Number(process.env.SEED??107185)),pick=a=>a[Math.floor(rng.rand()*a.length)],logs=[];
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
SHAPES.BIG5=api.FORMAL_BLOCK_SHAPES.filter(s=>s.cells.length===5&&s.canonicalWidth<=3).map(s=>s.cells);
const stamp=Date.now(),logFile=ROOT+'/attempts-'+stamp+'.jsonl',end=Date.now()+Number(process.env.SECONDS??60)*1000;
let maxWitnessCost=0,solved=0,valid=0;
for(let attempt=0;Date.now()<end;attempt++){
 const targeted=process.env.TARGET==='1',big=!targeted&&attempt%2===1,cover=targeted?{x:3,y:0,width:3,height:6}:big?pick([{x:1,y:0,width:4,height:5},{x:1,y:1,width:4,height:5},{x:0,y:1,width:5,height:4},{x:1,y:1,width:5,height:4}]):pick([{x:0,y:0,width:3,height:6},{x:3,y:0,width:3,height:6},{x:0,y:0,width:6,height:3},{x:0,y:3,width:6,height:3}]);
 const hiddenCells=rect(cover.width,cover.height).map(([x,y])=>[x+cover.x,y+cover.y]),hiddenSet=new Set(hiddenCells.map(p=>p.join(','))),openCells=rect(6,6).filter(p=>!hiddenSet.has(p.join(',')));
 const big5=process.env.BIG5==='1';
 const openSpec=Array.from({length:14},(_,i)=>({sourceId:'opening-'+(i+1),kind:big5?(i===0?'BIG5':'SINGLE'):i===0?'L3':!big&&i<=2?(targeted?'H2':pick(['H2','V2'])):'SINGLE',...(targeted?{color:big5?(i===0?'cyan':i<8?'red':['yellow','cyan','green'][(i-8)%3]):i<3?['cyan','yellow','green'][i]:i<10?'red':['yellow','cyan','green'][(i-10)%3]}:{})}));
 const hiddenSpec=Array.from({length:17},(_,i)=>({sourceId:'hidden-'+(i+1),kind:big&&i===0?'L3':i===(big?1:0)?pick(['H2','V2']):'SINGLE'}));
 const open=pack(openSpec,openCells,rng,targeted?100:40,targeted),hidden=pack(hiddenSpec,hiddenCells,rng,40);if(!open||!hidden)continue;
 // Color independently after geometry; no adjacent equal opening colors.
 const assigned=[];let failed=false;if(!targeted)for(const b of rng.shuffle(open)){const touching=assigned.filter(p=>p.shape.some(([dx,dy])=>b.shape.some(([sx,sy])=>Math.abs(p.x+dx-b.x-sx)+Math.abs(p.y+dy-b.y-sy)===1))).map(b=>b.color),opts=['red','yellow','cyan','green'].filter(c=>!touching.includes(c));if(!opts.length){failed=true;break;}b.color=opts.includes('red')&&rng.rand()<.65?'red':pick(opts);assigned.push(b);}if(failed)continue;
 // A complete settled-flip witness needs at least seven ordinary opening exits.
 if(open.filter(b=>b.color==='red').length<7)continue;
 rng.shuffle(hidden).forEach((b,i)=>b.color=i<9?'pink':['orange','blue','purple'][(i-9)%3]);
 const level=structuredClone(base);Object.assign(level,{mechanismRules:PROFILE,blocks:[...open.map(b=>({id:'a107-185-'+b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color})),...hidden.map(b=>({id:'a107-185-'+b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color,shutterId:'a107-185-curtain14'}))],shutters:[{id:'a107-185-curtain14',...cover,count:14}],generators:[],gates:[],flipDoors:[]});
 const templates=[{color:'red'},...['yellow','cyan','green'].map(color=>({color,initiallyOpen:true})),{color:'pink',frozen:14},...['orange','blue','purple'].map(color=>({color,initiallyOpen:false,frozen:14}))],used=new Set();
 for(const g of rng.shuffle(templates)){const opts=[];for(const side of ['left','right','top','bottom']){const dim=side==='top'||side==='bottom'?0:1,bs=level.blocks.filter(b=>b.color===g.color),size=Math.max(1,...bs.map(b=>1+Math.max(...b.shape.map(p=>p[dim]))));if(size>3)continue;for(let offset=0;offset+size<=6;offset++){if(Array.from({length:size},(_,k)=>side+':'+(offset+k)).some(k=>used.has(k)))continue;const cells=Array.from({length:size},(_,k)=>side==='left'?[0,offset+k]:side==='right'?[5,offset+k]:side==='top'?[offset+k,0]:[offset+k,5]);if(!g.frozen&&cells.some(p=>hiddenSet.has(p.join(','))))continue;opts.push({side,size,offset});}}
  const fixed={red:{side:'top',offset:0},yellow:{side:'top',offset:1},cyan:{side:'left',offset:0},green:big5?{side:'top',offset:2}:{side:'left',offset:2}};
  const filtered=targeted&&!g.frozen?opts.filter(o=>o.side===fixed[g.color].side&&o.offset===fixed[g.color].offset):opts;
  if(!filtered.length){failed=true;break;}const gate={id:'a107-185-'+g.color,...g,...pick(filtered)};for(let k=0;k<gate.size;k++)used.add(gate.side+':'+(gate.offset+k));(g.initiallyOpen===undefined?level.gates:level.flipDoors).push(gate);
 }
 if(failed)continue;
 let spatial;try{spatial=auditSpatial(level,api);}catch{continue;}valid++;
 const budget={maxCost:22,maxMilliseconds:350,maxStates:30000,orderSeed:attempt%31};
 const witness=search(level,budget),log={attempt,levelSha256:digest(level),budget,result:{...witness,drags:undefined},cover};
 if(witness.status==='witness'){
  solved++;maxWitnessCost=Math.max(maxWitnessCost,witness.cost);let rr;try{rr=replay(level,witness.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){log.replayError=e.message;}
  if(rr){const p=structuredClone(level);p.mechanismRules='revised-2026-09-23-v1.4';p.gates.push(...p.flipDoors.map(({initiallyOpen,...g})=>g));p.flipDoors=[];const proof=checkSymmetryFloor(p,{floor:16,maxMilliseconds:150,maxStates:25000});log.proof={...proof,relaxedRoute:undefined};
   {const file=ROOT+'/candidate-'+stamp+'-'+attempt+'.json';writeNew(file,{level,drags:witness.drags,levelSha256:digest(level),routeSha256:digest(witness.drags),spatial,witness,replay:rr,proof,projected:p,sourcePhaseStatus:'SOURCE_INITIAL_UNKNOWN; proposed false values align first observed thawed closed state; user approval pending',formalAdopted:false,pointerValidated:false});console.log(JSON.stringify({file,cost:witness.cost,proof:proof.status,shortcut:proof.relaxedNonClearingDrags}));}
  }
 }
 logs.push(log);fs.appendFileSync(logFile,JSON.stringify(log)+'\n');
}
writeNew(ROOT+'/attempt-summary-'+stamp+'.json',{valid,solved,maxWitnessCost,logFile,finiteBudgets:true});console.log(JSON.stringify({valid,solved,maxWitnessCost,logFile}));
