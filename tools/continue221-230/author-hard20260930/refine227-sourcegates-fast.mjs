import fs from'node:fs';import crypto from'node:crypto';import{loadSpatialApi,searchSpatial}from'./grid-witness.mjs';import{replayTimed}from'./timed-replay.mjs';import{floor227}from'./fast-floor227.mjs';import{auditOpeningCoverage}from'../../revised-opening-coverage.mjs';import{auditHiddenCoverage}from'../../revised-hidden-coverage.mjs';
const out='deliverables/continue221-230-20260930/hard',api=await loadSpatialApi(),base=JSON.parse(fs.readFileSync(out+'/candidate-227-g1932.json'));let seed=427930;const R=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;},pick=a=>a[Math.floor(R()*a.length)],reports=[],seen=new Set();
for(let gen=2800;gen<3600;gen++){
 const l=structuredClone(base),ordinary=l.blocks.filter(b=>!b.layers&&!b.shutterId);let changed=false;
 for(let k=0;k<1+gen%3;k++){const a=pick(ordinary),b=pick(ordinary);if(a.color!==b.color){[a.color,b.color]=[b.color,a.color];changed=true;}}
 const g=pick(l.gates);const next=g.offset+(R()<.5?-1:1);if(next>=0&&next+g.size<=(['top','bottom'].includes(g.side)?l.width:l.height)){g.offset=next;changed=true;}
 if(!changed)continue;
 if(l.gates.some((g,i)=>l.gates.some((h,j)=>i!==j&&g.side===h.side&&g.offset<h.offset+h.size&&h.offset<g.offset+g.size)))continue;
 const same=l.blocks.some((b,i)=>l.blocks.some((a,j)=>i<j&&a.shutterId===b.shutterId&&a.color===b.color&&b.shape.some(([x,y])=>a.shape.some(([u,v])=>Math.abs(b.x+x-a.x-u)+Math.abs(b.y+y-a.y-v)===1))));if(same)continue;
 try{api.validateLevel(l);}catch{continue;}
 const sha=crypto.createHash('sha256').update(JSON.stringify(l)).digest('hex');if(seen.has(sha))continue;seen.add(sha);fs.writeFileSync(out+'/candidate-227-g'+gen+'.json',JSON.stringify(l,null,2));const began=Date.now(),search=searchSpatial(l,api,{maxMilliseconds:950,maxStates:20000,maxTransitions:100000,symmetry:true,orderSeed:gen%26});const ms=Date.now()-began,replay=search.drags?replayTimed(l,search.drags,api):null;let proof;if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=16&&replay.nonClearingDrags<=20)proof=floor227(l,{maxMilliseconds:3500,maxStates:900000}).proof;const row={generation:gen,candidateSha256:sha,searchWallMs:ms,search,replay,proof,lowerBound:proof?.thresholdProven?16:null,difficultyCertified:Boolean(proof?.thresholdProven),opening:auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hiddenCoverage:auditHiddenCoverage(l),q0:l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')),releaseApproved:false};reports.push(row);fs.writeFileSync(out+'/audit-227-g'+gen+'.json',JSON.stringify(row,null,2));console.log(JSON.stringify({gen,U:replay?.nonClearingDrags,status:search.status,L:proof?.status}));if(proof?.thresholdProven)break;
}
fs.writeFileSync(out+'/bounded-search-227-sourcegates-fast800-audit.json',JSON.stringify({baseAuthoredGeneration:1932,reports},null,2));


