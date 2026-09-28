import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54',toolDir='tools/campaign-v145/lv051-060',pending=dir+'/enriched-pending52-1790252699034.json',accepted=JSON.parse(fs.readFileSync(pending));
const authorFile=toolDir+'/author51-54-v146.mjs',source=fs.readFileSync(authorFile,'utf8');assert.equal(digest(source),accepted.freshVerification.authorSha256);
const writeOnce=(p,s)=>{if(fs.existsSync(p))assert.equal(fs.readFileSync(p,'utf8'),s);else fs.writeFileSync(p,s,{flag:'wx'});};
const snapshot=toolDir+'/author52-pending-snapshot-1790252699034.mjs';writeOnce(snapshot,source);
const cut=source.indexOf("const [mode='generate',arg='53']=process.argv.slice(2);");assert(cut>0);const pure=source.slice(0,cut)+'\nexport {make,seededRng};\n',moduleFile=toolDir+'/construction52-from-1790252699034.mjs';writeOnce(moduleFile,pure);
const chain=[];let file=dir+'/mutant52-52471-234-1790250008648.json';
for(;;){const d=JSON.parse(fs.readFileSync(file));chain.unshift({file,d});if(!d.localMutation)break;file=d.localMutation.parent;}
const original=chain[0].d;process.env.NARROW='1';process.env.PACK_TRIES='6000';const {make,seededRng}=await import(pathToFileURL(path.resolve(moduleFile)).href),rng=seededRng(original.seed);let made;for(let n=1;n<=original.attempts;n++)made=make(52,rng);
const initialReplay={file:chain[0].file,seed:original.seed,attempt:original.attempts,narrow:true,packTries:6000,generatedLevelSha256:made?.level?digest(made.level):null,expectedLevelSha256:digest(original.level),exact:!!made?.level&&digest(made.level)===digest(original.level)};
const report={checkedAt:new Date().toISOString(),pending,pendingSha256:digest(fs.readFileSync(pending)),snapshot,snapshotSha256:digest(fs.readFileSync(snapshot)),constructionModule:moduleFile,constructionModuleSha256:digest(fs.readFileSync(moduleFile)),driverSha256:digest(fs.readFileSync(toolDir+'/reconstruct52.mjs')),initialReplay,mutations:[]};
if(initialReplay.exact){let level=made.level;
 for(const row of chain.slice(1)){const before=digest(level);level=structuredClone(level);for(const c of row.d.localMutation.changes){if(c.swap){const [a,b]=c.swap.map(id=>level.blocks.find(x=>x.id===id));assert(a&&b);[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}else{const g=level.gates.find(g=>g.id===c.gate);assert(g);Object.assign(g,{side:c.side,offset:c.offset,size:c.size});}}
  assert.deepEqual(level,row.d.level);report.mutations.push({file:row.file,fileSha256:digest(fs.readFileSync(row.file)),parentLevelSha256:before,levelSha256:digest(level),changes:row.d.localMutation.changes,exact:true});
 }assert.deepEqual(level,accepted.level);report.finalLevelSha256=digest(level);report.exactPendingLevelMatch=true;
}else{report.exactPendingLevelMatch=false;report.reason='Seed/attempt historical replay mismatch; no mutation replay claimed.';}
report.lowerBoundPending=true;report.formalAdopted=false;const output=dir+'/construction-replay52-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,initialReplay,mutations:report.mutations.length,exactPendingLevelMatch:report.exactPendingLevelMatch,finalLevelSha256:report.finalLevelSha256}));
