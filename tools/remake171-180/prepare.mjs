import fs from 'node:fs';
import assert from 'node:assert/strict';
const from='tools/remake161-170',to='tools/remake171-180';
fs.mkdirSync(to,{recursive:true});
for(const name of ['common.mjs','replay.mjs','observed-timing.mjs','browser.mjs','index.html','pointer.mjs']){
 let s=fs.readFileSync(from+'/'+name,'utf8');
 s=s.replaceAll('remake161-170','remake171-180').replaceAll('161–170','171–180');
 if(name==='common.mjs')s=s.replace('(_,i)=>161+i','(_,i)=>171+i').replace("r.version==='1.103.0'","r.version==='1.106.0'").replace("sourceAudit:'deliverables/remake171-180-v146-20260924/source-audit/SOURCE-REVIEW.md'","sourceAudit:null,sourceStatus:'fresh per-author video review pending'");
 if(name==='browser.mjs')s=s.replace('id<161||id>170','id<171||id>180');
 if(name==='pointer.mjs')s=s.replace('id===161+i','id===171+i');
 assert(!s.includes('remake161-170'));
 fs.writeFileSync(to+'/'+name,s,{flag:'wx'});
}
console.log('171–180 isolated baseline/static/replay/Pointer tools prepared; validation pending.');
