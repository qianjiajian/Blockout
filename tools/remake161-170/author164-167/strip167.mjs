import fs from 'node:fs';import{api,base,source,shapes,tile,recolor,recolorBag,rng,rect,save,audit,searchSpatial,project,digest}from'./common.mjs';import{prefixFloor}from'./floor-countdown.mjs';import{nativePrefixWitness}from'./native-witness167.mjs';import{checkAxisPrefixFloor}from'../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
const src=source(167),R=rng(Number(process.env.SEED??1671103)),rows=[],seen=new Set(),pool=JSON.parse(fs.readFileSync('deliverables/remake161-170-20260927/author164-167/pool167-1790518706451.json'));
function prefixProject(l){const p=project(l);p.shutters=p.shutters.filter(s=>s.skin!=='lift');p.blocks=p.blocks.filter(b=>!['liftTop','liftBottom'].includes(b.shutterId));return p;}
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??150);attempt++){
 const l=base(167),seed=R.state(),regions=[{x:0,y:1,width:7,height:4},{x:0,y:7,width:7,height:4}];l.shutters=[{id:'c15',...regions[0],count:15},{id:'c9',...regions[1],count:9},{id:'liftTop',...regions[0],count:1,skin:'lift'},{id:'liftBottom',...regions[1],count:1,skin:'lift'}];
 l.blocks=[{id:'p0-0',color:'red',shape:shapes[8],x:1,y:0},{id:'p0-1',color:'green',shape:shapes[1],x:3,y:0},{id:'p0-2',color:'purple',shape:shapes[8],x:4,y:0}];
 const ids=R.shuffle([8,8,8,1,1,1,1,1,1,1,1]),spec=ids.map((s,i)=>({id:'p0-'+(i+3),color:i<5?'blue':i<9?'yellow':'red',shape:shapes[s]}));const open=tile(spec,rect(0,5,7,2),{seed:R.state(),preferLarge:false,maxNodes:6000});R.random();if(!open)continue;const first=open.find(b=>b.x===0&&b.shape.length===2);if(!first||!recolorBag(open,{seed:R.state(),pins:{[first.id]:'blue'}}))continue;l.blocks.push(...open);let good=true,failure;
 const groups=[...src.curtains,...src.lifts];
 for(let phase=0;phase<4;phase++){const owner=l.shutters[phase],entries=pool[phase<2?'6-3':'5-2'].filter(a=>!a.some(p=>p.shapeId===19)),packed=entries[Math.floor(R.random()*entries.length)],bs=packed.map((b,i)=>({id:'p'+(phase+1)+'-'+i,color:groups[phase].pieces[i][0],shape:shapes[b.shapeId],x:owner.x+b.x,y:owner.y+b.y,shutterId:owner.id}));if(!recolor(bs,['red','yellow','green','blue','purple'],{seed:R.state(),filter:(b,c)=>(['blue','yellow'].includes(c)?Math.max(...b.shape.map(p=>p[1]))===0:true)&&(Math.max(...b.shape.map(p=>p[0]))<3||c==='green')})){good=false;failure='phase'+phase+' color';break;}l.blocks.push(...bs);R.random();}if(!good){rows.push({attempt,seed,status:'packing-rejected',failure});continue;}
 l.gates=[['blue','left',5,0],['yellow','left',6,5],['red','bottom',0,9],['purple','bottom',4,9],['green','right',7,15]].map(([color,side,offset,frozen])=>({id:color,color,side,offset,size:['blue','yellow'].includes(color)?1:3,...frozen?{frozen}:{}}));const sha=digest(l);if(seen.has(sha))continue;seen.add(sha);
 let check,proof,prefix,search,replay,error;
 try{check=audit(l);const p=prefixProject(l);proof=prefixFloor(p,{goalClears:5,floor:16,maxMilliseconds:600,maxStates:100000});if(proof.status==='relaxed-shortcut'&&proof.relaxedNonClearingDrags>=11&&proof.relaxedNonClearingDrags<=14){proof=prefixFloor(p,{goalClears:5,floor:11,maxMilliseconds:600,maxStates:100000});prefix=nativePrefixWitness(p,{goalClears:5,floor:16,maxMilliseconds:1500,maxStates:150000});if(prefix.drags&&api.replayRevisedRoute(l,prefix.drags).valid){search=searchSpatial(project(l),api,{initialDrags:prefix.drags,floor:18,maxMilliseconds:1800,maxStates:25000,maxTransitions:180000,normalize:true,orderSeed:attempt,diagnosticTrace:true});if(search.drags)replay=api.replayRevisedRoute(l,search.drags);}}}catch(e){error=e.message;}
 const row={attempt,seed,sha,status:proof?.status,lower:proof?.thresholdProven?11:proof?.relaxedNonClearingDrags,prefixCost:prefix?.relaxedNonClearingDrags,clears:search?.maxClearsSeen,U:replay?.nonClearingDrags,error};rows.push(row);console.log(JSON.stringify(row));if(proof?.thresholdProven){row.file=save('strip167',{level:l,drags:search?.drags??[],iteration:{attempt,seed},audit:check,proof,prefix,search,replay,sourceAdaptation:'All36 identities retained, curtain15/9 and spatial lift one hidden layer each. Both matching curtain/lift regions16→28, opening17→19 to fill original75. Each of4hidden cohorts full28. Source12irregular bodies minimally reduce2 to10/36; all shapes/colors original adaptation under1.103. Full witness retains all cohorts. Prefix5 excludes only inaccessible lifts behind complete curtain masks15/9.',formalAdopted:false});console.log(row.file);if(replay?.complete&&replay.nonClearingDrags<=15)break;}R.random();
}
console.log(save('strip167-attempts',rows));








