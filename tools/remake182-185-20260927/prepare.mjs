import fs from 'node:fs';
import assert from 'node:assert/strict';
const dst='tools/remake182-185-20260927';
let common=fs.readFileSync('tools/remake161-170/common.mjs','utf8')
 .replaceAll('remake161-170-20260927','remake182-185-20260927')
 .replace('Object.freeze(Array.from({length:10},(_,i)=>161+i))','Object.freeze([182,185])')
 .replaceAll("'1.103.0'","'1.107.0'").replaceAll('161–170','182/185').replaceAll('other190Sha256','other198Sha256');
assert(common.includes('Object.freeze([182,185])'));
for(const [name,content] of Object.entries({'common.mjs':common,'replay.mjs':fs.readFileSync('tools/remake161-170/replay.mjs','utf8'),'observed-timing.mjs':fs.readFileSync('tools/remake161-170/observed-timing.mjs','utf8')}))fs.writeFileSync(dst+'/'+name,content,{flag:'wx'});
let pointer=fs.readFileSync('tools/remake161-170/pointer.mjs','utf8').replaceAll('tools/remake161-170',dst)
 .replace("requestedIds.length===10&&[...requestedIds].sort((a,b)=>a-b).every((id,i)=>id===161+i)","requestedIds.length===2&&[...requestedIds].sort((a,b)=>a-b).every((id,i)=>id===[182,185][i])")
 .replaceAll('complete-ten-level-remake-batch','complete-two-level-remake-batch');
fs.writeFileSync(dst+'/pointer.mjs',pointer,{flag:'wx'});
let browser=fs.readFileSync('tools/remake161-170/browser.mjs','utf8').replace('id<161||id>170','![182,185].includes(id)');
assert(browser.includes('![182,185].includes(id)'));
fs.writeFileSync(dst+'/browser.mjs',browser,{flag:'wx'});
fs.writeFileSync(dst+'/index.html',fs.readFileSync('tools/remake161-170/index.html','utf8').replaceAll('161–170','182/185').replaceAll('tools/remake161-170',dst),{flag:'wx'});
