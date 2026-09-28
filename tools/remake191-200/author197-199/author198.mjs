import {api,base,shapes,tile,recolorBag,rng,rect,save,audit,searchSpatial,project,digest,lower} from './common.mjs';
const R=rng(Number(process.env.SEED??198108)),rows=[],start=Date.now(),max=Number(process.env.ATTEMPTS??100);let best=0;
for(let n=0;n<max;n++){
 const seed=R.state(),l=base(198);l.blocks.forEach((b,i)=>b.id='r108-198-b'+i);
 const full=process.env.FULL==='1',ice=full?[]:l.blocks.filter(b=>b.frozen),plain=full?l.blocks:l.blocks.filter(b=>!b.frozen);
 if(['2','3'].includes(process.env.ICE_REGION)){const cells=[[3,2,3],[3,5,3],[4,2,3],[4,5,3],[3,8,9],[3,9,9],[5,2,3],[5,5,3],[6,2,3],[6,5,3],[6,8,2]];if(process.env.ICE_REGION==='3'){[cells[6],cells[8]]=[cells[8],cells[6]];l.gates.find(g=>g.color==='green').offset=4;}const sorted=[...ice].sort((a,b)=>a.frozen-b.frozen);for(const [i,b]of sorted.entries()){b.x=cells[i][0];b.y=cells[i][1];b.shape=shapes[cells[i][2]];}if(!recolorBag(ice,{seed:R.state(),pins:process.env.ICE_REGION==='3'?{[sorted[6].id]:'green',[sorted[7].id]:'pink'}:{}}))continue;R.random();}
 else if(process.env.ICE_REGION==='1'){const packedIce=tile(ice,rect(3,2,4,8),{seed:R.state(),maxNodes:18000,preferLarge:false});R.random();if(!packedIce){rows.push({n,seed,status:'ice-packing-fail'});continue;}for(const b of packedIce)Object.assign(ice.find(a=>a.id===b.id),b);if(!recolorBag(ice,{seed:R.state()}))continue;R.random();}
 const cells=l.playable.filter(p=>!ice.some(b=>b.shape.some(([dx,dy])=>b.x+dx===p[0]&&b.y+dy===p[1])));
 // Frozen eleven retain their levels, stages and own footprints for this family;
 // recoloring/retiling unlocked carriers changes the playable schedule.
 if(process.env.DOMINO==='1'){const palette=[...Array(7).fill('red'),...Array(5).fill('blue'),...Array(4).fill('green'),...Array(3).fill('yellow')];for(const [i,b]of plain.entries()){b.shape=R.shuffle([shapes[2],shapes[8]])[0];b.color=palette[i];}}
 else if(n%4===0){for(const b of plain.filter(b=>b.shape.length===3))b.shape=R.shuffle([shapes[3],shapes[9]])[0];}
 const fixed=process.env.DOMINO==='1'?plain.filter(b=>!b.keyId&&!b.lockedBy).slice(0,2):[];for(const b of fixed)b.shape=shapes[8];
 const pins=Object.fromEntries(fixed.map((b,i)=>[b.id,[0,i*2]]));
 const packed=tile(plain,cells,{seed,maxNodes:10000,preferLarge:false,pins});if(!packed){rows.push({n,seed,status:'packing-fail'});continue;}
 const edge=packed.find(b=>b.x===0&&b.y<=2&&!b.lockedBy&&!b.frozen);if(!edge)continue;
 if(!recolorBag(packed,{seed:R.state(),pins:{[edge.id]:'red',...Object.fromEntries(fixed.map(b=>[b.id,'red']))}}))continue;R.random();l.blocks=[...ice,...packed];
 let check,s,rep,proof,error;
 try{check=audit(l);s=searchSpatial(project(l),api,{floor:Number(process.env.SEARCH_UPPER??30)+1,maxMilliseconds:1000,maxStates:16000,maxTransitions:200000,normalize:true,symmetry:true,diagnosticTrace:true,orderSeed:n%30});if(s.status==='witness'){rep=api.replayRevisedRoute(l,s.drags);if(rep.complete&&rep.nonClearingDrags>=21)proof=lower(l,{floor:21,maxMilliseconds:1800,maxStates:200000});}}catch(e){error=e.message;}
 const row={n,seed,sha:digest(l),status:s?.status??'static-reject',U:rep?.nonClearingDrags,clears:s?.maxClearsSeen,L:proof?.status,error};rows.push(row);
 if((s?.maxClearsSeen??0)>best||rep?.complete){best=Math.max(best,s?.maxClearsSeen??0);row.file=save(rep?.complete?'candidate198':'partial198',{ruleVersion:'1.108.0',level:l,levelSha256:digest(l),audit:check,search:s,replay:rep,proof,drags:s.drags??[],iteration:{n,seed},budget:{searchMs:1000,proofMs:1800},sourceFile:'.codex-temp/remaining147-v110/late/source-review-198.json',sourceAdaptation:'30 native carriers; eleven ice-shell blocks exact initial4,12,13,13,15,23,31,33,35,37,39; two key/lock1 groups; seven frozen exits4/4/4/12/13/13/15. Four source ordinary mouths cannot coexist with7frozen in8 colors; prior minimum8gate adaptation preserved. Colors and native shapes adapted underv108, not exact source copy.'});console.log(JSON.stringify(row));}
 if(rep?.complete&&rep.nonClearingDrags<=30&&proof?.thresholdProven)break;
}
console.log(save('attempts198',{elapsedMs:Date.now()-start,rows}));
