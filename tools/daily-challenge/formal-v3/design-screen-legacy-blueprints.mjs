import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints,loadBoundedRuntime} from './bounded-proof.mjs';
import {reverseTemplateFingerprints} from './design-reverse-construction-ledger.mjs';
import {auditKnownInterleavedBlueprint} from './design-reverse-interleaved.mjs';
const root='deliverables/daily-formal-v3-20261008/design',old='deliverables/daily-formal-v2-20261007',ledger=`${root}/reverse-construction-attempts`;
const label=process.env.DESIGN_REVERSE_SCREEN_LABEL??'reverse-legacy-screen-01';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid new screening label');
const output=`${root}/${label}.json`;if(fs.existsSync(output))throw Error('Preserve historical screening');
const hash=path=>createHash('sha256').update(fs.readFileSync(path)).digest('hex'),claimed=new Set(),failedShapes=new Set(),failedColours=new Set(),failed=[];
for(const file of fs.readdirSync(ledger))if(file.startsWith('final-stock-alias-')&&file.endsWith('.json'))claimed.add(JSON.parse(fs.readFileSync(`${ledger}/${file}`)).inputSha256);
for(const e of fs.readdirSync(ledger,{withFileTypes:true}))if(e.isDirectory()){
 const path=`${ledger}/${e.name}`,claim=JSON.parse(fs.readFileSync(`${path}/claim.json`)),fp=reverseTemplateFingerprints(claim.constructionTemplateLevel);
 claimed.add(fp.inputSha256);const result=fs.existsSync(`${path}/result.json`)?JSON.parse(fs.readFileSync(`${path}/result.json`)):null;
 const outcome=fs.existsSync(`${path}/proof-outcome.json`)?JSON.parse(fs.readFileSync(`${path}/proof-outcome.json`)):null;
 if(!result?.constructed||outcome?.accepted===false){failedShapes.add(fp.shapeInventorySha256);failedColours.add(fp.colourInventorySha256);failed.push({path,...fp});}
}
const preferred=[`${old}/design-lab/irregular-bottom-split-d3-candidate-44.json`,`${old}/design-lab/factory-round1-concave-43-candidate-7.json`,`${old}/design-d3-proof/d3-batch-03/candidate-0025.json`];
const eligible=[],rejected=[],seen=new Set(),comparisonPaths=[];
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const path=`${dir}/${e.name}`;if(e.isDirectory()){scan(path);continue;}if(!/candidate.*\.json$/.test(e.name))continue;
 let p;try{p=JSON.parse(fs.readFileSync(path));}catch{continue;}if(!p.accepted||!p.level||!p.drags)continue;
 const sha=levelSha256(p.level);comparisonPaths.push(path);if(seen.has(sha))continue;seen.add(sha);
 const source=p.sourceLevelId??p.level.id;if(![2,42,198].includes(source))continue;
 const fp=reverseTemplateFingerprints(p.level);let reason;
 try{assertPlainProofDomain(p.level);}catch{reason='not-plain';}
 if(claimed.has(fp.inputSha256))reason='already-claimed-construction-stock';
 if(failedShapes.has(fp.shapeInventorySha256))reason='shares-shape-inventory-with-failed-stock';
 if(failedColours.has(fp.colourInventorySha256))reason='shares-colour-inventory-with-failed-stock';
 const pub=designFingerprints(p.level),retry=levelSha256({shapeSha256:pub.shapeSha256,colorSha256:pub.colorSha256});
 if(fs.existsSync(`deliverables/daily-formal-v3-20261008/proof/attempts/identities/${retry}.blocked.json`))reason='public-failed-physical-input';
 let area=0,clears=0,cut=null;for(const[i,drag]of p.drags.entries())if(drag.exitSide){
  area+=p.level.blocks.find(b=>b.id===drag.blockId).shape.length;clears++;
  if(area>=2&&area<=4&&!cut)cut={blueprintPrefixClearCount:clears,blueprintMaximumPrefixArea:4,prefixDragCount:i+1,temporaryVacancyArea:area};
  if(clears===2)break;
 }
 if(!cut)reason??='no-one-or-two-clear-prefix-area-two-to-four';
 if(reason){rejected.push({path,sourceLevelId:source,reason});continue;}
 eligible.push({path,fileSha256:hash(path),sourceLevelId:source,U:p.U,L:p.L,...fp,...cut,
  priorFamilyRepresentative:preferred.includes(path),shapeAndColourDifferFromEveryRecordedFailedStock:true});
}}
for(const dir of ['design-lab','design-d3-proof','design-band-proof'])scan(`${old}/${dir}`);
eligible.sort((a,b)=>Number(b.priorFamilyRepresentative)-Number(a.priorFamilyRepresentative)||b.U-a.U||a.path.localeCompare(b.path));
const runtime=await loadBoundedRuntime(),records=[],selectedShape=new Set(),selectedColour=new Set();
for(const source of [2,42,198])for(const row of eligible.filter(x=>x.sourceLevelId===source)){
 if(records.filter(x=>x.sourceLevelId===source).length===2)break;
 if(selectedShape.has(row.shapeInventorySha256)||selectedColour.has(row.colourInventorySha256)){rejected.push({path:row.path,sourceLevelId:source,reason:'shares-shape-or-colour-stock-with-selected-input'});continue;}
 const packet=JSON.parse(fs.readFileSync(row.path));let qualification;
 try{qualification=auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount:row.blueprintPrefixClearCount,maximumPrefixArea:4});}
 catch(error){rejected.push({path:row.path,sourceLevelId:source,reason:'known-route-qualification:'+error.message});continue;}
 records.push({...row,qualification});selectedShape.add(row.shapeInventorySha256);selectedColour.add(row.colourInventorySha256);
}
const sourceBindings=comparisonPaths.map(path=>({path,sha256:hash(path)}));
fs.writeFileSync(output,JSON.stringify({status:'LEGACY_SUCCESS_STOCK_READONLY_QUALIFIED_FOR_NEW_REVERSE_LAYOUTS',newSearches:0,newFormalCandidates:0,
 noOriginalPrototypeSelected:true,failedStocksChecked:failed.length,failedStockBindings:failed,proofToolchainSha256:runtime.toolchainSha256,
 comparisonPolicy:'New layouts must have <=0.65 footprint similarity to every successful legacy pool object as well as the current v3 successful pool and selected128.',
 comparisonPaths,sourceBindings,records,eligible:eligible.map(({qualification,...x})=>x),rejected},null,2)+'\n');
console.log(JSON.stringify({output,successfulLegacyComparisons:comparisonPaths.length,eligible:eligible.length,selected:records.map(x=>({path:x.path,source:x.sourceLevelId,U:x.U,prefix:x.blueprintPrefixClearCount,vacancy:x.temporaryVacancyArea,qualified:x.qualification.valid}))}));
