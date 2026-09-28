import fs from 'node:fs';import assert from 'node:assert/strict';
import {api,base,SHAPES,seededRng,rect,auditSpatial,digest,replay,ruleGate} from '../common.mjs';
import {paintQuota} from '../../author178-180/assist172/quota.mjs';
import {floorNative} from './native.mjs';import {witnessNative} from './native-witness.mjs';
ruleGate();const OUT='deliverables/remake171-180-20260927/author171-174/assist172',sourceFile='deliverables/remake171-180-20260927/author178-180/assist172/source172-pristine.json',source=JSON.parse(fs.readFileSync(sourceFile)),R=seededRng(Number(process.env.SEED??1726106)),began=Date.now(),budget=Number(process.env.BUDGET??120000),attempts=[];
const save=(stem,data)=>{const p=OUT+'/'+stem+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};let packed=0,valid=0,maxClears=0;const failures={axis:0,quota:0,start:0};SHAPES.R3=[...SHAPES.V3,...SHAPES.H3];SHAPES.R2=[...SHAPES.V2,...SHAPES.H2];
function compatible(b,g){const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1])),v=['top','bottom'].includes(g.side);return(v?w:h)<=g.size&&(!b.movementAxis||((b.movementAxis==='vertical')===v&&(v?b.x:b.y)>=g.offset&&(v?b.x+w:b.y+h)<=g.offset+g.size));}
function pack(spec,cells){const allowed=new Set(cells.map(p=>p.join(','))),reserved=new Map(spec.flatMap((b,i)=>b.forcedPos?SHAPES[b.kind][0].map(([x,y])=>[[b.forcedPos[0]+x,b.forcedPos[1]+y].join(','),i]):[])),used=new Set(),todo=R.shuffle(spec.map((s,i)=>({...s,sourceIndex:i}))),result=[];let nodes=0;
 function go(){if(++nodes>8000)return false;if(!todo.length)return used.size===allowed.size;const cell=[...allowed].find(c=>!used.has(c)).split(',').map(Number),tried=new Set();for(let i=0;i<todo.length;i++){const b=todo[i],sig=JSON.stringify([b.kind,b.movementAxis,b.forcedPos,Boolean(b.layers)]);if(tried.has(sig))continue;tried.add(sig);for(const shape of R.shuffle([...SHAPES[b.kind]]))for(const anchor of R.shuffle([...shape])){const x=cell[0]-anchor[0],y=cell[1]-anchor[1],points=shape.map(([a,z])=>[x+a,y+z].join(','));if(b.forcedPos&&(x!==b.forcedPos[0]||y!==b.forcedPos[1])||points.some(p=>!allowed.has(p)||used.has(p)||reserved.has(p)&&reserved.get(p)!==b.sourceIndex))continue;points.forEach(p=>used.add(p));todo.splice(i,1);result.push({...b,x,y,shape});if(go())return true;result.pop();todo.splice(i,0,b);points.forEach(p=>used.delete(p));}}return false;}return go()?result:null;
}
for(let attempt=0;Date.now()-began<budget;attempt++){
 const l=base(172);l.shutters=[{id:'own172-cover13',x:0,y:5,width:3,height:5,count:13}];
 const portConfig=[['cyan','top',1,3],['purple','bottom',4,2],['green','left',8,3],['blue','left',1,3],['pink','right',1,3],['yellow','left',4,3],['red','right',4,3],['orange','bottom',1,3]];
 l.gates=portConfig.map(([color,side,offset,size],i)=>({...source.gates.find(g=>g.color===color),id:'own172-g'+i,side,offset,size}));
 const opening=source.opening.map((b,i)=>({...b,kind:i<6?'SQ2':i<13?'R3':'R2'}));
 // Six squares, seven three-cell rectangles and ten dominoes =65 cells.
 opening[5].forcedPos=[5,1];opening[5].forcedColor='pink';
 for(const i of [13,18])opening[i].kind='V2';opening[15].kind='H2';
 // Shell indices0/1/20 keep their two layers. All square shell artwork is native.
 const hidden=source.curtain.pieces.map((b,i)=>({...b,kind:i===1?'V2':i===8?'H2':i===9?'L3':'SINGLE',shutterId:l.shutters[0].id}));
 for(const b of[...opening,...hidden]){delete b.shape;delete b.x;delete b.y;}
 const s=l.shutters[0],cover=rect(s.width,s.height).map(([x,y])=>[x+s.x,y+s.y]),covered=new Set(cover.map(p=>p.join(','))),ob=pack(opening,l.playable.filter(p=>!covered.has(p.join(',')))),hb=pack(hidden,cover);
 if(!ob||!hb)continue;packed++;const mapping=[];l.blocks=[...ob,...hb].map(b=>{const stage=b.shutterId?'hidden':'opening',id='own172-'+stage+'-'+b.sourceIndex;mapping.push({stage,sourceIndex:b.sourceIndex,candidateId:id,source:(stage==='hidden'?source.curtain.pieces:source.opening)[b.sourceIndex]});const{kind,sourceIndex,...out}=b;return{...out,id};});
 if(l.blocks.some(b=>b.movementAxis&&!l.gates.some(g=>compatible(b,g)))){failures.axis++;continue;}
 if(!paintQuota(l,R)){failures.quota++;if(failures.quota===1)save('first-quota-reject',{level:l,mapping});continue;}l.blocks=l.blocks.map(({forcedPos,forcedColor,...b})=>b);
 const m=new api.PuzzleModel(l);if(!m.snapshot().blocks.some(b=>m.isBlockActive(m.getBlock(b.id))&&m.possibleExitSides(m.getBlock(b.id)).length)){failures.start++;continue;}
 let spatial,search,rr,proof;const fingerprint=digest(l);
 try{spatial=auditSpatial(l,api);valid++;search=witnessNative(l,api,{floor:21,maxMilliseconds:900,maxStates:90000});if(search.status==='witness')rr=replay(l,search.drags,api,{complete:true,requirePointerCompatible:true});}
 catch(e){attempts.push({attempt,fingerprint,error:e.message});continue;}
 const row={attempt,fingerprint,status:search.status,clears:search.maxClearsSeen??search.maxClears,U:rr?.nonClearingDrags};attempts.push(row);
 if((row.clears??0)>maxClears){maxClears=row.clears;console.log(JSON.stringify({attempt,packed,valid,maxClears}));save('progress-compact',{level:l,search,mapping});}
 if(rr?.complete){if(rr.nonClearingDrags>=16&&rr.nonClearingDrags<=20){proof=floorNative(l,api,{goalClears:13,maxMilliseconds:1000,maxStates:100000});if(!proof.thresholdProven)proof=floorNative(l,api,{maxMilliseconds:2000,maxStates:150000});}else proof={status:'upper-below-band',thresholdProven:false};row.proof=proof.status;const file=save(proof.thresholdProven?'candidate172':'unverified-compact',{level:l,drags:search.drags,proof,search,replay:rr,audit:spatial,mapping,sourceFile,sourceSha256:digest(fs.readFileSync(sourceFile)),ruleVersion:'1.106.0',adaptation:'Compact5x3 true cover with11 known bodies;65-cell opening23 bodies. Preserve6 bound shells,4 bound axes,cover13,34 inventory and retained7icevalues. Source colors/shapes are authored under106; lime15 gate removed only as known8palette conflict.'});console.log(JSON.stringify({file,U:rr.nonClearingDrags,proof:proof.status}));if(proof.thresholdProven)break;}
 if(valid%20===0)console.log(JSON.stringify({attempt,packed,valid,elapsed:Date.now()-began}));
}
console.log(JSON.stringify({packed,valid,maxClears,failures,log:save('attempts-compact',{budget,elapsed:Date.now()-began,packed,valid,maxClears,failures,attempts})}));
