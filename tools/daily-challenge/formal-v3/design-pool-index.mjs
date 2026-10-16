import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { orbitFootprintArea } from './diversity-layout-factory.mjs';
const root='deliverables/daily-formal-v3-20261008/design';
const label=process.argv[2];if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Supply a new immutable snapshot label');
const out=`${root}/pool-${label}.json`;if(fs.existsSync(out))throw Error('Snapshot already exists');
const records=[],unreadable=[];
const scan=dir=>{for(const x of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${x.name}`;
  if(x.isDirectory())scan(path);else if(/^candidate-.*\.json$/.test(x.name)){
    const bytes=fs.readFileSync(path);let p;try{p=JSON.parse(bytes);}catch{unreadable.push(path);continue;}
    if(p.accepted&&p.level&&p.drags)records.push({path,fileSha256:createHash('sha256').update(bytes).digest('hex'),sourceLevelId:p.sourceLevelId,
      difficulty:p.difficulty,L:p.L,U:p.U,width:p.level.width,height:p.level.height,bodyCount:p.level.blocks.length,
      levelSha256:p.levelSha256,status:p.status,actualMechanisms:p.provenance?.actualMechanisms??[],shapeProfile:p.provenance?.shapeProfile??'historical-balanced',proofBudget:p.proof?.budget,
      discoveredBoardStates:p.proof?.discoveredStates,expandedBoardStates:p.proof?.exploredStates,transitions:p.proof?.attemptedTransitions,level:p.level});
  }
}};
scan(root);
for(const record of records)record.nearestOtherCandidateArea=Math.max(0,...records.filter(r=>r!==record).map(r=>orbitFootprintArea(r.level,record.level)));
const report={status:'EXPLORATORY_POOL_NOT_FORMAL_QUALIFICATION',generatedAt:new Date().toISOString(),formalReady:false,productionChanged:false,
  note:'Only complete same-object exploratory witnesses with a within-band lower result are indexed. Final v3 budget ledger, diversity, mechanisms, source/tool binding and browser/time gates remain mandatory.',
  skippedIncompleteOrInvalidJsonPaths:unreadable,
  byDifficulty:[1,2,3].map(d=>({difficulty:d,count:records.filter(r=>r.difficulty===d).length})),
  sourceLevelIds:[...new Set(records.map(r=>r.sourceLevelId))],records:records.map(({level,...r})=>r)};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:out,count:records.length,byDifficulty:report.byDifficulty,sourceLevelIds:report.sourceLevelIds}));
