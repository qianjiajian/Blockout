import fs from 'node:fs';
import {loadApi,PROFILE,original,auditSpatial,digest,ruleGate} from '../common.mjs';
import {pack,SHAPES,seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {runPrefix,OUT} from './prefix.mjs';
import {compile,search} from '../../remake161-170/author168-170/search.mjs';
const {api}=await loadApi();ruleGate();const base=original().levels[181].level,R=seededRng(Number(process.env.SEED??182107));
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const save=(name,d)=>{const f=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return f;};
function make(attempt){const l=structuredClone(base);l.mechanismRules=PROFILE;l.difficulty='hard';l.shutters=[{id:'r107-182-c4',x:2,y:1,width:5,height:10,count:4},...Array.from({length:5},(_,i)=>({id:'r107-182-m'+i,x:i+1,y:0,width:1,height:1,count:10}))];
 const bags=[['SINGLE','SINGLE','V2','V2','V2','V3','V3','SQ2'],['SINGLE','V2','V2','V2','V2','V3','V3','V3'],['SINGLE','SINGLE','SINGLE','V2','V3','V3','V3','SQ2']];
 const kinds=R.shuffle([...bags[attempt%bags.length]]),colors=R.shuffle(['cyan','cyan','blue','pink','green','yellow','purple','red']);
 const opening=pack(kinds.map((kind,i)=>({kind,color:colors[i]})),rect(2,9).map(([x,y])=>[x,y+1]),R,4000,true);if(!opening)return;
 l.blocks=[{id:'o0',shape:rect(2,1),color:'blue',x:0,y:10},...opening.map(({kind,id,...b},i)=>({...b,id:'o'+(i+1)}))];
 const spec=[...Array.from({length:8},(_,i)=>({kind:'SQ2',color:['blue','cyan','pink','blue','cyan','pink','orange','pink'][i],...(i===7?{layers:['pink','yellow'],frozen:22}: {})})),...Array.from({length:3},(_,i)=>({kind:'V3',color:['blue','cyan','red'][i]})),{kind:'L3',color:'pink'},{kind:'RECT6',color:'blue'}];
 const hidden=pack(spec,rect(5,10).map(([x,y])=>[x+2,y+1]),R,7000,true);if(!hidden)return;
 l.blocks.push(...hidden.map(({kind,id,...b},i)=>({...b,id:'h'+i,shutterId:'r107-182-c4'})),...Array.from({length:5},(_,i)=>({id:'m'+i,x:i+1,y:0,shape:rect(1,1),color:['green','purple','yellow','cyan','pink'][i],shutterId:'r107-182-m'+i})));
 l.gates=[['blue','bottom',0,3,0],['cyan','left',1+attempt%8,3,1],['pink','right',4,3,3],['green','right',7,3,8],['purple','top',1,3,9],['yellow','top',4,2,10],['red','right',1,3,19],['orange','bottom',3,3,24]].map(([color,side,offset,size,frozen])=>({id:'r107-182-g'+color,color,side,offset,size,...(frozen?{frozen}:{})}));return l;}
const log=[],budget=Number(process.env.ATTEMPTS??120),start=Date.now();let best=0;
for(let attempt=0;attempt<budget;attempt++){const seed=R.state(),l=make(attempt);if(!l){log.push({attempt,seed,status:'packing-rejected'});continue;}let audit,p,upper,replay,error;try{audit=auditSpatial(l,api);p=runPrefix(l,api,{floor:16,maxMilliseconds:800,maxStates:150000});if(p.thresholdProven&&p.maxClearsSeen>=1){upper=search(compile(l,api),{maxMilliseconds:1800,maxStates:50000,floor:23});if(upper.status==='witness')replay=api.replayRevisedRoute(l,upper.drags);}}catch(e){error=e.message;}
 const row={attempt,seed,sha:digest(l),proof:p?.status,min:p?.relaxedNonClearingDrags,maxClears:p?.maxClearsSeen,U:replay?.nonClearingDrags,upper:upper?.status,bestClear:upper?.maxClears,error};log.push(row);console.log(JSON.stringify(row));
 if(p?.thresholdProven||Number(p?.relaxedNonClearingDrags)>best){best=Math.max(best,p?.relaxedNonClearingDrags??0);row.file=save('candidate182',{level:l,ruleVersion:'1.107.0',seed,attempt,audit,proof:p,search:upper,replay,drags:upper?.drags??[],sourceAdaptation:'All27bodies and 9+13+5 cohort counts maintained; C4 main expands to50cells, five C10 micro cover one cell each, opening20cells. Shape/color redesign under1.107, inventory facts retain1ice22shell. Known gate counts0/1/3/8/9/10/19/24 unchanged.',formalAdopted:false});console.log(row.file);if(replay?.valid&&replay.complete&&replay.nonClearingDrags<=20&&p.thresholdProven)break;}
}
console.log(save('attempts',{started:new Date(start).toISOString(),elapsed:Date.now()-start,budget,log}));
