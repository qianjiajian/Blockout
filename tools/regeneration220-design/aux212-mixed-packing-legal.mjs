import fs from 'node:fs';
import {loadSpatialApi,compileSpatial} from '../continuation211-optional-lift-domain.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {nativeWitness64} from '../regeneration212-design/native-witness212-guided.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency} from '../regeneration212-design/design212.mjs';
const out='deliverables/continue211-220-20260930/design220-new/aux212-mixed-packing-legal';fs.mkdirSync(out,{recursive:true});
const api={...await loadSpatialApi(),...(await loadApi()).api},core=await loadContinuationRuntime();
let seed=220212303;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),pick=a=>a[Math.floor(rnd()*a.length)];
const baseFile='deliverables/continue211-220-20260930/design212-new/source212-grid/q3redVb55prefix212-6.json',base=JSON.parse(fs.readFileSync(baseFile));
const shapes=[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[0,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]]].filter(s=>core.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const playable=Array.from({length:63},(_,p)=>[p%7,Math.floor(p/7)]).filter(([x,y])=>!((x===0||x===6)&&(y===3||y===4))),cells=new Set(playable.map(([x,y])=>7*y+x)),outside=new Set([...cells].filter(p=>p>=14&&!(p%7<=1&&p>=49))),mask=ps=>ps.reduce((m,p)=>m|1n<<BigInt(p),0n),outsideMask=mask([...outside]);
const placements=[];for(const shape of shapes)for(const p of outside){const coords=shape.map(([x,y])=>[p%7+x,Math.floor(p/7)+y]);if(coords.every(([x,y])=>x<7&&y<9&&outside.has(y*7+x))){const ps=coords.map(([x,y])=>y*7+x);placements.push({x:p%7,y:Math.floor(p/7),shape,ps,mask:mask(ps)});}}
const icePlacements=[...outside].filter(p=>p%7<6&&outside.has(p+1)).map(p=>({x:p%7,y:Math.floor(p/7),shape:[[0,0],[1,0]],ps:[p,p+1],mask:mask([p,p+1])}));
const geometries=[],seen=new Set(),start=Date.now();let attempts=0;
for(;attempts<1500000&&geometries.length<36&&Date.now()-start<20000;attempts++){
 const ice=pick(icePlacements),cold=[];let occ=ice.mask,failed=false;
 for(let i=0;i<7;i++){let found;for(let q=0;q<35;q++){const p=pick(placements);if(!(p.mask&occ)){found=p;break;}}if(!found){failed=true;break;}cold.push(found);occ|=found.mask;}
 if(failed)continue;const available=new Set([...outside].filter(p=>!(occ&1n<<BigInt(p)))),blue=[];
 while(available.size){const p=available.values().next().value,q=[p];available.delete(p);for(let i=0;i<q.length;i++)for(const n of[q[i]%7?q[i]-1:-1,q[i]%7<6?q[i]+1:-1,q[i]-7,q[i]+7])if(available.delete(n))q.push(n);blue.push(q);}
 if(blue.length<9||blue.length>11||blue.some(c=>c.length>6)||!blue.some(c=>c.length===6))continue;
 const body=(id,ps,color,extra={})=>{const x=Math.min(...ps.map(p=>p%7)),y=Math.min(...ps.map(p=>Math.floor(p/7)));return{id,x,y,color,shape:ps.map(p=>[p%7-x,Math.floor(p/7)-y]),...extra};};
 const blocks=[...cold.map((p,i)=>body('mixed-cold-'+i,p.ps,'green')),body('mixed-ice11',ice.ps,'red',{frozen:11}),...blue.map((p,i)=>body('mixed-blue-'+i,p,'blue'))];if(!blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0))continue;
 const irr=blocks.filter(b=>Math.max(...b.shape.map(p=>p[0]))+1>0&&b.shape.length!==(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1)).length+1;if(irr>(blocks.length+8)*.3)continue;
 const geometry=sha256(blocks.map(b=>({x:b.x,y:b.y,shape:b.shape,color:b.color,frozen:b.frozen})));if(seen.has(geometry))continue;seen.add(geometry);
 let colors;for(let t=0;t<350;t++){for(const b of blocks.slice(0,7))b.color=pick(Math.max(...b.shape.map(p=>p[1]))>=2?['green']:['red','yellow','green']);if(adjacency(blocks).length)continue;const counts=c=>blocks.filter(b=>b.color===c).length;if(counts('blue')+5+counts('yellow')<16||blocks.length+8-(counts('green')+1)<19)continue;colors=blocks.slice(0,7).map(b=>b.color);break;}if(!colors)continue;
 geometries.push({geometry,blocks,attempt:attempts,blueComponents:blue.length});
}
fs.writeFileSync(out+'/geometries.json',JSON.stringify({attempts,milliseconds:Date.now()-start,geometries},null,2),{flag:'wx'});console.log(JSON.stringify({attempts,geometries:geometries.length,milliseconds:Date.now()-start}));
const history=[];
for(const [index,g]of geometries.entries()){
 const level=structuredClone(base.level);level.playable=playable;level.blocks=[...level.blocks.filter(b=>b.shutterId==='l212-cover10'),...g.blocks,{id:'mixed-small-blue',color:'blue',x:0,y:7,shape:[[0,0],[1,0],[0,1],[1,1]],shutterId:'l212-cover1'}];level.coloredGrids[0].cells=[[5,0],[6,0]];
 delete level.mechanismAdaptation.sourceFactsFile;level.mechanismAdaptation.change='Actual mixed packing original59cell family witha realinitialblueR2x3orR3x2body. Source56/32 vs authored '+level.blocks.length+' bodies. Seven native ordinary cold rectangles/L/T shapes, numericredH2ice11, '+g.blueComponents+' separate blue components; smallcount1 coverfilledblueQ2, topcount10 full14 hidden7includingblueH2bomb40. Two bluefloor cells relocated to5,0/6,0. Source two shells removed forcolored-floor conflict. Ordinary shape/color/layout differences explicitly authored; gate ice19/16/11 unchanged.';
 const gates=[];for(const side of['right','bottom'])for(let offset=0;offset<9;offset++)for(const size of[2,3]){const origin=side==='right'?[6,offset]:[offset,8],valid=Array.from({length:size},(_,i)=>[origin[0]+(side==='bottom'?i:0),origin[1]+(side==='right'?i:0)]).every(([x,y])=>x<7&&y<9&&cells.has(y*7+x));if(!valid)continue;if(level.blocks.filter(b=>b.color==='blue').some(b=>Math.max(...b.shape.map(p=>p[side==='bottom'?0:1]))-Math.min(...b.shape.map(p=>p[side==='bottom'?0:1]))+1>size))continue;const l=structuredClone(level),gate=l.gates.find(a=>a.color==='blue');Object.assign(gate,{side,offset,size});const m=new api.PuzzleModel(l);let first=0;for(const b of m.snapshot().blocks)if(!b.shutterId&&b.color==='blue'&&m.possibleExitSides(m.getBlock(b.id)).length)first+=b.shape.length;if(first)gates.push({side,offset,size,first});}
 gates.sort((a,b)=>b.first-a.first||a.size-b.size);if(!gates.length||gates[0].first<5){history.push({index,status:'NO_INITIAL_BLUE_EXIT'});continue;}Object.assign(level.gates.find(a=>a.color==='blue'),gates[0]);delete level.gates.find(a=>a.color==='blue').first;
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:[undefined,'l212-cover10','l212-cover1'].flatMap(id=>adjacency(level.blocks.filter(b=>b.shutterId===id))),mechanism:core.auditRevisedMechanismContract(level)};
 const packet={level,levelSha256:sha256(level),parentSource:baseFile,geometry:g.geometry,gateChoice:gates[0],audit,budget:{witnessMilliseconds:3000,lowerMilliseconds:6000,lowerStates:2000000},formalAccepted:false};
 if(audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length){const projection=structuredClone(level);projection.blocks.forEach(b=>delete b.timedBombSeconds);packet.projection=projection;const c=compileSpatial(projection,api);packet.staticBlocked=c.blocks.filter(b=>!b.poses.some(p=>p?.exits[0].length)).map(b=>b.id);if(!packet.staticBlocked.length){try{packet.upper=nativeWitness64(projection,api,{floor:21,maxMilliseconds:3000,maxStates:350000});if(packet.upper.drags){packet.drags=packet.upper.drags;packet.replay=replay(level,packet.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15)packet.lower=runNativeLift(liftPayload(projection,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);}}catch(e){packet.error=e.stack;}}}
 fs.writeFileSync(out+'/candidate-'+index+'.json',JSON.stringify(packet,null,2),{flag:'wx'});const row={index,N:level.blocks.length,blue:g.blueComponents,gate:gates[0],blocked:packet.staticBlocked,U:packet.replay?.nonClearingDrags,max:packet.upper?.maxClearsSeen,L:packet.lower?.status,frontier:packet.lower?.frontierCost,error:packet.error};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven)break;
}
fs.writeFileSync(out+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});
