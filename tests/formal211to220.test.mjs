import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { FORMAL_211_220_LEVELS, FORMAL_211_220_EVIDENCE, getFormal211to220LevelStrict } from '../src/core/formal211to220Data';
import { LEVELS } from '../src/core/levels';
import { replayRevisedRoute } from '../src/core/revisedLevelSearch';
import { matchFormalBlockShape } from '../src/game/formalBlockShapes';
import { loadApi, replay as replayTimed } from '../tools/remake191-200/replay.mjs';
import { loadSpatialApi } from '../tools/continuation211-optional-lift-domain.mjs';
import { liftPayload } from '../tools/continuation211-native-lift.mjs';
import { stationaryPayload } from '../tools/regeneration211-design/aux212/stationary-prefix.mjs';
import { hiddenPartitionProjection, auditPartitionCertificates } from '../tools/regeneration211-design/aux212/partition-audit.mjs';

const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])) : value;
const digest = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const json = (file) => JSON.parse(readFileSync(file,'utf8'));
const rawDigest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

async function expectPartition212Binding(level, source, record) {
  const p=source.lower.partition212,hash=digest(level),api=await loadSpatialApi();
  expect(source.lower).toMatchObject({status:'threshold-proven',thresholdProven:true,floor:11,sourceLevelSha256:hash,levelSha256:hash});
  expect(p).toMatchObject({coverId:'root212-top35',prefixGoalClears:10,sourceLevelSha256:hash});
  expect(p.prefix).toMatchObject({status:'threshold-proven',thresholdProven:true,floor:4,goalClears:10});
  expect(p.hidden).toMatchObject({status:'threshold-proven',thresholdProven:true,floor:7});
  const prefix=stationaryPayload(level,api,{goalClears:10});
  expect(p.prefixInput).toEqual(prefix);expect(digest(prefix)).toBe(p.prefixInputSha256);
  const original=json(p.rawCandidate),hidden=json(p.rawHidden);
  expect(rawDigest(p.rawCandidate)).toBe(p.rawCandidateSha256);expect(rawDigest(p.rawHidden)).toBe(p.rawHiddenSha256);
  expect(original.levelSha256).toBe(digest(original.level));expect(hidden.levelSha256).toBe(digest(hidden.level));
  expect(original.prefixInput).toEqual(stationaryPayload(original.level,api,{goalClears:10}));
  const withoutMetadata=value=>{const next=structuredClone(value);delete next.sourceLevelSha256;delete next.projectionLevelSha256;return next;};
  expect(withoutMetadata(prefix)).toEqual(withoutMetadata(original.prefixInput));
  const {goalClears,sourceLevelSha256,...rawPrefix}=p.prefix;
  expect(rawPrefix).toEqual(original.prefix);expect(sourceLevelSha256).toBe(hash);
  const projection=hiddenPartitionProjection(level,p.coverId);
  expect(p.hiddenProjection).toEqual(projection.level);expect(p.hiddenProjectionSha256).toBe(projection.sha256);
  const provedInput=json(p.hidden.input),options={floor:provedInput.floor,maxMilliseconds:provedInput.maxMilliseconds,maxStates:provedInput.maxStates};
  expect(liftPayload(projection.level,api,options).p).toEqual(provedInput);
  expect(digest(provedInput)).toBe(p.hidden.inputSha256);
  expect(p.hidden).toEqual(hidden.bound);
  expect(rawDigest(p.hidden.input)).toBe(p.hiddenInputRawSha256);expect(rawDigest(p.hidden.output)).toBe(p.hiddenOutputRawSha256);
  expect(p.hidden).toMatchObject(json(p.hidden.output));expect(rawDigest(p.hidden.source)).toBe(p.hidden.sourceHash);
  expect(auditPartitionCertificates({level,coverId:p.coverId,prefixBound:p.prefix,hiddenBound:p.hidden,hiddenProjection:projection.level})).toEqual(p.partition);
  for(const [file,fileHash] of Object.entries(p.codeSha256))expect(rawDigest(file)).toBe(fileHash);
  expect(typeof record.qualificationChain).toBe('string');
  const supplement=json(record.qualificationChain);
  expect(supplement).toMatchObject({status:'PASS',levelSha256:hash,lower:11,prefix:4,hidden:7,searchRepeated:false});
  expect(rawDigest(supplement.candidateFile)).toBe(supplement.candidateFileRawSha256);
  expect(supplement.qualifications.map(q=>q.file)).toEqual([...p.qualifications.map(q=>q.file),
    'deliverables/continue211-220-20260930/design216-new/colored-qualification.json',
    'deliverables/continue211-220-20260930/fast-lift-qualification.json']);
  for(const binding of supplement.qualifications){
    const q=json(binding.file);expect(q.status).toBe('PASS');expect(rawDigest(binding.file)).toBe(binding.rawSha256);expect(digest(q)).toBe(binding.canonicalSha256);
    for(const [file,fileHash] of Object.entries(binding.codeSha256))expect(rawDigest(file)).toBe(fileHash);
    for(const [file,fileHash] of Object.entries(q.codeSha256??{}))expect(rawDigest(file)).toBe(fileHash);
    if(q.sourceSha256)expect(digest(readFileSync(q.source))).toBe(q.sourceSha256);
    const originalBinding=p.qualifications.find(a=>a.file===binding.file);
    if(originalBinding){expect(binding.rawSha256).toBe(originalBinding.rawSha256);expect(binding.canonicalSha256).toBe(originalBinding.canonicalSha256);}
  }
  const colored=await import('../tools/continuation211-colored-witness.mjs'),optional=await import('../tools/continuation211-optional-lift-domain.mjs');
  for(const name of supplement.bridge.identicalFunctions)expect(colored[name].toString()).toBe(optional[name].toString());
  expect(projection.level.shutters).toEqual([]);expect(projection.level.coloredGrids).toEqual(level.coloredGrids);
  const review=supplement.finalIndependentReview;
  expect(rawDigest(review.file)).toBe(review.rawSha256);
  expect(json(review.file)).toMatchObject({status:'PASS_BOUNDS_AND_STRICT_ROUTE',levelSha256:hash,searchRepeated:false,replay:{valid:true,complete:true,nonClearingDrags:14,effectiveDrags:50}});
}

describe('accepted 211–220 formal data', () => {
  it('binds 212 partition bounds to the final scored object and the full qualification chain', async () => {
    const entry=FORMAL_211_220_EVIDENCE.find(row=>row.id===212),record=json(entry.evidence),candidate=json(record.sourceEvidence);
    expect(digest(candidate.level)).toBe(candidate.levelSha256);
    expect(candidate.levelSha256).toBe(entry.levelSha256);
    await expectPartition212Binding(candidate.level,candidate,record);
  });
  it('contains all ten accepted levels with the required cadence and same-band bounds while preserving campaign 200', () => {
    const ids=Array.from({length:10},(_,i)=>211+i);
    const cadence=['easy','normal','normal','hard','easy','normal','hard','easy','normal','super'];
    const bands={easy:[5,10],normal:[11,15],hard:[16,20],super:[21,30]};
    expect(FORMAL_211_220_LEVELS.map(level=>level.id)).toEqual(ids);
    expect(FORMAL_211_220_EVIDENCE.map(entry=>entry.id)).toEqual(ids);
    expect(FORMAL_211_220_LEVELS.map(level=>level.difficulty)).toEqual(cadence);
    expect(LEVELS.map(level=>level.id)).toEqual(Array.from({length:200},(_,i)=>i+1));
    for(const [index,level] of FORMAL_211_220_LEVELS.entries()){
      const entry=FORMAL_211_220_EVIDENCE[index],[minimum,maximum]=bands[cadence[index]];
      expect(getFormal211to220LevelStrict(level.id)).toBe(level);
      expect(entry.L).toBeGreaterThanOrEqual(minimum);expect(entry.L).toBeLessThanOrEqual(entry.U);
      expect(entry.U).toBeLessThanOrEqual(maximum);
    }
    expect(()=>getFormal211to220LevelStrict(210)).toThrow(RangeError);
    expect(()=>getFormal211to220LevelStrict(221)).toThrow(RangeError);
  });

  it.each(FORMAL_211_220_EVIDENCE)('binds level $id to its route, lower proof and both Pointer settlements', async entry => {
    const level=getFormal211to220LevelStrict(entry.id),record=json(entry.evidence),source=json(record.sourceEvidence);
    expect(digest(level)).toBe(entry.levelSha256);
    expect(record.levelSha256).toBe(entry.levelSha256);
    expect(record.eligibility.eligible).toBe(true);
    const hasTimer=level.blocks.some(b=>b.timedBombSeconds!==undefined);
    const route=hasTimer||level.flipDoors?.length?replayTimed(level,source.drags,(await loadApi()).api,{timed:true,complete:true,requirePointerCompatible:true}):replayRevisedRoute(level,source.drags);
    expect(route).toMatchObject({valid:true,complete:true,nonClearingDrags:entry.U,effectiveDrags:entry.starMoves});
    let lowerHash=entry.levelSha256;
    if(record.lowerProjection){
      const projection=structuredClone(level);for(const b of projection.blocks)delete b.timedBombSeconds;
      expect(source.projection).toEqual(projection);
      lowerHash=digest(projection);
      expect(record.lowerProjection).toMatchObject({originalSha256:entry.levelSha256,projectionSha256:lowerHash,removedOnly:'timedBombSeconds'});
      const certificate=json(source.lowerCertificate.file),qualification=json(source.lowerCertificate.qualificationFile);
      expect(createHash('sha256').update(readFileSync(source.lowerCertificate.file)).digest('hex')).toBe(source.lowerCertificate.fileSha256??source.lowerCertificate.sha256);
      expect(certificate).toMatchObject({levelSha256:entry.levelSha256,projectionSha256:lowerHash});
      expect(certificate.proof??certificate.lower).toEqual(source.lower);
      expect(digest(qualification)).toBe(source.lowerCertificate.qualificationSha256);
      expect(qualification.status).toBe('PASS');
    }
    if(record.flipLowerProjection){
      const projection=structuredClone(level);projection.gates.push(...projection.flipDoors.map(({initiallyOpen,...g})=>g));projection.flipDoors=[];
      expect(source.projection).toEqual(projection);lowerHash=digest(projection);
      expect(record.flipLowerProjection.projectionSha256).toBe(lowerHash);
      const q=json(source.lowerCertificate.qualificationFile);expect(q.status).toBe('PASS');expect(digest(q)).toBe(source.lowerCertificate.qualificationSha256);
      for(const [file,hash] of [[q.source,q.sourceSha256],['tools/regeneration211-design/native-static219.mjs',q.adapterSha256],['tools/remake201to210-v123-floor.mjs',q.compilerSha256]])expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(hash);
      expect(source.lower).toMatchObject({status:'threshold-proven',floor:entry.L,levelSha256:lowerHash});
    }else if(source.lower.partition212){
      await expectPartition212Binding(level,source,record);
    }else if(source.lowerBinding){
      const b=source.lowerBinding,prior=json(b.sourceCertificate),strip=x=>{const p=structuredClone(x);delete p.mechanismAdaptation;return p;};
      expect(b.levelSha256).toBe(entry.levelSha256);expect(digest(prior.level)).toBe(b.priorLevelSha256);expect(strip(level)).toEqual(strip(prior.level));expect(source.lower).toEqual(prior.lower);
      expect(source.lower).toMatchObject({status:'threshold-proven',floor:entry.L,levelSha256:b.priorLevelSha256,suffix:{status:'threshold-proven',floor:3}});
      for(const [file,hash] of [[b.sourceCertificate,b.sourceCertificateRawSha256],[b.sourceNativeInput,b.sourceNativeInputRawSha256],[b.sourceNativeOutput,b.sourceNativeOutputRawSha256],[source.lower.suffix.input,b.hiddenInputRawSha256],[source.lower.suffix.output,b.hiddenOutputRawSha256],[source.sourceFile,source.sourceRawSha256]])expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(hash);
      for(const [file,hash] of Object.entries(source.lower.codeSha256))expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(hash);
      for(const binding of b.qualificationBindings){const q=json(binding.file);expect(q.status).toBe('PASS');expect(digest(q)).toBe(binding.canonicalSha256);expect(createHash('sha256').update(readFileSync(binding.file)).digest('hex')).toBe(binding.rawSha256);for(const[file,hash]of Object.entries(q.codeSha256??{}))expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(hash);}
      expect(b.finalPayloadDeepEqual&&b.finalHiddenPayloadDeepEqual).toBe(true);
    }else expect(source.lower).toMatchObject({status:'threshold-proven',floor:entry.L,sourceLevelSha256:lowerHash});
    if(source.lowerCertificate?.qualifications){
      const cert=source.lowerCertificate,raw=json(cert.file);
      expect(createHash('sha256').update(readFileSync(cert.file)).digest('hex')).toBe(cert.fileSha256);
      expect(raw.level).toEqual(level);expect(raw.lower).toMatchObject({status:'threshold-proven',floor:entry.L,levelSha256:entry.levelSha256});
      expect(createHash('sha256').update(readFileSync(source.sourceFile)).digest('hex')).toBe(source.sourceFileSha256);
      for(const binding of cert.qualifications){const q=json(binding.file);expect(q.status).toBe('PASS');expect(digest(q)).toBe(binding.sha256);expect(createHash('sha256').update(readFileSync(binding.file)).digest('hex')).toBe(binding.fileSha256);for(const [file,hash] of Object.entries(q.codeSha256??{}))expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(hash);
        if(q.nativeSource){expect(digest(readFileSync(q.nativeSource))).toBe(q.nativeSha256);expect(q.nativeSha256).toBe(source.lower.sourceHash);expect(digest(readFileSync('tools/regeneration220-design/native-prefix220.mjs'))).toBe(q.adapterSha256);expect(q.mode).toBe('FULL_GOAL_WITHOUT_COLD_COLOR_MERGING');}
      }
      if(entry.id===220){expect(source.lower.goalClears).toBe(level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0));expect(source.lower.compiledInputEqualsProvedInput).toBe(true);for(const file of ['tools/remake201to210-v123-floor.mjs','tools/regeneration220-design/native-prefix220.mjs','tools/regeneration220-design/native-prefix220.cs','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts'])expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(raw.codeSha256[file]);}
    }
    if(source.lower.split){
      const split=source.lower.split;
      expect(split.sourceLevelSha256).toBe(entry.levelSha256);
      expect(split.prefix).toMatchObject({status:'minimum-proven',minimum:5,goal:{coverRevealed:'cover'}});
      expect(split.hidden).toMatchObject({status:'threshold-proven',floor:6,completedCost:5});
      expect(split.floor).toBe(split.prefix.minimum+split.hidden.floor);
      const pattern=structuredClone(level);
      pattern.blocks=pattern.blocks.filter(b=>b.shutterId==='cover').map(b=>{delete b.shutterId;delete b.frozen;return b;});
      delete pattern.shutters;pattern.gates.forEach(g=>delete g.frozen);
      expect(split.projection).toEqual(pattern);expect(digest(pattern)).toBe(split.projectionSha256);
      const qualification=json(source.lower.qualificationFile);expect(qualification.status).toBe('PASS');
      for(const [file,hash] of Object.entries(qualification.codeSha256))expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(hash);
      expect(json(record.sourceVerification)).toMatchObject({status:'SOURCE_REVIEW_PASSED',levelSha256:entry.levelSha256});
    }
    const width=level.width,height=level.height,full=Array.from({length:width*height},(_,p)=>[p%width,Math.floor(p/width)]);
    let original=source.sourceContract?.originalMask??source.source?.originalMask??source.source?.sourceLevel?.playable;
    if(!original&&source.source?.sourceBoard)original=full.filter(p=>!source.source.sourceBoard.blocked.some(q=>q[0]===p[0]&&q[1]===p[1]));
    if(entry.id===211)original=full; // Independently evidenced source rectangle7×9.
    expect(original).toBeDefined();
    const playable=level.playable??full,mask=new Set(playable.map(p=>p.join(',')));
    expect(playable.every(([x,y])=>mask.has([width-1-x,y].join(',')))||playable.every(([x,y])=>mask.has([x,height-1-y].join(',')))).toBe(true);
    if(original.length===width*height)expect(mask.size).toBe(width*height);
    else{
      expect(mask.size).toBeLessThan(width*height);
      for(const transform of [(x,y)=>[x,y],(x,y)=>[width-1-x,y],(x,y)=>[x,height-1-y],(x,y)=>[width-1-x,height-1-y]])
        expect(original.length===mask.size&&original.every(([x,y])=>mask.has(transform(x,y).join(',')))).toBe(false);
    }
    expect(level.blocks.every(b=>matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)).toBe(true);
    expect(record.pointerEvidence).toHaveLength(2);
    const viewports=[];
    for(const path of record.pointerEvidence){
      const pointer=json(path),row=pointer.rows.find((r)=>r.id===entry.id);
      viewports.push(`${pointer.viewport.width}x${pointer.viewport.height}`);
      expect(pointer).toMatchObject({status:'PASS',naturalClock:true,clockFrozen:false,playerSaveTouched:false});
      expect(row).toMatchObject({status:'PASS',levelSha256:entry.levelSha256,nonClearingDrags:entry.U,settlement:{earnedStars:3}});
    }
    expect(viewports.sort()).toEqual(['320x568','496x1078']);
  });
});
