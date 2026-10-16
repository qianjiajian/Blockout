const fs=require('fs');
const files=['src/core/formal201to210Data.ts','src/core/remake201to210.ts'];
for(const p of files){let s=fs.readFileSync(p,'utf8').replace(/v1\.122/g,'v1.123');fs.writeFileSync(p,s)}
let t=fs.readFileSync('tests/remake201to210.test.ts','utf8');
t=t.replace('import { readFileSync } from "node:fs";','// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.\nimport { readFileSync } from "node:fs";');
t=t.replace(/remake201-210-v122\.json/g,'remake201-210-v123.json').replace(/v1\.122 cadence/g,'v1.123 cadence');fs.writeFileSync('tests/remake201to210.test.ts',t);
const fixture=fs.readFileSync('tests/fixtures/remake201-210-v122.json','utf8').replace(/v1\.122\.0/g,'v1.123.0');fs.writeFileSync('tests/fixtures/remake201-210-v123.json',fixture);
const routes=fs.readFileSync('deliverables/continue201-210-20260929/routes-v122.json','utf8').replace(/v1\.122\.0-candidate/g,'v1.123.0-candidate');fs.writeFileSync('deliverables/continue201-210-20260929/routes-v123.json',routes);
for(const name of ['simple','seven','210']){let p=`deliverables/continue201-210-20260929/lower-bound-v122-${name}.json`;let q=`deliverables/continue201-210-20260929/lower-bound-v123-${name}.json`;let s=fs.readFileSync(p,'utf8').replace(/v1\.122\.0/g,'v1.123.0');fs.writeFileSync(q,s)}
let report=fs.readFileSync('deliverables/continue201-210-20260929/review-seven/report.md','utf8').replace(/v1\.122\.0/g,'v1.123.0').replace(/routes-v122/g,'routes-v123').replace(/lower-bound-v122/g,'lower-bound-v123');fs.writeFileSync('deliverables/continue201-210-20260929/review-seven/report-v123.md',report);
