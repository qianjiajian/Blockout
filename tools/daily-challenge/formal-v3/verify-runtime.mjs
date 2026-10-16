import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {verifyBoundedCandidate} from './bounded-proof.mjs';
import {loadV3CatalogRuntime,auditV3Catalog,CATALOG_VERSION} from './catalog-contract.mjs';
import {requireCompleteCatalog,registryCandidate,fileSha256} from './emit-catalog.mjs';

export function assertRegistryBinding(runtime,slot,candidate,receipt,receiptFileHash){
  if(candidate?.proofSchemaVersion!==2||candidate.v3Evidence?.receiptSchemaVersion!==3
    ||candidate.v3Evidence.catalogVersion!==CATALOG_VERSION||receipt?.schemaVersion!==3||receipt.catalogVersion!==CATALOG_VERSION)
    throw Error(`V3 proof receipt and explicit schema 2 transport required: ${slot.formalId}`);
  for(const key of ['formalId','stageKey','difficulty','newestMechanism','slot'])if(receipt[key]!==slot[key])throw Error(`Receipt slot mismatch: ${key}`);
  if(levelSha256(candidate.level)!==receipt.levelSha256||levelSha256(receipt.level)!==receipt.levelSha256)
    throw Error(`Runtime object differs from exact proved object: ${slot.formalId}`);
  const expected=registryCandidate(runtime,slot,receipt,candidate.proofReport,receiptFileHash);
  if(levelSha256(candidate)!==levelSha256(expected))throw Error(`Production metadata, source, quality or receipt binding mismatch: ${slot.formalId}`);
}

export async function loadProductionDailyApi(){
  const built=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:[
    'export * from "./src/core/dailyChallenge.ts";',
    'export * from "./src/core/formalDailyChallengeData.ts";',
    'export {LEVELS} from "./src/core/levels.ts";',
  ].join('\n')},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  const api=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  const bindings={};for(const file of Object.keys(built.metafile.inputs).filter(f=>!f.startsWith('<')))
    bindings[file]=fileSha256(await fs.readFile(file));
  return{api,bindings};
}

export async function verifyProductionRuntime(output,{ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts'}={}){
  const runtime=await loadV3CatalogRuntime(),{api,bindings:productionBindings}=await loadProductionDailyApi();
  if(api.FORMAL_DAILY_CHALLENGE_SCHEMA_VERSION!==2)throw Error('Explicit schema 2 runtime data required');
  const expected=expectedDailySlots(runtime.MECHANISM_GUIDE),candidates=api.FORMAL_DAILY_CHALLENGE_CATALOG.flatMap(stage=>[1,2,3].flatMap(d=>stage.difficulties[d].candidates));
  if(candidates.length!==450||new Set(candidates.map(c=>c.formalId)).size!==450)throw Error('Production must contain exactly 450 unique candidates');
  if(levelSha256(api.FORMAL_DAILY_CHALLENGE_CATALOG)!==api.FORMAL_DAILY_CHALLENGE_REVISION)throw Error('Production catalogue revision is not its actual payload hash');
  if(levelSha256(api.LEVELS)!==levelSha256(runtime.LEVELS))throw Error('Production source registry differs from proof source registry');
  const entries=new Map();
  for(const slot of expected){
    const candidate=api.getFormalDailyChallengeCandidate(slot.formalId);if(!candidate)throw Error(`Missing formal slot ${slot.formalId}`);
    if(candidate.v3Evidence?.receiptSchemaVersion!==3)throw Error(`Old receipts cannot qualify the new v3 catalogue: ${slot.formalId}`);
    const bytes=await fs.readFile(candidate.proofReport),hash=fileSha256(bytes),receipt=JSON.parse(bytes);
    assertRegistryBinding(runtime,slot,candidate,receipt,hash);entries.set(slot.formalId,{candidate,receipt,hash});
  }
  const initialAudit=await auditV3Catalog(runtime,[...entries.values()].map(row=>row.receipt),{expectFull:true});
  requireCompleteCatalog(initialAudit,expected);
  const before=levelSha256(api.LEVELS),rows=[],files=[],freshReceipts=[];
  const bindings={...runtime.toolchainBindings,...runtime.designBindings,...productionBindings};
  for(const file of ['tools/daily-challenge/formal-v3/verify-runtime.mjs','tools/daily-challenge/formal-v3/emit-catalog.mjs','tools/daily-challenge/formal-v2/emit-catalog.mjs'])
    bindings[file]=fileSha256(await fs.readFile(file));
  await fs.mkdir(output,{recursive:false});
  for(const slot of expected){
    const {candidate,receipt,hash}=entries.get(slot.formalId);
    const state=api.createDailyChallengeState('2026-10-08',slot.unlockLevel,api.LEVELS,11993);state.selected[slot.difficulty]=slot.slot-1;
    const assignment=api.getDailyChallengeAssignment(state,slot.difficulty);
    const {level:ignoredLevel,formalId,...metadata}=candidate;
    const expectedAssignment={...metadata,id:formalId,catalogRevision:api.FORMAL_DAILY_CHALLENGE_REVISION};
    if(levelSha256(assignment)!==levelSha256(expectedAssignment))throw Error(`Actual assignment differs from full selected registry metadata: ${slot.formalId}`);
    const level=api.cloneDailyChallengeLevel(assignment);
    if(!level||levelSha256(level)!==receipt.levelSha256)throw Error(`Actual runtime clone differs from receipt: ${slot.formalId}`);
    const tamperRejections=[];
    for(const [key,value]of Object.entries({sourceLevelId:0,layoutSha256:'0'.repeat(64),catalogRevision:'stale',id:'absent',minimumRepositionMoves:receipt.L+1})){
      if(api.cloneDailyChallengeLevel({...assignment,[key]:value})!==undefined)throw Error(`Tampered ${key} accepted by production clone`);
      tamperRejections.push(key);
    }
    // A successful prior object may be revalidated, but a blocked identity may
    // not continue. Use that receipt's finite lower budget, never inflate it.
    const fresh=await verifyBoundedCandidate(runtime,{...receipt,level},{ledgerDirectory,allowRevalidation:true,
      lowerBudget:receipt.lowerBound.result.budget});
    const result={...fresh,catalogVersion:CATALOG_VERSION,newestMechanism:slot.newestMechanism,slot:slot.slot,
      baseLevelSha256:receipt.baseLevelSha256,baseRouteSha256:receipt.baseRouteSha256,
      strength:structuredClone(receipt.strength),design:structuredClone(receipt.design),productionChanged:false,
      runtimeBinding:{formalRegistryIdentity:true,runtimeSchemaVersion:2,proofReceiptSchemaVersion:3,
        catalogRevision:api.FORMAL_DAILY_CHALLENGE_REVISION,assignment,bindings,sourceRegistrySha256:before,
        previousReceipt:candidate.proofReport,previousReceiptSha256:hash,productionV3Evidence:candidate.v3Evidence,
        originalObjectHashMatched:true,tamperRejections}};
    const file=`${output}/${slot.formalId}.json`;await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    freshReceipts.push(result);files.push(file);rows.push({formalId:slot.formalId,path:file,levelSha256:result.levelSha256,accepted:result.accepted,L:result.L,U:result.U,status:result.status});
    await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:3,scope:450,formalReady:false,entries:rows,files},null,2)+'\n');
    console.log(JSON.stringify({checked:rows.length,...rows.at(-1)}));
  }
  if(levelSha256(api.LEVELS)!==before)throw Error('Daily verification mutated the campaign registry');
  for(const [file,hash]of Object.entries(bindings))if(fileSha256(await fs.readFile(file))!==hash)throw Error(`Bound runtime or tool changed during verification: ${file}`);
  for(const {candidate,hash}of entries.values())if(fileSha256(await fs.readFile(candidate.proofReport))!==hash)throw Error(`Prior receipt changed during verification: ${candidate.formalId}`);
  const audit=await auditV3Catalog(runtime,freshReceipts,{expectFull:true});let error;
  try{requireCompleteCatalog(audit,expected);}catch(failure){error=failure;}
  const report={schemaVersion:3,catalogVersion:CATALOG_VERSION,scope:450,
    status:error?'FORMAL_V3_RUNTIME_VERIFICATION_FAILED':'FORMAL_V3_RUNTIME_VERIFIED_AWAITING_POINTER_TIME',
    formalReady:false,pointerValidated:false,timeValidated:false,productionChanged:false,ruleVersion:runtime.boundedRuleVersion,
    bindings,catalogRevision:api.FORMAL_DAILY_CHALLENGE_REVISION,sourceRegistryUnchanged:true,rows,files,audit};
  await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  if(error)throw error;return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const[output]=process.argv.slice(2);if(!output)throw Error('Usage: verify-runtime.mjs new-evidence-directory');
  const report=await verifyProductionRuntime(output);console.log(JSON.stringify({scope:report.scope,status:report.status}));
}
