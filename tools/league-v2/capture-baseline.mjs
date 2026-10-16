import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {levelSha256,leagueBand} from './proof-contract.mjs';
import {partitionKey,boardMaskKey,DIVERSITY_POLICY} from './diversity-contract.mjs';

const out='deliverables/league-v2-20261008/baseline';
const lock=verifyRulesLock();
if(!lock.ok||lock.activeVersion!=='1.155.0')throw Error('Active v1.155 rules lock required');
const files=['src/core/leagueLevelData.ts','src/core/leagueLevels.ts','src/core/levels.ts','src/core/mechanismCatalog.ts','docs/rules/mechanism-rules-v1.155.0.md'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await fs.readFile(f))])));
const built=await build({stdin:{contents:'export {LEAGUE_LEVELS} from "./src/core/leagueLevelData.ts"; export {MECHANISM_GUIDE} from "./src/core/mechanismCatalog.ts";',resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {LEAGUE_LEVELS,MECHANISM_GUIDE}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
if(LEAGUE_LEVELS.length!==100||new Set(LEAGUE_LEVELS.map(r=>r.index)).size!==100)throw Error('Expected 100 existing slots');
await fs.mkdir(path.join(out,'slots'),{recursive:true});
const rows=[];
for(const row of LEAGUE_LEVELS){
 const file=`${out}/slots/${String(row.index).padStart(3,'0')}.json`;
 await fs.writeFile(file,JSON.stringify(row,null,2)+'\n',{flag:'wx'});
 rows.push({index:row.index,file,levelSha256:levelSha256(row.level),partitionKey:partitionKey(row.level),boardMaskKey:boardMaskKey(row.level)});
}
const slots=Array.from({length:100},(_,i)=>{
 const index=i+1,band=leagueBand(index),unlocked=MECHANISM_GUIDE.filter(m=>m.unlockLevel<=index);
 return {index,levelId:900000+index,difficulty:band.difficulty===2?'super':'hard',band:[band.lower,band.upper],timeSeconds:180,reward:0,
  unlockedMechanisms:unlocked.map(m=>m.id),latestUnlock:unlocked.at(-1).id,scoringBlocks:{minimum:1,maximum:3,pointsEach:10,rectangleOnly:true,latterHalfOnly:true,initialHeldExitForbidden:true},
  status:'PENDING_REGENERATION',selectedCandidate:null,formalReady:false};
});
for(const f of files)if(before[f]!==sha(await fs.readFile(f)))throw Error('Input changed during capture: '+f);
await fs.writeFile(`${out}/manifest.json`,JSON.stringify({status:'OLD_FORMAL_BASELINE_ONLY_DESIGN_INSUFFICIENT',createdAt:new Date().toISOString(),ruleVersion:'1.155.0',count:100,inputSha256:before,rows},null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${out}/slot-plan.json`,JSON.stringify({status:'PLAN_NOT_COMPLETION',formalReady:false,expected:100,difficultyCounts:{hard:80,super:20},diversityPolicy:DIVERSITY_POLICY,policyNumbersAreImplementationChoices:true,slots},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'BASELINE_CAPTURED',count:rows.length,planSlots:slots.length,out,productionChanged:false}));
