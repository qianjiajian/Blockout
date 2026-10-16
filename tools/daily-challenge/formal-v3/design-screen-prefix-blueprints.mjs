import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from './bounded-proof.mjs';
import {reverseTemplateFingerprints} from './design-reverse-construction-ledger.mjs';
const root='deliverables/daily-formal-v3-20261008/design',ledger=`${root}/reverse-construction-attempts`;
const label=process.env.DESIGN_REVERSE_SCREEN_LABEL??'reverse-prefix-screen-01';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid new screen label');
const output=`${root}/${label}.json`;if(fs.existsSync(output))throw Error('Preserve screening evidence');
const claimed=new Set(),failedShapes=new Set(),failedColours=new Set(),failed=[];
for(const file of fs.readdirSync(ledger))if(file.startsWith('final-stock-alias-')&&file.endsWith('.json'))claimed.add(JSON.parse(fs.readFileSync(`${ledger}/${file}`)).inputSha256);
for(const e of fs.readdirSync(ledger,{withFileTypes:true}))if(e.isDirectory()){
 const path=`${ledger}/${e.name}`,claim=JSON.parse(fs.readFileSync(`${path}/claim.json`)),fp=reverseTemplateFingerprints(claim.constructionTemplateLevel);
 claimed.add(fp.inputSha256);const result=fs.existsSync(`${path}/result.json`)?JSON.parse(fs.readFileSync(`${path}/result.json`)):null;
 const outcome=fs.existsSync(`${path}/proof-outcome.json`)?JSON.parse(fs.readFileSync(`${path}/proof-outcome.json`)):null;
 if(!result?.constructed||outcome?.accepted===false){failedShapes.add(fp.shapeInventorySha256);failedColours.add(fp.colourInventorySha256);failed.push({path,...fp});}
}
const eligible=[],rejected=[],seen=new Set();
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${e.name}`;
 if(e.isDirectory()){if(e.name!=='reverse-construction-attempts')scan(path);continue;}
 if(!/^candidate-.*\.json$/.test(e.name))continue;
 let p;try{p=JSON.parse(fs.readFileSync(path));}catch{continue;}if(!p.accepted||!p.level||!p.drags)continue;
 const sha=levelSha256(p.level);if(seen.has(sha))continue;seen.add(sha);
 const source=p.sourceLevelId??p.level.id,fp=reverseTemplateFingerprints(p.level);let reason;
 try{assertPlainProofDomain(p.level);}catch{reason='not-plain';}
 if(claimed.has(fp.inputSha256))reason='already-claimed-construction-stock';
 if(failedShapes.has(fp.shapeInventorySha256))reason='shares-shape-inventory-with-failed-stock';
 if(failedColours.has(fp.colourInventorySha256))reason='shares-colour-inventory-with-failed-stock';
 const pub=designFingerprints(p.level),retry=levelSha256({shapeSha256:pub.shapeSha256,colorSha256:pub.colorSha256});
 if(fs.existsSync(`deliverables/daily-formal-v3-20261008/proof/attempts/identities/${retry}.blocked.json`))reason='public-failed-physical-input';
 let area=0,clears=0,parking=0,cut=null;
 for(const[index,drag]of p.drags.entries()){
  if(drag.exitSide){clears++;area+=p.level.blocks.find(b=>b.id===drag.blockId).shape.length;
   if((clears===2||clears===3)&&area>=4&&area<=6&&!cut)cut={blueprintPrefixClearCount:clears,blueprintMaximumPrefixArea:6,prefixDragCount:index+1,temporaryVacancyArea:area,withheldParkingDrags:parking};
   if(clears===3)break;
  }else parking++;
 }
 if(!cut)reason??='no-second-or-third-clear-vacancy-4-to-6';
 if(reason){rejected.push({path,sourceLevelId:source,reason});continue;}
 eligible.push({path,fileSha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex'),sourceLevelId:source,U:p.U,L:p.L,
  levelSha256:sha,...fp,...cut,shapeAndColourDifferFromEveryRecordedFailedStock:true});
}}
scan(root);eligible.sort((a,b)=>b.U-a.U||a.sourceLevelId-b.sourceLevelId||a.path.localeCompare(b.path));
const records=[],sources=new Set();for(const r of eligible)if(!sources.has(r.sourceLevelId)){records.push(r);sources.add(r.sourceLevelId);if(records.length===6)break;}
fs.writeFileSync(output,JSON.stringify({status:'READ_ONLY_NEW_STOCK_SECOND_OR_THIRD_CLEAR_PREFIX_SCREEN',searches:0,oldFilesChanged:false,
 screeningIsNotMathematicalRevalidation:true,failedStocksChecked:failed.length,claimedStocksChecked:claimed.size,failedStockBindings:failed,
 referenceCount:seen.size,eligibleCount:eligible.length,records,eligible,rejected},null,2)+'\n');console.log(JSON.stringify({output,eligible:eligible.length,records}));
