import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadV3CatalogRuntime,auditV3Catalog} from './catalog-contract.mjs';

const [input,reviewFile,label]=process.argv.slice(2);
if(!input||!reviewFile||!label||!/^[a-z0-9-]+$/.test(label))throw Error('Supply prior index, actual visual review and new label');
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(input),reviewBytes=await fs.readFile(reviewFile),index=JSON.parse(bytes),review=JSON.parse(reviewBytes);
if(!Array.isArray(review.excludedFormalIds)||!review.excludedFormalIds.length||!review.sheets?.every(r=>r.actuallyViewed))throw Error('Actual reviewed exclusions required');
const excluded=new Set(review.excludedFormalIds),files=[],reports=[],removed=[];
for(const file of index.files){const r=JSON.parse(await fs.readFile(file,'utf8'));
 if(excluded.has(r.formalId))removed.push({file,formalId:r.formalId,levelSha256:r.levelSha256,reason:'Independent actual screenshot review: repetitive visual structure'});
 else{files.push(file);reports.push(r);}}
if(removed.length!==excluded.size)throw Error('Exclusions not present in input selection');
for(const s of review.sheets)if(hash(await fs.readFile(s.path))!==s.sha256)throw Error('Reviewed image changed');
const directory=`deliverables/daily-formal-v3-20261008/selection/${label}`;await fs.mkdir(directory,{recursive:false});
const audit=await auditV3Catalog(await loadV3CatalogRuntime(),reports,{expectFull:false});
await fs.writeFile(`${directory}/index.json`,JSON.stringify({schemaVersion:3,formalReady:false,productionChanged:false,priorIndex:input,
 visualCuration:{reviewFile,reviewSha256:hash(reviewBytes),inputSha256:hash(bytes),removed,mathematicalReceiptsUnchanged:true},files},null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${directory}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory,removed:removed.length,selected:files.length,verified:audit.verified,status:audit.status}));
