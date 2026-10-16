import {build} from 'esbuild';
import {auditHiddenCoverage} from './tools/revised-hidden-coverage.mjs';
const b=await build({entryPoints:['src/core/formal201to210Data.ts'],bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
for(const l of m.CANDIDATE_201_210_LEVELS){const a=auditHiddenCoverage(l); console.log(l.id,a.passed,a.issues.map(x=>x.code).join(','),a.missingCells,a.coveredCells,a.totalCells)}
