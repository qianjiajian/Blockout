import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadLeagueProofRuntime,levelSha256} from './proof-contract.mjs';
import {auditExistingLeagueMechanisms} from './mechanism-compose.mjs';
import {summarizeInventory} from './mechanism-policy.mjs';
import {leagueCatalogProgress} from './catalog-progress.mjs';

const[input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node refresh-mechanism-receipts.mjs selection.json new-directory');
const old=JSON.parse(await fs.readFile(input,'utf8'));if(!Array.isArray(old.selections))throw Error('Explicit selections required');
await fs.mkdir(output,{recursive:false});
const runtime=await loadLeagueProofRuntime(),selections=[],failures=[];
for(const row of old.selections){
 const bytes=await fs.readFile(row.mechanismFile),packet=JSON.parse(bytes),previous=packet.mechanisms??packet;
 const baseline=JSON.parse(await fs.readFile(`deliverables/league-v2-20261008/baseline/slots/${String(row.index).padStart(3,'0')}.json`,'utf8'));
 const report=await auditExistingLeagueMechanisms(previous,{runtime,previousInventory:summarizeInventory(baseline.level)});
 if(levelSha256(report.level)!==previous.levelSha256)throw Error('Mechanism revalidation changed puzzle');
 report.previousMechanismReceipt={path:row.mechanismFile,sha256:createHash('sha256').update(bytes).digest('hex')};
 const file=path.join(output,`index-${String(row.index).padStart(3,'0')}.mechanism.json`).replaceAll('\\','/');
 await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 if(!report.ok)failures.push({index:row.index,issues:report.issues});
 selections.push({...row,mechanismFile:file});
}
await fs.writeFile(path.join(output,'selection.json'),JSON.stringify({selections,failures},null,2)+'\n',{flag:'wx'});
const progress=await leagueCatalogProgress(runtime,selections);
await fs.writeFile(path.join(output,'progress.json'),JSON.stringify(progress,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({counts:progress.counts,mechanismRevalidationFailures:failures,formalReady:false,output}));
