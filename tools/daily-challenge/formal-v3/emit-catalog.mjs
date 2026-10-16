import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {levelSha256,BANDS} from '../formal-v2/contract.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {independentPartitionSha256} from '../formal-v2/geometry.mjs';
import {catalogModule as explicitSchema2Module} from '../formal-v2/emit-catalog.mjs';
import {loadV3CatalogRuntime,auditV3Catalog,CATALOG_VERSION} from './catalog-contract.mjs';

export const fileSha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function requireCompleteCatalog(audit,expected){
  if(audit?.schemaVersion!==3||audit.catalogVersion!==CATALOG_VERSION||audit.scope!==450||audit.rows?.length!==450
    ||audit.verified!==450||audit.missing!==0||audit.allDesignAndMathematicsVerified!==true)
    throw Error('A complete 450-slot v3 design, strength and bounded-proof catalogue is required');
  if(!Array.isArray(audit.duplicateIds)||audit.duplicateIds.length||!Array.isArray(audit.unrecognized)||audit.unrecognized.length
    ||audit.diversity?.status!=='DIVERSITY_450_VERIFIED')throw Error('Duplicate, unknown or insufficiently diverse catalogue');
  if(audit.rows.some(row=>row.status!=='BOUNDED_AND_STRENGTH_VERIFIED_AWAITING_POINTER'||!Array.isArray(row.issues)||row.issues.length))
    throw Error('All 450 rows require intact same-object v3 certification');
  if(new Set(audit.rows.map(row=>row.formalId)).size!==450)throw Error('Duplicate formal slots');
  if(expected){
    if(expected.length!==450)throw Error('Runtime must declare 450 expected slots');
    const byId=new Map(audit.rows.map(row=>[row.formalId,row]));
    for(const slot of expected)for(const key of ['formalId','stageKey','unlockLevel','newestMechanism','difficulty','slot'])
      if(byId.get(slot.formalId)?.[key]!==slot[key])throw Error(`Changed slot identity ${slot.formalId}:${key}`);
  }
}

export function v3EvidenceBinding(receipt){
  return{catalogVersion:CATALOG_VERSION,receiptSchemaVersion:3,proofContractVersion:receipt.contractVersion,
    ruleVersion:receipt.ruleVersion,ruleSha256:receipt.ruleSha256,dailyBudgetRuleVersion:receipt.dailyBudgetRuleVersion,
    dailyBudgetRuleSha256:receipt.dailyBudgetRuleSha256,designToolchainSha256:receipt.design.designToolchainSha256,
    designSha256:levelSha256(receipt.design),strengthSha256:levelSha256(receipt.strength),
    timeScheduleSha256:receipt.timeSchedule?levelSha256(receipt.timeSchedule):null};
}

/** Pure serialization helper. Only emitCatalog's fresh full audit authorizes an
 * output file. Schema 2 describes the runtime transport; v3Evidence explicitly
 * identifies the stronger schema 3 proof receipt and its quality bindings. */
export function registryCandidate(runtime,slot,receipt,file,hash){
  const source=runtime.LEVELS.find(level=>level.id===receipt.sourceLevelId);if(!source)throw Error('Missing current mainline source');
  const labels={1:'难',2:'超难',3:'超超难'};
  return{formalId:slot.formalId,slot:slot.slot,sourceLevelId:receipt.sourceLevelId,variant:slot.slot-1,
    sourceDifficulty:source.difficulty,dailyDifficulty:labels[slot.difficulty],timeSeconds:receipt.level.timeSeconds,
    minimumRepositionMoves:receipt.L,verifiedSolutionRepositionMoves:receipt.U,
    proofTargetFloor:BANDS[slot.difficulty].lower,proofLowerBound:receipt.L,proofUpperBound:receipt.U,
    proofStatus:'same-object-verified-v2',proofSchemaVersion:2,routeReplayComplete:true,layoutFactory:'explicit-certified-v2',
    layoutSha256:receipt.levelSha256,sourceLayoutSha256:receipt.sourceLevelSha256,
    layoutDiffersFromSource:receipt.levelSha256!==levelSha256(source),geometrySha256:independentPartitionSha256(receipt.level),
    sourceGeometrySha256:independentPartitionSha256(source),geometryDiffersFromSource:independentPartitionSha256(receipt.level)!==independentPartitionSha256(source),
    dailyMechanisms:runtime.mechanismsUsedByDailyLevel(receipt.level),sourceMechanisms:runtime.mechanismsUsedByDailyLevel(source),
    proofReport:file,proofReportSha256:hash,routeSha256:receipt.routeSha256,toolchainSha256:receipt.toolchainSha256,
    v3Evidence:v3EvidenceBinding(receipt),level:structuredClone(receipt.level)};
}

export function catalogModule(stages,revision){
  const base=explicitSchema2Module(stages,revision);
  if(!base.includes('  level: LevelSpec;'))throw Error('Schema 2 serializer interface changed');
  return base.replace('formal-v2/emit-catalog.mjs','formal-v3/emit-catalog.mjs')
    .replace('// Full objects and fresh lower/upper bounds are bound to the same SHA-256.',
      '// Schema 2 is runtime transport only. v3Evidence binds schema 3 bounded proofs, design and mechanism strength.')
    .replace('  level: LevelSpec;',
      '  v3Evidence: { catalogVersion: string; receiptSchemaVersion: 3; proofContractVersion: string; ruleVersion: string; ruleSha256: string; dailyBudgetRuleVersion: string; dailyBudgetRuleSha256: string; designToolchainSha256: string; designSha256: string; strengthSha256: string; timeScheduleSha256: string | null };\n  level: LevelSpec;');
}

export async function readSelectedReceipts(indexFile){
  const index=JSON.parse(await fs.readFile(indexFile,'utf8'));
  if(!Array.isArray(index.files)||index.files.length!==450||new Set(index.files).size!==450
    ||index.files.some(file=>typeof file!=='string'||!file))throw Error('Exactly 450 distinct explicit v3 receipt files are required');
  const entries=[];for(const file of index.files){const bytes=await fs.readFile(file);entries.push({file,hash:fileSha256(bytes),receipt:JSON.parse(bytes)});}
  return{index,entries};
}

export async function emitCatalog(indexFile,output){
  const {index,entries}=await readSelectedReceipts(indexFile),runtime=await loadV3CatalogRuntime();
  const expected=expectedDailySlots(runtime.MECHANISM_GUIDE),audit=await auditV3Catalog(runtime,entries.map(row=>row.receipt),{expectFull:true});
  requireCompleteCatalog(audit,expected);
  const byId=new Map(entries.map(row=>[row.receipt.formalId,row]));
  const labels={1:'难',2:'超难',3:'超超难'};
  const stages=runtime.MECHANISM_GUIDE.map(mechanism=>{
    const stageKey=`mechanisms-${mechanism.id}-${mechanism.unlockLevel}`;
    const difficulties=Object.fromEntries([1,2,3].map(difficulty=>{
      const candidates=expected.filter(slot=>slot.stageKey===stageKey&&slot.difficulty===difficulty).map(slot=>{
        const {receipt,file,hash}=byId.get(slot.formalId);return registryCandidate(runtime,slot,receipt,file,hash);
      });
      if(candidates.length!==10||candidates.some(c=>!c.layoutDiffersFromSource||!c.geometryDiffersFromSource))throw Error('Each pool requires ten genuinely rearranged objects');
      const uniqueSourceCount=new Set(candidates.map(c=>c.sourceLevelId)).size;
      return[difficulty,{label:labels[difficulty],candidates,uniqueSourceCount,repeatedSourceVariants:10-uniqueSourceCount}];
    }));
    return{stageKey,unlockLevel:mechanism.unlockLevel,newestMechanism:mechanism.id,
      unlockedMechanisms:runtime.MECHANISM_GUIDE.filter(m=>m.unlockLevel<=mechanism.unlockLevel).map(m=>m.id),difficulties};
  });
  for(const {file,hash}of entries)if(fileSha256(await fs.readFile(file))!==hash)throw Error(`Receipt changed during emission: ${file}`);
  for(const [file,hash]of Object.entries({...runtime.toolchainBindings,...runtime.designBindings}))
    if(fileSha256(await fs.readFile(file))!==hash)throw Error(`Tool changed during emission: ${file}`);
  const revision=levelSha256(stages),module=catalogModule(stages,revision);
  await fs.mkdir(output,{recursive:false});
  await fs.writeFile(`${output}/formalDailyChallengeData.ts`,module,{flag:'wx'});
  await fs.writeFile(`${output}/catalog.json`,JSON.stringify({schemaVersion:2,evidenceSchemaVersion:3,catalogVersion:CATALOG_VERSION,revision,stages},null,2)+'\n',{flag:'wx'});
  const manifest={schemaVersion:3,runtimeSchemaVersion:2,catalogVersion:CATALOG_VERSION,scope:450,revision,indexFile,
    ruleVersion:runtime.boundedRuleVersion,status:'FULL_V3_CATALOG_STAGED_AWAITING_RUNTIME_POINTER_TIME',formalReady:false,productionChanged:false,
    moduleSha256:fileSha256(module),files:index.files,toolchainSha256:runtime.toolchainSha256,designToolchainSha256:runtime.designToolchainSha256,audit};
  await fs.writeFile(`${output}/manifest.json`,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});return manifest;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const[indexFile,output]=process.argv.slice(2);if(!indexFile||!output)throw Error('Usage: emit-catalog.mjs selected-v3-index.json new-output-directory');
  const result=await emitCatalog(indexFile,output);console.log(JSON.stringify({output,status:result.status,scope:result.scope,revision:result.revision}));
}
