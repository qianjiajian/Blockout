import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pack,color,rngFor,shapes} from '../round3-c/author.mjs';
import {apiLoad,projection,replayBomb,audit,cleanBase} from '../round3-a/author.mjs';
import {searchSpatial} from '../../../remake111to120-spatial-floor-v147.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const OUT='deliverables/campaign121-130-v146-20260924/round3-root';
fs.mkdirSync(OUT,{recursive:true});
const save=(n,v)=>{const p=`${OUT}/${n}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});return p;};
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const api=await apiLoad();shapes.L4=[[0,0],[1,0],[2,0],[0,1]];
const source={frames:['0044','0051','0066','0104','0122'].map(n=>`.codex-temp/video-audit-101-134/121-130/frames-1fps/sec-${n}.jpg`),
 reviewed:{pieces:28,area:42,histogram:{S:18,H2:5,V2:3,L4:2},colors:['pink','blue','green','yellow','red','orange','cyan'],bombs:[{color:'blue',shape:'V2',seconds:60},{color:'pink',shape:'V2',seconds:60}],frozen:[['green',15],['yellow',17],['red',17],['orange',11],['cyan',11]],ordinary:['pink','blue']},
 corrections:['Opening frame44 has no numbers during intro; frame51 shows both bombs58 after2s.','Historical29 pieces,20singles,2V2 is incorrect:28 bodies,18singles,3V2 cover42cells. Cyan L4 is distinct from blue bomb.','Source actual mask has42cells; preserve baseline6x8 rectangle48. Frozen colors confirmed after thaw in104 and122.']};
source.bindings=Object.fromEntries(source.frames.map(p=>[p,digest(fs.readFileSync(p))]));const sourceFile=save('source122-reviewed',source);
const start=Number(process.argv[2]??0),count=Number(process.argv[3]??120),ms=Number(process.argv[4]??800),attempts=[];
let best=null;
for(let n=start;n<start+count;n++){
 const seed=172122000+n,rng=rngFor(seed),l=cleanBase(122,'normal');
 const kinds=[...Array(24).fill('S'),...Array(5).fill('H2'),...Array(3).fill('V2'),...Array(2).fill('L4')];
 // New source-faithful attempts first; later use the explicit shape mutation permission.
 if(n>=80){for(let i=0;i<kinds.length;i++)if(kinds[i]==='L4')kinds[i]=rng()<.5?'SQ':'L4';}
 l.blocks=pack(l.playable,kinds,rng,'r172-122');if(!l.blocks){attempts.push({seed,status:'pack-rejected'});continue;}
 const v=l.blocks.filter(b=>b.shape.length===2&&b.shape[1][1]===1);v[0].color='blue';v[0].timedBombSeconds=60;v[1].color='pink';v[1].timedBombSeconds=60;
 // The color allocator expects uncolored blocks; fixed bomb colors are restored by palette-constrained swapping below.
 delete v[0].color;delete v[1].color;
 if(!color(l.blocks,['blue','pink','green','orange','cyan','red','yellow'],rng,{blue:12,pink:12,green:1,orange:1,cyan:1,red:1,yellow:1})){attempts.push({seed,status:'color-rejected'});continue;}
 const bombBlue=l.blocks.find(b=>b.shape.length===2&&b.color==='blue'),bombPink=l.blocks.find(b=>b.shape.length===2&&b.color==='pink');
 if(!bombBlue||!bombPink){attempts.push({seed,status:'bomb-carrier-unavailable'});continue;}
 for(const b of l.blocks)delete b.timedBombSeconds;bombBlue.timedBombSeconds=60;bombPink.timedBombSeconds=60;
 const gate=(c,side,offset,size,frozen)=>({id:'r172-122-g-'+c,color:c,side,offset,size,...(frozen?{frozen}:{})});
 l.gates=[gate('green','top',1,3,15),gate('yellow','left',0,3,17),gate('orange','left',5,3,11),gate('red','right',0,3,17),gate('cyan','right',5,3,11),gate('pink','bottom',0,n%3===0?2:3),gate('blue','bottom',3,n%3===1?2:3)];
 let a;try{a=audit(l,api);}catch(e){attempts.push({seed,status:'static-rejected',error:e.message.slice(0,200)});continue;}
 const p=projection(l),s=searchSpatial(p,api,{floor:16,maxStates:60000,maxMilliseconds:ms,normalize:true,diagnosticTrace:true,orderSeed:n});
 const row={seed,levelSha256:digest(l),status:s.status,cost:s.cost,clears:s.maxClearsSeen,budgetMs:ms};attempts.push(row);
 if(s.status==='witness'){
  const replay=replayBomb(l,s.drags,api,true);row.replay=replay;
  if(replay.valid&&replay.complete){const proof=checkSymmetryFloor(p,{floor:11,maxStates:600000,maxMilliseconds:10000});
   const data={ruleVersion:lock.activeVersion,seed,sourceFile,level:l,levelSha256:digest(l),audit:a,drags:s.drags,replay,proof,deadlineProjection:{sourceHash:digest(l),projectedHash:digest(p),removed:l.blocks.filter(b=>b.timedBombSeconds).map(b=>({id:b.id,seconds:b.timedBombSeconds}))},designDifferences:['Source42cells adapted to preserved48cell baseline using6additional ordinary singles.','New packing and colors generated under171; known7unique gate colors/counts and both60s bombs retained. Bomb2cell carriers may be H2 or V2 under shape authorization.'],formalAdopted:false,pointerValidated:false};
   const file=save('candidate122',data);console.log(JSON.stringify({file,U:replay.nonClearingDrags,L11:proof.thresholdProven}));best=file;
   if(proof.thresholdProven&&replay.nonClearingDrags<=15)break;
  }
 }
 if(n%10===0)console.log(JSON.stringify(row));
}
console.log(JSON.stringify({file:save('attempts122',{ruleVersion:lock.activeVersion,start,count,ms,sourceFile,attempts,best}),best}));
