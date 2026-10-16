import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {leagueMechanismPlan,summarizeInventory,LEAGUE_MECHANISM_UNLOCKS} from './mechanism-policy.mjs';
import {levelSha256} from '../daily-challenge/formal-v2/contract.mjs';

const out='deliverables/league-v2-20261008/mechanisms';fs.mkdirSync(out,{recursive:true});
const built=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:'export {LEAGUE_LEVELS} from "./src/core/leagueLevelData.ts"; export {MECHANISM_GUIDE} from "./src/core/mechanismCatalog.ts";'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEAGUE_LEVELS,MECHANISM_GUIDE}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
for(const [m,n]of Object.entries(LEAGUE_MECHANISM_UNLOCKS))if(MECHANISM_GUIDE.find(s=>s.id===m)?.unlockLevel!==n)throw Error(`unlock drift ${m}`);
const rows=LEAGUE_LEVELS.map(row=>{const level=row.level,inventory=summarizeInventory(level),plan=leagueMechanismPlan(row.index,{blockCount:level.blocks.length});return {index:row.index,levelSha256:levelSha256(level),blocks:level.blocks.length,inventory,plan,newestMechanismMissing:!plan.foundationOnly&&!(inventory[plan.primary]?.instances>0)};});
const totals={};for(const row of rows)for(const [m,v]of Object.entries(row.inventory)){totals[m]??={levels:0,instances:0,values:[],max:0};if(v.instances)totals[m].levels++;totals[m].instances+=v.instances;totals[m].values.push(...v.values);totals[m].max=Math.max(totals[m].max,v.instances);}
const report={schemaVersion:1,createdAt:new Date().toISOString(),status:'BASELINE_AUDIT_ONLY',source:'src/core/leagueLevelData.ts',levelCount:rows.length,totals,newestMissingIndices:rows.filter(r=>r.newestMechanismMissing).map(r=>r.index),rows,productionChanged:false};
fs.writeFileSync(path.join(out,'old-formal100-mechanisms.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({levels:rows.length,totals,newestMissingIndices:report.newestMissingIndices},null,2));
