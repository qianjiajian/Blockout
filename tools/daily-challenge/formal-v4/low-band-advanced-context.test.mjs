import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {ACCEPTED_LOW_BAND_BASES} from './accepted-low-band-base.mjs';
import {CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {LOW_BAND_SEED147,LOW_BAND_TWO_PROPOSAL,inspectSubstantialRegionRedraft,prepareLowBandAdvancedContext} from './low-band-advanced-context.mjs';
const out=process.env.LOW_BAND_CONTEXT_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/low-band-advanced-context-qualification-01';
await fs.mkdir(out,{recursive:false});const rt=await loadV4CatalogRuntime(),evidence=[],sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
const cases=[];for(const descriptor of ACCEPTED_LOW_BAND_BASES){const base=await read(descriptor.path),input=await read(base.input.path),reference=await read(input.provenance.reference.path);cases.push({descriptor,base,input,reference});}
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});
check('two real connected20/48 redrafts keep reference ancestry and never claim whole-board independence',()=>{
 for(const q of cases){const r=inspectSubstantialRegionRedraft(q.descriptor,q.base,q.input,q.reference);assert.equal(r.sourceType,'SUBSTANTIAL_CONNECTED_REGION_REDRAFT');assert.equal(r.directWholeBoard,false);assert.equal(r.regionArea,20);assert.equal(r.boardArea,48);}
});
check('forged region, unchanged partition/colour and arbitrary third packet fail classification',()=>{
 for(const mutation of [q=>{q.input.provenance.region.cells=q.input.provenance.region.cells.slice(0,5);q.input.provenance.region.area=5;},
  q=>{q.input.level=q.reference.level;},q=>{q.input.provenance.realSharedBodyRecoloured='not-an-actual-id';},
  q=>{q.input.prefixDrags[0].blockId=q.input.provenance.region.bodyIds[0];},q=>{q.descriptor.path='deliverables/third.json';}]){
   const q=structuredClone(cases[0]);mutation(q);assert.throws(()=>inspectSubstantialRegionRedraft(q.descriptor,q.base,q.input,q.reference));}
});
check('exact147 and genuine old sidecars validate; omitted basic or invented append fail',async()=>{
 const seed=await read(LOW_BAND_SEED147.path),selected=await Promise.all(seed.files.map(read));
 const context={schemaVersion:4,scope:300,seedIndex:LOW_BAND_SEED147,files:seed.files,fileBindings:{}};
 for(const p of context.files)context.fileBindings[p]=sha(await fs.readFile(p));
 const construction=path.join(out,'actual-sidecar-copy');await fs.mkdir(construction,{recursive:true});
 for(const n of await fs.readdir(CONSTRUCTION_LEDGER))if(n.endsWith('.slot-result.json'))await fs.copyFile(path.join(CONSTRUCTION_LEDGER,n),path.join(construction,n));
 const rows=(await read(LOW_BAND_TWO_PROPOSAL.path)).rows,descriptor=await put(path.join(out,'context147.json'),context);
 for(const [i,q]of cases.entries()){
  const c=await prepareLowBandAdvancedContext(rt,q.descriptor,q.base,rows[i].slot,selected,descriptor,{constructionLedgerDirectory:construction});
  const result=c.inspect(q.base.level);assert(result.passed,result.issues.join(';'));assert.equal(result.completeSelectedCount,147);
  assert.equal(result.sourceClassification.directWholeBoard,false);assert(result.supersededLocalVariantDiagnostics.every(x=>['already-live-local-family','already-live-basic-reference-family'].includes(x)));
 }
 const omitted=structuredClone(context);omitted.files.pop();delete omitted.fileBindings[seed.files.at(-1)];
 await assert.rejects(prepareLowBandAdvancedContext(rt,cases[0].descriptor,cases[0].base,rows[0].slot,selected.slice(0,-1),await put(path.join(out,'omitted.json'),omitted),{constructionLedgerDirectory:construction}),/Exact147 prefix/);
 const invented=structuredClone(context),p=path.join(out,'invented.json'),fake={...selected[0],formalId:'fake-slot'};
 const d=await put(p,fake);invented.files.push(p);invented.fileBindings[p]=d.sha256;
 await assert.rejects(prepareLowBandAdvancedContext(rt,cases[0].descriptor,cases[0].base,rows[0].slot,[...selected,fake],await put(path.join(out,'invented-context.json'),invented),{constructionLedgerDirectory:construction}),/Unplanned appended receipt/);
});
after(async()=>{const bindings={};for(const n of ['low-band-advanced-context.mjs','low-band-advanced-context.test.mjs']){const p=`tools/daily-challenge/formal-v4/${n}`;bindings[p]=sha(await fs.readFile(p));}
 await put(path.join(out,'report.json'),{status:evidence.length===3&&evidence.every(r=>r.passed)?'LOW_BAND_ADVANCED_CONTEXT_PRIVATE_QUALIFICATION_PASS':'INCOMPLETE_OR_FAIL',evidence,toolBindings:bindings,
  selection:LOW_BAND_SEED147,proposal:LOW_BAND_TWO_PROPOSAL,newSearches:0,newConstructionCalls:0,newPublicClaims:0,productionChanged:false});});
