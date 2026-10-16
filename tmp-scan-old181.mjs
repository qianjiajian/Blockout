import fs from 'node:fs';
import {build} from 'esbuild';
import {auditOpeningCoverage} from './tools/revised-opening-coverage.mjs';
const code=`export {PuzzleModel} from './src/core/PuzzleModel.ts'; export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';`;
const b=await build({stdin:{contents:code,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const dir='deliverables/remake181-190-v146-20260924/source181-185';const rows=[];
const files=fs.readdirSync(dir).filter(f=>f.startsWith('candidate181-')&&f.endsWith('.json'));
for(const file of files){const j=JSON.parse(fs.readFileSync(`${dir}/${file}`));const level=structuredClone(j.level);for(const b of level.blocks)delete b.timedBombSeconds;let opening=null,replay=null;try{opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot());replay=api.replayRevisedRoute(level,j.drags);}catch(e){rows.push({file,error:String(e)});continue;}if(replay.valid&&replay.complete)rows.push({file,drags:j.drags.length,nonClearing:replay.nonClearingDrags,opening:opening.passed,openingIssues:opening.issues?.slice(0,2)});}
console.log(JSON.stringify(rows.sort((a,b)=>(b.nonClearing??-1)-(a.nonClearing??-1)),null,2));
