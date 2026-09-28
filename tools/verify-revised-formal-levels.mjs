import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { verifyRulesLock } from './verify-rules-lock.mjs';

// This verifier is intentionally bounded to this independently reviewed batch.
// Expanding it requires new reviewed evidence, not deleting a failing assertion.
const IDS = [21,22,23,24,25,26,27,28,29,30,31,34,50,52,58,59,60,135,152];
const AUDIT = '.codex-temp/formal-revised-v110/source-audit.json';
const AUDIT_SHA = '5fb5ffa6b2cb40e00eba3e47ced1390f84cab6ddf676a67251eceb46b7ce53a8';
const BASE = '.codex-temp/formal-revised-v110/pre-integration.json';
const BASE_SHA = '00b7d87ee7a4bf835ce78bab65eb8420232bac5ab68f42c4743a589960089dae';
const PREVIEW = 'deliverables/revised-preview-v160-2026-09-22T04-06-34-018Z/review.json';
const PREVIEW_SHA = 'ce869178232519ef17371e23695062814b89371249cecf8b67853581ef1f9ac1';
const TRUTH = 'deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const DIRECT = '.codex-temp/video-audit-21-30-independent/audit-lv021-030.json';
const GAMEPLAY = ['mechanismRules','width','height','playable','blocked','seams','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy','shutters','generators','elevators','conveyors'];
const METADATA = ['id','name','difficulty','timeSeconds','reward','parMoves','featureIntro'];
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k,canonical(value[k])])) : value;
const digest = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex');
const pick = (value,fields) => Object.fromEntries(fields.filter(k => Object.hasOwn(value,k)).map(k => [k,value[k]]));
const expectedDifficulty = id => id%10===0 ? 'super' : [3,5,8].includes(id%10) ? 'hard' : 'normal';

export async function verifyFormalBatch() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  assert.equal(path.resolve(process.cwd()),root,'Run from the project root');
  const report = { schemaVersion:1, ruleVersion:'1.10.0', runtimeProfile:'revised-2026-09-21-v1.2',
    createdAt:new Date().toISOString(), status:'running', rows:[], failures:[], inputs:{}, historicalNonSourceDrift:[],
    scope:{campaign:200,requested:180,expectedIntegratedIds:IDS},
    limitations:{sourceFactsVisuallyReReviewedThisRun:false,formalUiOrPointerValidated:false,originalFailClockValidated:false,
      firstIntroductionCertified:false,lowerBoundCertified:false,timeAndStarsRecalibrated:false,releaseApproved:false,
      note:'Fresh final LEVELS model replay is not UI, wall-clock, lower-bound, human-pacing, or release certification. Old Pointer evidence remains historical.'} };
  const normalized = p => path.relative(root,path.resolve(root,p)).replaceAll('\\','/').startsWith('../')
    ? path.resolve(root,p).replaceAll('\\','/') : path.relative(root,path.resolve(root,p)).replaceAll('\\','/');
  function bind(p,expected) {
    const key=normalized(p), bytes=fs.readFileSync(path.resolve(root,p)), sha256=digest(bytes);
    if (expected) assert.equal(sha256,expected.toLowerCase(),`Evidence drift: ${p}`);
    if (report.inputs[key]) assert.equal(sha256,report.inputs[key].sha256,`Concurrent input drift: ${p}`);
    else report.inputs[key]={sha256,bytes:bytes.length};
    return bytes;
  }
  const json=(p,expected)=>JSON.parse(bind(p,expected));
  const oldSha=b=>typeof b==='string'?b:b.sha256;
  const sourceNonFact = p => p==='docs/rules/manifest.json' || p==='src/game/artManifest.ts';
  function bindSource(p,b) {
    const expected=oldSha(b).toLowerCase(), actual=digest(bind(p));
    if(actual!==expected && sourceNonFact(p)) report.historicalNonSourceDrift.push({path:p,expected,actual,
      reason:p==='docs/rules/manifest.json'?'Active rule version advanced; immutable old rule documents remain locked.':'Historical UI lookup binding; current art support and bytes are checked independently.'});
    else assert.equal(actual,expected,`Source fact/evidence drift: ${p}`);
  }
  try {
    bind('tools/verify-revised-formal-levels.mjs'); bind('tools/verify-rules-lock.mjs');
    const manifest=json('docs/rules/manifest.json');
    for(const v of manifest.versions) bind(v.document);
    bind('AGENTS.md');
    const lock=verifyRulesLock(); assert(lock.ok && lock.activeVersion==='1.10.0');
    assert.equal(lock.verified.length,12); report.ruleLock=lock;
    const audit=json(AUDIT,AUDIT_SHA), baseline=json(BASE,BASE_SHA);
    assert.deepEqual(audit.sourceReviewedIds,IDS); assert.deepEqual(baseline.rows.map(r=>r.levelId),IDS);
    const progress=json(baseline.progressPath,baseline.expectedProgress);
    assert.deepEqual(progress.rows.filter(r=>r.status==='source-reviewed').map(r=>r.levelId),IDS);
    const originalPreview=json(PREVIEW,PREVIEW_SHA);
    const truth=json(TRUTH), direct=json(DIRECT); assert(direct);

    // Hash the exact source bytes supplied to esbuild, before evaluation. This
    // includes model, final overlays and current UI shape/art dependencies.
    const bundle=await build({stdin:{resolveDir:root,contents:`
      export { LEVELS, LEVELS_BEFORE_REVISED_REVIEWED_INTEGRATION as BEFORE } from './src/core/levels.ts';
      export { levelStarTargets } from './src/core/levelStarConditions.ts';
      export { PuzzleModel } from './src/core/PuzzleModel.ts';
      export { auditRevisedCandidate, measureRevisedMechanismInventory } from './src/core/revisedCandidateAudit.ts';
      export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
      export { auditCandidateBlockArt } from './tools/revised-candidate-block-art.mjs';
      export { GAME_ART } from './src/game/artManifest.ts';
      export { REVISED_MECHANISM_ART_PATHS } from './src/game/revisedMechanismArt.ts';
      export { measureDesignFacts } from './tools/revised-preview-validation-v160.mjs';
      export { auditStrictMechanismAlignment } from './tools/strict-mechanism-alignment-v190.mjs';
      export { countIrregularBlockShapes } from './tools/strict-mechanism-alignment-v170.mjs';
      export { auditStrictBoardAlignment } from './tools/strict-board-alignment-v170.mjs';
      export { auditOpeningCoverage } from './tools/revised-opening-coverage.mjs';
      export { auditGateSpanLimits } from './tools/revised-gate-span-limits.mjs';
      export { loadMechanismInventory, applyInventoryReview } from './tools/revised-source-inventory.mjs';
      export { auditSourceLevel } from './tools/audit-revised-generation-inputs.mjs';
    `},bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{
      name:'fingerprint-input-bytes',setup(b){
        b.onResolve({filter:/^esbuild$/},()=>({path:import.meta.resolve('esbuild'),external:true}));
        b.onLoad({filter:/\.[cm]?[jt]sx?$/},args=>{
        // Preserve each helper's file identity/CLI guard in the in-memory bundle.
        const contents=bind(args.path).toString('utf8').replaceAll('import.meta.url',JSON.stringify(pathToFileURL(args.path).href));
        return {contents,loader:/\.tsx?$/.test(args.path)?'ts':'js',resolveDir:path.dirname(args.path)};
      });}
    }]});
    const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
    const assetPaths = value => typeof value==='string' ? [value] : Array.isArray(value)
      ? value.flatMap(assetPaths) : value && typeof value==='object' ? Object.values(value).flatMap(assetPaths) : [];
    const gameplayAssets=[...new Set([...assetPaths(api.GAME_ART.gameplay),...api.REVISED_MECHANISM_ART_PATHS])];
    for(const p of gameplayAssets) {
      assert(p.startsWith('assets/')&&!p.includes('..'),'Expected packaged gameplay asset');
      assert(bind(`public/${p}`).length>0,`Empty gameplay asset ${p}`);
    }
    report.assetScope={gameplayAssetCount:gameplayAssets.length,revisedMechanismAssetCount:api.REVISED_MECHANISM_ART_PATHS.length,
      bytesPresentAndBound:true,decodedPixelsOrAnimationVerified:false};
    assert.equal(api.LEVELS.length,200); assert.equal(api.BEFORE.length,200);
    assert.deepEqual(api.LEVELS.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
    assert.deepEqual(api.LEVELS.filter(l=>l.mechanismRules).map(l=>l.id),IDS,'Unexpected migration scope');
    const inventory=await api.loadMechanismInventory({root,truthSha256:report.inputs[TRUTH].sha256,directSha256:report.inputs[DIRECT].sha256});
    for(const[p,b]of Object.entries(inventory.bindings))bind(p,oldSha(b));
    const unchanged=[];
    for(const old of baseline.baseline) {
      const before=api.BEFORE.find(l=>l.id===old.id),level=api.LEVELS.find(l=>l.id===old.id);
      assert.equal(digest(before),old.sha256,`Pre-integration source changed Lv${old.id}`);
      if(!IDS.includes(old.id)) {
        assert.equal(digest(level),old.sha256,`Unauthorized change Lv${old.id}`);
        assert.deepEqual(api.levelStarTargets(level),old.starTargets);
        unchanged.push(old.id);
      }
    }
    assert.equal(unchanged.length,181); assert.deepEqual(unchanged,baseline.unchangedIds);

    for(const id of IDS) {
      const previous=baseline.rows.find(r=>r.levelId===id),bound=audit.results.find(r=>r.levelId===id);
      const evidence=json(previous.evidenceReport,previous.evidenceReportSha256),entry=evidence.rows.find(r=>r.levelId===id);
      const data=json(previous.dataPath,previous.dataSha256),level=api.LEVELS.find(l=>l.id===id);
      assert(entry.sourceAligned && entry.outlineAligned);
      assert.equal(digest(data.level),previous.previewCandidateSha256); assert.equal(digest(entry.level),previous.previewCandidateSha256);
      assert.deepEqual(data.drags??data.result?.drags,entry.drags); assert.deepEqual(entry.drags,previous.drags);
      assert.equal(digest(entry.drags),bound.routeSha256);
      assert.equal(digest(pick(level,GAMEPLAY)),previous.layoutSha256,`Final gameplay differs from reviewed candidate Lv${id}`);
      assert.deepEqual(pick(level,GAMEPLAY),pick(entry.level,GAMEPLAY));
      assert.deepEqual(Object.keys(level).filter(k=>!GAMEPLAY.includes(k)&&!METADATA.includes(k)),[],'Stale gameplay/metadata field retained');
      assert.equal(level.difficulty,expectedDifficulty(id)); assert.equal(level.name,previous.previous.name);
      assert.equal(level.timeSeconds,previous.previous.timeSeconds); assert.equal(level.reward,previous.previous.reward);
      assert(Number.isFinite(level.reward)); assert.deepEqual(level.featureIntro,previous.previous.featureIntro);
      const stars=api.levelStarTargets(level); assert.deepEqual(stars,previous.previous.starTargets);
      assert.equal(level.parMoves,stars.moveTarget); assert.equal(level.mechanismRules,report.runtimeProfile);
      assert(!level.blocks.some(b=>b.timedBombSeconds!==undefined),'A timed bomb needs a separate wall-clock witness');

      // Historical graphics need not equal today's UI. The independent source
      // review and its actual fact documents/videos/frames must still match.
      const source=json(bound.sourceReport,bound.sourceReportSha256);
      for(const[p,b]of Object.entries(source.bindings??{}))bindSource(p,b);
      for(const frame of bound.frameChecks)bind(frame.path,frame.sha256);
      for(const frame of source.evidence??[])bind(frame.path,frame.sha256);
      for(const[p,b]of Object.entries(evidence.files??{})) {
        if(/^(src|tools|public|art-source)\//.test(p) || /^(package|pnpm-lock)/.test(p) || p==='docs/rules/manifest.json')continue;
        bind(p,oldSha(b));
      }
      let sourceFacts=entry.sourceNormalizedFacts, iceItems;
      if(id<=30) {
        const reviewed=api.applyInventoryReview(truth.levels.find(r=>r.level===id),inventory.rows.get(id));
        const checked=api.auditSourceLevel(reviewed); assert.deepEqual(checked.evidenceGaps,[]); assert.deepEqual(checked.hardConflicts,[]);
        assert.deepEqual(checked.immutableSourceContract,entry.sourceFacts);
        assert.equal(digest({facts:entry.sourceFacts,cells:entry.sourceContract.originalMask,bindings:inventory.bindings}),entry.sourceContract.sha256);
        const ice=checked.immutableSourceContract.numericIce;
        if(ice.items.every(i=>typeof i.post_melt_shell==='boolean'))iceItems=ice.items;
        else {assert.equal(new Set(ice.values).size,1);assert(Number.isInteger(ice.post_melt_shell));iceItems=ice.values.map((value,i)=>({value,post_melt_shell:i<ice.post_melt_shell}));}
      } else {
        assert.deepEqual(source.sourceNormalizedFacts,sourceFacts,'Source facts must not come from candidate');
        assert.equal(entry.sourceContract.sha256,bound.sourceReportSha256);
        assert.equal(Object.keys(source.sourceInventory).length,15,'Fifteen explicit source observations required');
        for(const observation of Object.values(source.sourceInventory)) {
          assert(Number.isSafeInteger(observation.count)&&observation.count>=0&&observation.reason&&observation.evidencePaths?.length);
          for(const p of observation.evidencePaths)assert(source.bindings[p],`Unbound observation ${p}`);
        }
        const m=sourceFacts.mechanisms;
        iceItems=source.sourceFacts?.numericIce?.items??source.numericIceItems;
        if(!iceItems&&m.numericIce.postMeltShellCount===0)iceItems=m.numericIce.values.map(value=>({value,post_melt_shell:false}));
      }
      assert(iceItems?.every(i=>typeof i.post_melt_shell==='boolean'),'Unreviewed ice/shell pairing');
      assert.deepEqual(level.blocks.filter(b=>b.frozen>0).map(b=>`${b.frozen}:${(b.layers?.length??0)>1}`).sort(),iceItems.map(i=>`${i.value}:${i.post_melt_shell}`).sort());

      const model=new api.PuzzleModel(level);model.start();const opening=model.snapshot();
      const visible=opening.blocks.filter(b=>!b.shutterId||opening.shutters.find(s=>s.id===b.shutterId)?.revealed);
      const facts=api.measureDesignFacts(level,api);facts.opening=visible.length;
      facts.mechanisms.irregularBlocks={openingCount:api.countIrregularBlockShapes(visible),fullCount:api.countIrregularBlockShapes(level.blocks)};
      if(sourceFacts.mechanisms.keysLocks.groups)facts.mechanisms.keysLocks.groups=api.measureRevisedMechanismInventory(level).keyGroups.map(g=>({keyCount:g.keyCount,lockValues:g.lockCounts}));
      for(const k of ['width','height','opening','full'])assert.equal(facts[k],sourceFacts[k],`Source ${k} Lv${id}`);
      const mechanism=api.auditStrictMechanismAlignment({levelId:id,facts:sourceFacts},facts);
      assert(mechanism.sourceAligned,`Mechanism alignment Lv${id}: ${JSON.stringify(mechanism.blockedIssues)}`);
      const contract=structuredClone(entry.sourceContract),policy=mechanism.ordinaryExitPolicy;
      if(policy.allowed) {
        const plain=e=>e.kind==='ordinary'&&!e.frozen&&!e.star;let retained=0;
        assert.equal(contract.mechanisms.exits.filter(plain).length,policy.originalOrdinary);
        contract.mechanisms.exits=contract.mechanisms.exits.filter(e=>!plain(e)||retained++<policy.designOrdinary);
      }
      const spatial=api.auditRevisedCandidate(level,contract);
      const issues=spatial.issues.filter(i=>!(entry.sourceBoard.kind==='normal'&&i.code==='source-mask-reused'));
      assert.deepEqual(issues,[],`Spatial/quantity audit Lv${id}`);
      const oldOutline=originalPreview.rows.find(r=>r.levelId===id);
      let board;
      if(entry.sourceBoard.kind==='irregular'&&!oldOutline) {
        assert.equal(level.width,entry.sourceBoard.width);assert.equal(level.height,entry.sourceBoard.height);
        assert(spatial.measurements.leftRightSymmetric||spatial.measurements.upDownSymmetric);
        assert(!level.blocked?.length&&!level.seams?.length);
        board={outlineAligned:true,mode:'new-original-without-v160-baseline',baselineAbsent:true};
      }else {
        board=api.auditStrictBoardAlignment({source:entry.sourceBoard,candidate:level,preservedIrregular:oldOutline?{...oldOutline.level,evidence:PREVIEW_SHA}:undefined});
        assert(board.outlineAligned,`Board alignment Lv${id}`);
      }
      const coverage=api.auditOpeningCoverage(opening),gateSpan=api.auditGateSpanLimits(level),art=api.auditCandidateBlockArt(level);
      assert(coverage.passed&&gateSpan.passed&&art.passed,`Coverage/gates/art Lv${id}`);
      for(const item of art.requirements)bind(`public/${item.path.replace(/^\//,'')}`);
      const replay=api.replayRevisedRoute(level,entry.drags);
      assert(replay.valid&&replay.complete,`Final LEVELS route failed Lv${id}`);
      report.rows.push({levelId:id,finalLevelSha256:digest(level),reviewedLayoutSha256:previous.layoutSha256,
        source:{path:bound.sourceReport,sha256:bound.sourceReportSha256,originalReportVersion:entry.ruleVersion,report:previous.evidenceReport,reportSha256:previous.evidenceReportSha256},
        finalFacts:facts,sourceAligned:true,mechanismAlignment:mechanism,boardAlignment:board,
        spatial:{passed:true,issues,measurements:spatial.measurements},coverage,gateSpan,
        art:{passed:true,requirementCount:art.requirements.length},routeSha256:digest(entry.drags),replay,
        metadata:{timeSeconds:level.timeSeconds,reward:level.reward,name:level.name,difficulty:level.difficulty,stars,previous:previous.previous,
          actualTimeAndStarsPreserved:true,rewardPreserved:true,witnessMeetsMoveStar:replay.effectiveDrags<=stars.moveTarget,threeStarCalibrated:false},
        currentPointerValidated:false,firstIntroductionCertified:false,lowerBoundCertified:false,releaseApproved:false});
    }
    assert.equal(report.rows.reduce((n,r)=>n+r.replay.effectiveDrags,0),553);
    // Read-only negative controls exercise the same current validators. They
    // never modify source candidates, final LEVELS or the source reviews.
    const controls=[];
    const reject=(name,check)=>{assert(check(),`Negative control did not reject: ${name}`);controls.push({name,rejected:true});};
    const valid=api.LEVELS.find(l=>l.id===21), duplicate=structuredClone(valid);
    duplicate.gates.push({...duplicate.gates[0],id:'audit-duplicate-physical-gate'});
    reject('same-color-physical-exit',()=>api.auditRevisedCandidate(duplicate,{}).issues.some(i=>i.category!=='source'));
    const wrongShape=structuredClone(valid);wrongShape.blocks[0].shape.push([99,99]);
    reject('block-outside-board',()=>api.auditRevisedCandidate(wrongShape,{}).issues.some(i=>i.category!=='source'));
    const sourceFacts=structuredClone(report.rows[0].finalFacts);sourceFacts.mechanisms.irregularBlocks.fullCount++;
    reject('M11-source-count-mismatch',()=>!api.auditStrictMechanismAlignment({levelId:21,facts:sourceFacts},report.rows[0].finalFacts).sourceAligned);
    const badRoute=structuredClone(baseline.rows[0].drags);badRoute[0].blockId='missing-audit-block';
    reject('invalid-completion-route',()=>!api.replayRevisedRoute(valid,badRoute).valid);
    const cargo=structuredClone(api.LEVELS.find(l=>l.id===58));
    const cargoId=cargo.generators[0].queueBlockIds[0];
    assert.equal(typeof cargoId,'string');cargo.blocks.find(b=>b.id===cargoId).frozen=1;
    reject('frozen-generator-cargo',()=>api.auditRevisedCandidate(cargo,{}).issues.some(i=>i.category!=='source'));
    report.negativeControls=controls;
    const exitOnly=progress.rows.filter(r=>r.status!=='source-reviewed'&&r.dataPath).map(r=>r.levelId);
    const noCandidate=progress.rows.filter(r=>r.status!=='source-reviewed'&&!r.dataPath).map(r=>r.levelId);
    assert.equal(exitOnly.length,26);assert.equal(noCandidate.length,135);
    assert.deepEqual([...IDS,...exitOnly,...noCandidate].sort((a,b)=>a-b),Array.from({length:180},(_,i)=>i+21));
    report.unchanged={count:181,ids:unchanged,levels1to20Preserved:true};
    report.pending={total:161,exitOnlyNeedsFullAlignment:exitOnly,noPassingCandidate:noCandidate,
      knownConflict:[{levelId:39,reason:'Ten non-star ice exits exceed eight unique non-star colors; do not remove ice exits or expand palette.'}]};
    report.campaignSemanticSha256=digest(api.LEVELS);
    report.summary={finalLevelsPassed:19,totalRouteDrags:553,unchangedLevels:181,pendingIn21to200:161,
      sourceMechanismsAndBoardPassed:true,fullOpeningCoveragePassed:true,exitSpanAndUniqueColorPassed:true,artPassed:true,
      originalTimeStarsRewardPreserved:true,formalUiClockAndReleaseCertified:false};
    report.status='passed';
  } catch(error) {
    const safe=value=>String(value??'').replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'<in-memory module>');
    report.status='failed';report.failures.push({message:safe(error.message),stack:safe(error.stack)});
  }
  // A changed source/asset invalidates this run even when every replay passed.
  report.inputDrift=[];
  for(const[p,b]of Object.entries(report.inputs)) {
    let actual;try{actual=digest(fs.readFileSync(path.resolve(root,p)));}catch{actual=null;}
    if(actual!==b.sha256)report.inputDrift.push({path:p,expected:b.sha256,actual});
  }
  if(report.inputDrift.length){report.status='failed';report.failures.push({message:'Concurrent input drift; rerun against a stable snapshot.'});}
  report.completedAt=new Date().toISOString();
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=await verifyFormalBatch();
  const dir='.codex-temp/formal-revised-v110';fs.mkdirSync(dir,{recursive:true});
  const output=`${dir}/final-levels-verification-${report.createdAt.replaceAll(':','-').replaceAll('.','-')}.json`;
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:report.status,output,sha256:digest(fs.readFileSync(output)),summary:report.summary,
    failures:report.failures.map(f=>f.message),inputDrift:report.inputDrift}));
  if(report.status!=='passed')process.exitCode=1;
}
