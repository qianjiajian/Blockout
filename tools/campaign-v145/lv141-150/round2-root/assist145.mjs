import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadApi,auditDraft,projection} from '../../../remake141to150-v173.mjs';
import {searchSpatial} from '../../../remake111to120-spatial-floor-v147.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {payload,compile} from '../../lv131-140/root-native/native-axis-pruned.mjs';
import {typesOf,SOURCE} from '../round2-b/native-phase.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root/assist145';fs.mkdirSync(OUT,{recursive:true});
const {api}=await loadApi(),input='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b/candidate145-1790476097930-125.json',base=JSON.parse(fs.readFileSync(input)),stamp=Date.now(),rows=[];
const sourceHash=digest(fs.readFileSync(SOURCE)),exe=path.resolve(OUT,'phase-'+sourceHash.slice(0,16)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
let rng=1459173;const rnd=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;},shuffle=a=>a.map(x=>[rnd(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]),colors=['pink','yellow','red','blue','green'];
for(let n=0;n<100;n++){
 const level=structuredClone(base.level),hidden=shuffle(level.blocks.filter(b=>b.shutterId)),shellColors=shuffle(colors),outer=shellColors[0],inner=shellColors[1];
 for(let i=0;i<hidden.length;i++){const b=hidden[i];Object.assign(b,{x:i,y:6,shape:[[0,0],[0,1],[0,2]]});if(b.layers){b.color=outer;b.layers=[outer,inner];}else b.color=colors[Math.floor(rnd()*5)];}
 if(n>30){const b=shuffle(level.blocks.filter(b=>!b.shutterId&&!b.timedBombSeconds))[0],col=colors[Math.floor(rnd()*5)];if(!b.layers||b.layers[1]!==col){b.color=col;if(b.layers)b.layers[0]=col;}}
 try{auditDraft({level},api);}catch{continue;}const spatial=projection(level),r=searchSpatial(spatial,api,{maxMilliseconds:600,maxStates:20000,floor:20,normalize:true,weight:100,orderSeed:n%21});const row={n,levelSha256:digest(level),status:r.status,U:r.cost,clears:r.maxClearsSeen};
 if(r.drags){const s=shortenRoute(spatial,r.drags,api);row.U=s.replay.nonClearingDrags;if(s.replay.valid&&s.replay.complete&&row.U>=11&&row.U<=15){
  const file=OUT+'/candidate-'+stamp+'-'+n+'.json';fs.writeFileSync(file,JSON.stringify({level,drags:s.drags,replay:s.replay,input},null,2),{flag:'wx'});row.file=file;
  const p={...payload(spatial,api,{floor:11,maxStates:300000,maxMilliseconds:2000}),types:typesOf(compile(spatial,api))},ip=OUT+'/input-'+stamp+'-'+n+'.json',op=OUT+'/proof-'+stamp+'-'+n+'.json';fs.writeFileSync(ip,JSON.stringify(p),{flag:'wx'});execFileSync(exe,[path.resolve(ip),path.resolve(op)],{windowsHide:true,stdio:'pipe',timeout:12000});row.proof=JSON.parse(fs.readFileSync(op));if(row.proof.thresholdProven){rows.push(row);console.log(JSON.stringify(row));break;}
 }}rows.push(row);if(n%10===0||row.file)console.log(JSON.stringify(row));fs.writeFileSync(OUT+'/attempts-'+stamp+'.json',JSON.stringify(rows,null,2));
}
