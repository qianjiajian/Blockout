import fs from 'node:fs';
import {loadSpatialApi,compileSpatial} from '../continuation211-optional-lift-domain.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {nativeWitness64} from '../regeneration212-design/native-witness212-guided.mjs';
import {prefixPayload,runPrefix} from '../regeneration212-design/native-prefix212.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency} from '../regeneration212-design/design212.mjs';
const out='deliverables/continue211-220-20260930/design220-new/aux212-compact20';fs.mkdirSync(out,{recursive:true});
const api={...await loadSpatialApi(),...(await loadApi()).api},core=await loadContinuationRuntime();
let seed=220212730;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),pick=a=>a[Math.floor(rnd()*a.length)];
const baseFile='deliverables/continue211-220-20260930/design220-new/aux212-mixed-extra-blue/candidate-1.json',base=JSON.parse(fs.readFileSync(baseFile));
const shapes=[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[0,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[2,0]],[[0,0],[1,0]],[[0,0],[0,1]]].filter(s=>core.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const playable=Array.from({length:63},(_,p)=>[p%7,Math.floor(p/7)]).filter(([x,y])=>y<2||(y===2||y>=6?x>=1&&x<=5:x>=2&&x<=4));
const small={x:1,y:7},cells=new Set(playable.map(([x,y])=>7*y+x)),outside=new Set([...cells].filter(p=>p>=14&&!(p%7>=small.x&&p%7<small.x+2&&Math.floor(p/7)>=small.y))),mask=ps=>ps.reduce((m,p)=>m|1n<<BigInt(p),0n);
const placements=[];for(const shape of shapes)for(const p of outside){const coords=shape.map(([x,y])=>[p%7+x,Math.floor(p/7)+y]);if(coords.every(([x,y])=>x<7&&y<9&&outside.has(y*7+x))){const ps=coords.map(([x,y])=>y*7+x);placements.push({x:p%7,y:Math.floor(p/7),shape,ps,mask:mask(ps)});}}
const icePlacements=[...outside].filter(p=>p%7<6&&outside.has(p+1)).map(p=>({x:p%7,y:Math.floor(p/7),shape:[[0,0],[1,0]],ps:[p,p+1],mask:mask([p,p+1])}));
const geometries=[],seen=new Set(),start=Date.now();let attempts=0;
for(;attempts<2000000&&geometries.length<24&&Date.now()-start<20000;attempts++){
 const ice=pick(icePlacements),cold=[];let occ=ice.mask,failed=false;
 for(let i=0;i<3;i++){let found;for(let q=0;q<30;q++){const p=pick(placements);if(!(p.mask&occ)){found=p;break;}}if(!found){failed=true;break;}cold.push(found);occ|=found.mask;}
 if(failed)continue;const available=new Set([...outside].filter(p=>!(occ&1n<<BigInt(p)))),blue=[];
 while(available.size){const p=available.values().next().value,q=[p];available.delete(p);for(let i=0;i<q.length;i++)for(const n of[q[i]%7?q[i]-1:-1,q[i]%7<6?q[i]+1:-1,q[i]-7,q[i]+7])if(available.delete(n))q.push(n);blue.push(q);}
 if(blue.length<9||blue.length>10||blue.some(c=>c.length>6))continue;
 const body=(id,ps,color,extra={})=>{const x=Math.min(...ps.map(p=>p%7)),y=Math.min(...ps.map(p=>Math.floor(p/7)));return{id,x,y,color,shape:ps.map(p=>[p%7-x,Math.floor(p/7)-y]),...extra};};
 const blocks=[...cold.map((p,i)=>body('compact-cold-'+i,p.ps,'red')),body('compact-ice11',ice.ps,'red',{frozen:11}),...blue.map((p,i)=>body('compact-blue-'+i,p,'blue'))];if(!blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0))continue;
 const geometry=sha256(blocks.map(b=>({x:b.x,y:b.y,shape:b.shape,color:b.color,frozen:b.frozen})));if(seen.has(geometry))continue;seen.add(geometry);
 let colors;for(let t=0;t<50;t++){for(const b of blocks.slice(0,3))b.color=pick(['red','yellow']);if(adjacency(blocks).length)continue;const counts=c=>blocks.filter(b=>b.color===c).length;if(counts('blue')+4+counts('yellow')<16)continue;colors=blocks.slice(0,3).map(b=>b.color);break;}if(!colors)continue;
 geometries.push({geometry,blocks,attempt:attempts,blueComponents:blue.length});
}
fs.writeFileSync(out+'/geometries.json',JSON.stringify({attempts,milliseconds:Date.now()-start,playable,geometries},null,2),{flag:'wx'});console.log(JSON.stringify({attempts,N:geometries.length,area:playable.length}));
const history=[];
for(const [index,g]of geometries.entries()){
 const level=structuredClone(base.level);level.playable=playable;const top=(id,x,y,n,color,bomb=false)=>({id,color,x,y,shape:Array.from({length:n},(_,i)=>[i,0]),shutterId:'l212-cover10',...(bomb?{timedBombSeconds:40}:{})});
 level.blocks=[top('compact-top-a',0,0,2,'red'),top('compact-top-b',2,0,2,'yellow'),top('compact-top-c',4,0,3,'green'),top('compact-top-d',0,1,3,'blue'),top('compact-top-e',3,1,2,'red'),top('compact-top-bomb',5,1,2,'blue',true),...g.blocks,{id:'compact-small-blue',color:'blue',...small,shape:[[0,0],[1,0],[0,1],[1,1]],shutterId:'l212-cover1'}];Object.assign(level.shutters.find(s=>s.id==='l212-cover1'),small);level.coloredGrids[0].cells=[[5,1],[6,1]];
 level.mechanismAdaptation.change='New original 7x9 symmetric 43-cell outline with three-cell neck. Top ordinary count10 cover retains full14 cells as six authored horizontal bodies including real blueH2bomb40; smallcount1 fullblueQ2. Three cold shapes, real redH2ice11 and '+g.blueComponents+' separate blue components make '+level.blocks.length+' complete bodies. Source56/32 separately preserved in source ledger, source shells removed only for v1.11 colored-floor conflict. Two bluefloor cells re-layout5,1/6,1. Gate ice19/16/11 preserved; blue gate needs3-cell mouth for authored H3.';
 Object.assign(level.gates.find(a=>a.color==='yellow'),{portals:[{origin:[1,6],size:2}]});
 const gates=[];for(const side of['right','bottom'])for(let offset=1;offset<7;offset++){const size=3,origin=side==='right'?[5,offset]:[offset,8],valid=Array.from({length:size},(_,i)=>[origin[0]+(side==='bottom'?i:0),origin[1]+(side==='right'?i:0)]).every(([x,y])=>x<7&&y<9&&cells.has(y*7+x)&&!cells.has((y+(side==='bottom'?1:0))*7+x+(side==='right'?1:0)));if(!valid)continue;const l=structuredClone(level),gate=l.gates.find(a=>a.color==='blue');Object.assign(gate,{side,offset,size,portals:[{origin,size}]});const m=new api.PuzzleModel(l);let first=0;for(const b of m.snapshot().blocks)if(!b.shutterId&&b.color==='blue'&&m.possibleExitSides(m.getBlock(b.id)).length)first+=b.shape.length;if(first)gates.push({side,offset,size,portals:[{origin,size}],first});}
 gates.sort((a,b)=>b.first-a.first);if(!gates.length){history.push({index,status:'NO_INITIAL_BLUE_EXIT'});continue;}Object.assign(level.gates.find(a=>a.color==='blue'),gates[0]);delete level.gates.find(a=>a.color==='blue').first;
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:[undefined,'l212-cover10','l212-cover1'].flatMap(id=>adjacency(level.blocks.filter(b=>b.shutterId===id))),mechanism:core.auditRevisedMechanismContract(level)};
 const packet={level,parent:baseFile,index,levelSha256:sha256(level),audit,formalAccepted:false};
 if(audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length){try{const plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);packet.projection=plan;const c=compileSpatial(plan,api);packet.staticBlocked=c.blocks.filter(b=>!b.poses.some(p=>p?.exits[0].length)).map(b=>b.id);if(!packet.staticBlocked.length){packet.upper=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000});if(packet.upper.drags){packet.drags=packet.upper.drags;packet.replay=replay(level,packet.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){level.preservedMoveTarget=packet.replay.effectiveDrags;plan.preservedMoveTarget=packet.replay.effectiveDrags;packet.levelSha256=sha256(level);packet.replay=replay(level,packet.drags,api,{timed:true,complete:true,requirePointerCompatible:true});packet.lower=runNativeLift(liftPayload(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);}}}}catch(e){packet.error=e.stack;}}
 fs.writeFileSync(out+'/candidate-'+index+'.json',JSON.stringify(packet,null,2),{flag:'wx'});const row={index,N:level.blocks.length,gate:gates[0],blocked:packet.staticBlocked,U:packet.replay?.nonClearingDrags,max:packet.upper?.maxClearsSeen,L:packet.lower?.status,frontier:packet.lower?.frontierCost,error:packet.error};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven)break;
}
fs.writeFileSync(out+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});
