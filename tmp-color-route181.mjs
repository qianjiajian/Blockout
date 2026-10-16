import fs from 'node:fs';
import {build} from 'esbuild';
import {check181Floor} from './deliverables/remake181-190-v146-20260924/source181-185/validate181.mjs';
const code=`export {replayRevisedRoute,searchRevisedLevel} from './src/core/revisedLevelSearch.ts';`;
const b=await build({stdin:{contents:code,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const packet=JSON.parse(fs.readFileSync('deliverables/star-targets181-187-20260929/formal-packets/level181.json','utf8'));
const base=packet.level,drags=packet.drags,colors=['red','blue','cyan','green','pink','yellow','purple'];
const ids=['r147-181-open-red-v2','r147-181-open-blue-v2','r147-181-open-cyan-s2','r147-181-open-green-s'];
const noBombs=l=>{const x=structuredClone(l);for(const b of x.blocks)delete b.timedBombSeconds;return x;};
const rows=[];let complete=0,attempts=0;
function rec(level,tag){attempts++;const r=api.replayRevisedRoute(noBombs(level),drags);if(!r.valid||!r.complete)return;complete++;const row={tag,nonClearing:r.nonClearingDrags,drags:drags.length,clearEvents:r.clearEvents};rows.push(row);console.log(JSON.stringify(row));if(r.nonClearingDrags>=11&&r.nonClearingDrags<=15){const floor=check181Floor(level,{maxStates:70000,maxMilliseconds:5000});row.floor={status:floor.proof.status,thresholdProven:floor.proof.thresholdProven,explored:floor.proof.exploredStates,nonClearing:floor.proof.relaxedNonClearingDrags};if(floor.proof.thresholdProven){fs.writeFileSync(`deliverables/star-targets181-187-20260929/finite-181-20260930/route-color-${rows.length}.json`,JSON.stringify({source:'formal-packets/level181.json',tag,level,drags,replay:r,floor},null,2)+'\n');process.exit(0);}}}
for(let mask=0;mask<(1<<(ids.length*2));mask++){
  const level=structuredClone(base);const chosen=[];
  for(let i=0;i<ids.length;i++){const b=level.blocks.find(x=>x.id===ids[i]);const a=colors[(mask>>(i*2))&3];const swap=(mask>>(i*2+1))&1;b.color=a;chosen.push(`${ids[i]}=${a}`);if(swap){const j=(i+1)%ids.length;const c=level.blocks.find(x=>x.id===ids[j]);[b.color,c.color]=[c.color,b.color];}}
  rec(level,chosen.join(','));
}
fs.writeFileSync('deliverables/star-targets181-187-20260929/finite-181-20260930/color-route-summary.json',JSON.stringify({attempts,complete,rows},null,2)+'\n');console.log(JSON.stringify({attempts,complete}));
