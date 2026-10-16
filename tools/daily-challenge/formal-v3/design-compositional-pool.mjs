import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { independentReplay } from '../formal-v2/contract.mjs';
import { loadBoundedRuntime, boundedPlainTask, boundedBudget, createAttemptLedger, designFingerprints } from './bounded-proof.mjs';
import { compareLayouts } from './diversity.mjs';
import { digest, orbitFootprintArea, bodyFootprint, plainGameplayFingerprint, boardCells } from './diversity-layout-factory.mjs';
import { buildCompositionalCandidate, COMPOSITIONAL_FACTORY_VERSION as FACTORY_VERSION } from './design-compositional-factory.mjs';

const root = 'deliverables/daily-formal-v3-20261008/design';
const label = process.env.DESIGN_V3_LABEL ?? 'global-01';
const directory = `${root}/${label}`;
if (fs.existsSync(directory)) throw Error('Use a new batch label; retain all prior evidence');
const manifest = JSON.parse(fs.readFileSync('docs/rules/manifest.json'));
if (!['1.154.0', '1.155.0'].includes(manifest.activeVersion)) throw Error('Review newly active rule before generating');
const baseline = JSON.parse(fs.readFileSync(`${root}/mainline-baseline-catalog.json`));
const runtime = await loadBoundedRuntime();
const referencePaths=(process.env.DESIGN_V3_REFERENCES??'global-pilot-02/candidate-0300.json,wide-rect-06/candidate-0379.json,axial2-rect-10/candidate-0159.json,bar-gen3-09/candidate-0388.json,axial3-global-10/candidate-0205.json,axial2-rect-10/candidate-0000.json,bar-gen3-09/candidate-0155.json,axial2-rect-10/candidate-0631.json').split(',');
const references=referencePaths.map(relative=>{const path=root+'/'+relative,bytes=fs.readFileSync(path),packet=JSON.parse(bytes);if(!packet.accepted)throw Error('Reference is not recorded successful');return{path,packet,sha256:createHash('sha256').update(bytes).digest('hex')};});
const ledger=await createAttemptLedger('deliverables/daily-formal-v3-20261008/proof/attempts');
const failedParents=new Map();
const ids = (process.env.DESIGN_V3_SOURCES ?? '3,7,14,18,31,50,52,100,151,196,200,13,118,187').split(',').map(Number);
const attemptsPerSource = Number(process.env.DESIGN_V3_ATTEMPTS ?? 24);
const acceptedQuota=Number(process.env.DESIGN_V3_ACCEPTED_QUOTA??0);
const irregular = process.env.DESIGN_V3_IRREGULAR === '1';
const shapeProfile=process.env.DESIGN_V3_SHAPE_PROFILE??'balanced';
const primaryExitQuota=Number(process.env.DESIGN_V3_PRIMARY_EXITS??3);
const reservedGeneratorBerths=Number(process.env.DESIGN_V3_GENERATOR_BERTHS??0),paletteSize=Number(process.env.DESIGN_V3_PALETTE??8);
const stateLimit = 10000, transitionLimit = Number(process.env.DESIGN_V3_TRANSITIONS ?? 3000000);
const microLimit=Number(process.env.DESIGN_V3_MICRO_STATES??1000000),timeLimit=Number(process.env.DESIGN_V3_MILLISECONDS??10000);
if (!Number.isSafeInteger(attemptsPerSource) || attemptsPerSource < 1 || attemptsPerSource > 1000 || !Number.isSafeInteger(transitionLimit) || transitionLimit < 1 || transitionLimit > 10000000
  ||!Number.isSafeInteger(microLimit)||microLimit<1||microLimit>3000000||!Number.isSafeInteger(timeLimit)||timeLimit<1||timeLimit>30000) throw Error('Invalid finite limits');
if(!['balanced','dense','small-irregular','bar-mix','axial-bars'].includes(shapeProfile)||![2,3,4].includes(primaryExitQuota))throw Error('Unknown full-board shape profile or primary exit quota');
if(ids.length*attemptsPerSource>1000)throw Error('A finite design batch may construct at most 1000 source/seed objects');
const rows = [], accepted = [], seen = new Set(), seenPartitions = new Set(), compared = [], oldPool = [];
const readPrior = directory => {
  for (const item of fs.readdirSync(directory, { withFileTypes:true })) {
    const path=`${directory}/${item.name}`;
    if(item.isDirectory())readPrior(path);
    else if(/^candidate-.*\.json$/.test(item.name)) {
      let packet;try{packet=JSON.parse(fs.readFileSync(path));}catch{continue;}if(!packet.level)continue;
      seen.add(plainGameplayFingerprint(packet.level));seenPartitions.add(digest(packet.level.blocks.map(bodyFootprint).sort()));
      if(packet.accepted)compared.push(packet.level);
    }
  }
};
readPrior(root);
const oldIndex=JSON.parse(fs.readFileSync('deliverables/daily-formal-v2-20261007/final-qualified/index.json'));
for(const entry of oldIndex.entries)oldPool.push(JSON.parse(fs.readFileSync(entry.path)).level);
// The pilot diversity ceilings are engineering filters, not user-approved
// permanent rules. Root applies the separate final-pool diversity contract.
const sourceSimilarityCeiling = .55, poolSimilarityCeiling = .65, oldPoolSimilarityCeiling = .75;
const hashFile = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex');
fs.mkdirSync(directory, { recursive: true });
for(const name of ['diversity-layout-factory.mjs','design-compositional-pool.mjs','design-compositional-factory.mjs','bounded-proof.mjs','diversity.mjs'])fs.copyFileSync(`tools/daily-challenge/formal-v3/${name}`,`${directory}/${name}.snapshot`);
const inputBindings=['tools/daily-challenge/formal-v3/diversity-layout-factory.mjs','tools/daily-challenge/formal-v3/design-compositional-pool.mjs','tools/daily-challenge/formal-v3/design-compositional-factory.mjs',`${root}/mainline-baseline-catalog.json`].map(path=>({path,sha256:hashFile(path)}));
const write = status => fs.writeFileSync(`${directory}/report.json`, JSON.stringify({ status, factoryVersion: FACTORY_VERSION,
  ruleVersion: manifest.activeVersion, productionChanged: false, formalReady: false, sourceIds: ids, attemptsPerSource,acceptedQuota,irregular,reservedGeneratorBerths,paletteSize,shapeProfile,primaryExitQuota,
  budgets: { maxDiscoveredBoardStates: stateLimit, maxExpandedBoardStates: stateLimit, maxTransitions: transitionLimit, maxMicroStates:microLimit,maxMilliseconds:timeLimit, separateConstructionNodes: 10000 },
  proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
  exploratoryDiversityFilters: { sourceSimilarityCeiling, poolSimilarityCeiling, oldPoolSimilarityCeiling, allEightGlobalSymmetries: true }, rows, accepted,
  inputBindings,referenceBindings:references.map(({path,sha256})=>({path,sha256})) }, null, 2) + '\n');
for (let attempt = 0; attempt < attemptsPerSource; attempt++) for (const sourceId of ids) {
  if(acceptedQuota&&accepted.length>=acceptedQuota){write('FINITE_DESIGN_BATCH_FINISHED_AT_QUOTA');process.exit(0);}
  if (fs.existsSync(`${root}/STOP`)) { write('STOPPED_BY_COORDINATOR'); process.exit(0); }
  const source = baseline.rows.find(r => r.sourceLevelId === sourceId)?.level;
  if (!source) throw Error('Unknown source '+sourceId);
  if(digest(source)!==digest(runtime.LEVELS.find(l=>l.id===sourceId)))throw Error('Archived mainline source no longer matches current source '+sourceId);
  const serial = rows.length, seed = (Math.imul(sourceId + 711, 8191) + attempt * 6359 + [...label].reduce((n, c) => n + c.charCodeAt(0) * 713, 0)) >>> 0;
  const choices=references.map(ref=>({ref,score:Math.abs(ref.packet.level.width-source.width)+Math.abs(ref.packet.level.height-source.height)+Math.abs(boardCells(ref.packet.level).length-boardCells(source).length)*.08})).sort((a,b)=>a.score-b.score).slice(0,4);
  const reference=choices[(attempt+sourceId)%choices.length].ref;
  const candidate = buildCompositionalCandidate(source,reference.packet,runtime,{seed,maxNodes:10000,maxTransitions:10000,irregular,reservedGeneratorBerths,paletteSize,primaryExitQuota,
    referencePath:reference.path,referenceFileSha256:reference.sha256,referenceExitFieldMode:process.env.DESIGN_V3_REFERENCE_EXITS??'none',...(process.env.DESIGN_V3_SHAPE_PROFILE?{shapeProfile}:{})});
  const row = { serial, sourceLevelId: sourceId, seed, status: 'REJECTED_CONSTRUCTION', reason: candidate.reason ?? null,
    reference: candidate.reference??null, construction: candidate.construction ?? { partitionSearch: candidate.partitionSearch, colouringSearch: candidate.colouringSearch, nodes: candidate.nodes, transitions: candidate.transitions } };
  rows.push(row);
  if (!candidate.ok) { write('FINITE_DESIGN_BATCH_RUNNING'); continue; }
  const { level } = candidate;
  const partition = digest(level.blocks.map(bodyFootprint).sort()), gateConfiguration = digest(level.gates.map(g => [g.color, g.side, g.offset, g.size]).sort());
  const fingerprint = plainGameplayFingerprint(level);
  Object.assign(row, { fingerprint, partitionSha256: partition, gateConfigurationSha256: gateConfiguration,
    sourceFootprintAreaRetained: orbitFootprintArea(source, level),
    nearestExistingPoolArea: Math.max(0, ...compared.map(x => compareLayouts(x, level).footprintSimilarity)),
    nearestOldV2PoolArea: Math.max(0, ...oldPool.map(x => compareLayouts(x, level).footprintSimilarity)) });
  const path = `${directory}/candidate-${String(serial).padStart(4,'0')}.json`;
  const packet = { status: 'UNVERIFIED_GLOBAL_RELAYOUT', accepted: false, formalReady: false,
    ruleVersion:manifest.activeVersion,proofToolchainSha256:runtime.toolchainSha256,
    sourceLevelId: sourceId, sourceLevelSha256: candidate.sourceLevelSha256,
    level, levelSha256: candidate.levelSha256, factoryVersion: FACTORY_VERSION,
    provenance: candidate.construction, attemptedProof: false, pointerValidated: false, timeValidated: false };
  row.path = path;
  if (seen.has(fingerprint) || seenPartitions.has(partition)) row.reason = 'duplicate-gameplay-input-or-partition';
  else if (row.sourceFootprintAreaRetained > sourceSimilarityCeiling) row.reason = 'source-too-similar';
  else if (row.nearestExistingPoolArea > poolSimilarityCeiling) row.reason = 'pool-too-similar';
  else if (row.nearestOldV2PoolArea > oldPoolSimilarityCeiling) row.reason = 'old-v2-pool-too-similar';
  else {
    seen.add(fingerprint); seenPartitions.add(partition);
    const fingerprints=designFingerprints(level),previous=failedParents.get(sourceId);
    if(previous&&(previous.shapeSha256===fingerprints.shapeSha256||previous.colorSha256===fingerprints.colorSha256)){
      row.reason='failed-source-requires-new-shapes-and-colours';packet.failureReason=row.reason;
      fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});write('FINITE_DESIGN_BATCH_RUNNING');continue;
    }
    let attempt;
    try{attempt=await ledger.claim(level,{...(previous?{redesignOf:previous.designSha256}:{})});}
    catch(error){row.reason=error.message;packet.failureReason=row.reason;fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});write('FINITE_DESIGN_BATCH_RUNNING');continue;}
    packet.attempt=attempt;
    // One combined exhaustive search provides a lower-floor result and, if
    // found, a complete upper witness. Never resume/extend a budgeted input.
    const result = boundedPlainTask(level, runtime, { floor: 16, searchUpper: 64,
      ...boundedBudget({maxStates: stateLimit, maxTransitions: transitionLimit, maxMicroStates:microLimit,maxMilliseconds:timeLimit}) });
    packet.attemptedProof = true; packet.proof = result;
    if (result.discoveredStates > stateLimit || result.exploredStates > stateLimit) throw Error('Board-state budget overshoot');
    if(!Number.isSafeInteger(result.rawFullBoardStates)||result.rawFullBoardStates!==result.discoveredStates||!Number.isSafeInteger(result.rawExploredStates)||result.rawExploredStates!==result.exploredStates)throw Error('Current factory requires raw board accounting before quotient/closure');
    Object.assign(row, { proof: { status: result.status, states: result.discoveredStates, expanded: result.exploredStates,
      rawFullBoardStates:result.rawFullBoardStates,rawExploredStates:result.rawExploredStates,
      quotientDiscoveredStates:result.quotientDiscoveredStates,quotientExploredStates:result.quotientExploredStates,
      transitions: result.attemptedTransitions,microStates:result.microDiscoveredStates,microExpanded:result.microExploredStates, termination: result.routeTermination ?? result.termination, U: result.cost ?? null, certifiedFloor: result.certifiedFloor } });
    if (result.drags) {
      packet.drags = result.drags;
      packet.replay = runtime.replayRevisedRoute(level, result.drags);
      packet.independentReplay=independentReplay(runtime,level,result.drags,{});
      const U = packet.replay.nonClearingDrags, L = result.certifiedFloor;
      if (packet.replay.valid && packet.replay.complete && packet.independentReplay.valid && packet.independentReplay.complete
        && !packet.independentReplay.failed && packet.independentReplay.nonClearingDrags===U && L >= 16 && U >= L) {
        const difficulty = U <= 20 ? 1 : U <= 30 ? 2 : 3;
        if (L >= [0,16,21,31][difficulty]) {
          Object.assign(packet, { accepted: true, status: 'EXPLORATORY_SAME_OBJECT_LU_PENDING_V3_CONTRACT', difficulty, L, U });
          Object.assign(row, { status: packet.status, difficulty, L, U, reason: null });
          accepted.push({ path, sourceLevelId: sourceId, difficulty, L, U, partitionSha256: partition, gateConfigurationSha256: gateConfiguration });
          compared.push(level);
        } else { row.status = 'UNPROVEN_TARGET_BAND'; row.reason = 'relaxed-lower-does-not-reach-actual-upper-band'; }
      } else { row.status = 'ROUTE_BELOW_TARGET_OR_INVALID'; row.reason = packet.replay.valid && packet.replay.complete ? 'complete-shortcut-below-16' : 'actual-replay-invalid'; }
    } else { row.status = 'NO_COMPLETE_UPPER'; row.reason = result.routeTermination ?? result.termination; }
    if (!packet.accepted) packet.status = row.status;
    await ledger.finish(attempt,{...packet,lowerBound:{result},route:{search:result}});
    if(!packet.accepted)failedParents.set(sourceId,fingerprints);
  }
  packet.failureReason = row.reason;
  fs.writeFileSync(path, JSON.stringify(packet, null, 2) + '\n', { flag: 'wx' });
  write('FINITE_DESIGN_BATCH_RUNNING');
  if (packet.accepted || serial % 20 === 0) console.log(JSON.stringify({ label, serial, sourceId, status: row.status, proof: row.proof, accepted: accepted.length }));
}
write('FINITE_DESIGN_BATCH_FINISHED');
console.log(JSON.stringify({ label, attempts: rows.length, completeObjects: rows.filter(r => r.path).length, accepted: accepted.length, bands: [1,2,3].map(d => ({ difficulty:d, count:accepted.filter(x=>x.difficulty===d).length })) }));
