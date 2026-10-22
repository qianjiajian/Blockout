import fs from 'node:fs';
import {ROOT,PROFILE,ruleGate,loadApi,audit,digest,replay,rect} from './common.mjs';
import {searchSpatial} from '../regeneration211-design/fifo-witness214.mjs';
import {fifoPayload,runNativeFifo} from './author235-native.mjs';
ruleGate(); const {api}=await loadApi(),out=ROOT+'/author235';fs.mkdirSync(out,{recursive:true});
const begin=Number(process.argv[2]??1),count=Number(process.argv[3]??60),run=out+`/run-${begin}-${Date.now()}`;fs.mkdirSync(run);
const native=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
function rng(seed){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const touch=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(x+a.x-u-b.x)+Math.abs(y+a.y-v-b.y)===1));
function make(seed){
 const rand=rng(seed),sh=a=>a.map(v=>({v,r:rand()})).sort((a,b)=>a.r-b.r).map(o=>o.v);
 const blocks=[];let p=0;for(const y of [0,3,6])for(const x of [0,4])blocks.push({id:'l235-v'+p++,x,y,shape:native[14]});
 for(const x of [0,4])blocks.push({id:'l235-v'+p++,x,y:9,shape:native[9]});
 for(const y of [0,3,6])blocks.push({id:'l235-v'+p++,x:3,y,shape:native[3]});blocks.push({id:'l235-v'+p++,x:3,y:9,shape:native[1]});
 const colors=['red','blue','yellow','purple','green','orange','pink'];
 for(const b of blocks){b.color=sh(colors).find(color=>!blocks.some(a=>a!==b&&a.color===color&&touch(a,b)));}
 // The first free red carrier is deliberately present; other opening colors
 // and gate positions vary, and every independent layout is audited fresh.
 blocks[0].color='red';if(blocks.some((b,i)=>i&&b.color==='red'&&touch(blocks[0],b)))return null;
 const hiddenColors=['green','blue','green','yellow','red','green','purple','red','red','orange','pink','yellow'];
 const hiddenShapes=[8,8,7,2,9,9,7,8,1,7,14,7];
 const items=hiddenShapes.map((s,i)=>({id:'l235-h'+i,color:hiddenColors[i],shape:native[s],shutterId:'lift'}));
 const legal=rect(5,8).map(([x,y])=>[x+1,y+1]),allowed=new Set(legal.map(c=>c.join(','))),used=new Set(),occ=new Set(),placed=[];let budget=15000;
 function fill(){if(--budget<0)return false;if(used.size===items.length)return true;const at=legal.find(c=>!occ.has(c.join(',')));for(const i of sh(items.map((_,i)=>i).filter(i=>!used.has(i)))){const b=items[i];for(const [dx,dy]of b.shape){const a={...b,x:at[0]-dx,y:at[1]-dy};if(!a.shape.every(([x,y])=>allowed.has([x+a.x,y+a.y].join(','))&&!occ.has([x+a.x,y+a.y].join(',')))||placed.some(b=>b.color===a.color&&touch(a,b)))continue;used.add(i);placed.push(a);a.shape.forEach(([x,y])=>occ.add([x+a.x,y+a.y].join(',')));if(fill())return true;used.delete(i);placed.pop();a.shape.forEach(([x,y])=>occ.delete([x+a.x,y+a.y].join(',')));}}return false;}
 if(!fill())return null;blocks.push(...placed);
 const specs=[{id:'topLeft',side:'top',offset:0,spawn:[0,0],colors:['green','yellow','orange','green','yellow'],shapes:[4,10,10,6,6]},{id:'topRight',side:'top',offset:4,spawn:[4,0],colors:['green','purple','orange','blue','green'],shapes:[3,12,10,3,10]},{id:'left',side:'left',offset:3,spawn:[0,3],colors:['purple','pink','orange','purple','pink'],shapes:[9,12,19,14,10]}];
 const generators=specs.map(g=>{const ids=g.colors.map((color,i)=>{const id='l235-q-'+g.id+'-'+i;let shape=native[g.shapes[i]];if(g.side==='top'&&!shape.some(([x,y])=>x===1&&y===0))shape=shape.map(([x,y])=>[x+1,y]);if(g.side==='left'&&!shape.some(([x,y])=>x===0&&y===1))shape=shape.map(([x,y])=>[x,y+1]);blocks.push({id,color,shape,x:g.spawn[0],y:g.spawn[1]});return id;});return{id:g.id,side:g.side,offset:g.offset+1,rimSpan:3,rimMount:'rim',size:3,spawn:g.spawn,queueBlockIds:ids};});
 const frozen=sh([['yellow',1],['pink',2],['purple',3],['orange',3],['green',4]]),slots=sh([['bottom',0],['left',6],['right',0],['right',3],['right',6]]);
 const gates=[{id:'red',color:'red',side:'left',offset:0,size:3},{id:'blue',color:'blue',side:'bottom',offset:4,size:3},...frozen.map(([color,frozen],i)=>({id:color,color,frozen,side:slots[i][0],offset:slots[i][1],size:3}))];
 return{id:235,name:'三机·升降补给',difficulty:'easy',timeSeconds:105,reward:200,parMoves:49,preservedMoveTarget:49,mechanismRules:PROFILE,width:7,height:10,blocks,gates,generators,shutters:[{id:'lift',x:1,y:1,width:5,height:8,count:0,skin:'lift'}],designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:5,calibratedDifficulty:5},mechanismAdaptation:{sourceReference:ROOT+'/source/source-facts.json',change:'保7×10、三台各5个完整后续FIFO及顺序颜色、12体5×8满铺升降层、五冰门1/2/3/3/4。源开局仅3体11格，按满铺必要适配为12体70格；源15/30异形超30%，隐藏4异形最小矩形化并调整一单格面积，保队列11异形，最终11/39。队列非原向L/T改为已有q0同类形，原向库存不删。出口全横截面3格、颜色唯一，普通块及布局原创。'}};
}
const rows=[];let accepted=null;
for(let seed=begin;seed<begin+count;seed++){
 const level=make(seed),row={seed};if(!level){row.status='TILING';rows.push(row);continue;}
 try{row.audit=audit(level,api);const cp=structuredClone(level);cp.mechanismRules='revised-2026-09-23-v1.4';row.route=searchSpatial(cp,api,{floor:11,maxMilliseconds:2500,maxStates:60000,maxTransitions:400000,normalize:true,orderSeed:seed%17,diagnosticTrace:true});row.status=row.route.status;
 if(row.route.status==='witness'){const rr=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=rr.nonClearingDrags;row.totalDrags=rr.effectiveDrags;if(row.U>=5){const{p}=fifoPayload(level,api,{floor:5,maxMilliseconds:6000,maxStates:300000});row.lower=runNativeFifo(p);row.status='LOWER_'+row.lower.status;if(row.lower.thresholdProven){level.preservedMoveTarget=row.totalDrags;accepted={level,drags:row.route.drags,row};}}else row.status='BELOW_BAND';}
 }catch(e){row.status='REJECTED';row.error=e.message;}
 fs.writeFileSync(run+`/candidate-${seed}.json`,JSON.stringify({level,row},null,2));rows.push(row);console.log(JSON.stringify({seed,status:row.status,U:row.U,clears:row.route?.maxClearsSeen,error:row.error}));if(accepted)break;
}
fs.writeFileSync(run+'/report.json',JSON.stringify({accepted,rows},null,2));console.log(JSON.stringify({run,accepted:!!accepted}));



