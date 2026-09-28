import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest,loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {formalLevelFromBaseline,formalCandidateForValidation} from './revised-continuation-joint-mixed-v111.mjs';
import {checkCandidate,loadReviewedDesignSource,policyFamilyForSourceFacts,deriveDesignPolicy} from './revised-design-policy-joint-mixed-integrated-v111.mjs';
import * as mixed from './revised-design-policy-joint-mixed-v111.mjs';
const old='tools/revised-continuation-joint-keys-axis-v111.mjs',next='tools/revised-continuation-joint-mixed-v111.mjs';
const text=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n').trimEnd();
const candidatePath='.codex-temp/remaining98-v111/next44/candidate-44.json',sourcePath='.codex-temp/remaining98-v111/next44/source-observations-44.json';
const item={levelId:44,path:candidatePath,sha256:'a13875507b6f7621e424039041156b796678207552d1fc56c6e5cdf350141c45',sourceReview:{path:sourcePath,sha256:'598a23951fe60725a256eedb93265eb8c99011c1972fbe8f4613848f3ac4f1ef'}};
test('continuation migration changes only SELF POLICY and exact prior-emitter entry',()=>{
 assert.equal(digest(fs.readFileSync(old)),'b1b2e367447adcc614698027fa09e79396708ed421da5c466169de7d05fd4b91');
 let expected=text(old).replace("const SELF = 'tools/revised-continuation-joint-keys-axis-v111.mjs';","const SELF = 'tools/revised-continuation-joint-mixed-v111.mjs';").replace("const POLICY = 'tools/revised-design-policy-joint-keys-axis-v111.mjs';","const POLICY = 'tools/revised-design-policy-joint-mixed-integrated-v111.mjs';");
 expected=expected.replace("  const jointKeysWrapper='tools/revised-continuation-joint-keys-v111.mjs';","  const jointKeysWrapper='tools/revised-continuation-joint-keys-v111.mjs';\n  const jointKeysAxisWrapper='tools/revised-continuation-joint-keys-axis-v111.mjs';").replace('wrapper.path===SELF||wrapper.path===jointKeysWrapper||','wrapper.path===SELF||wrapper.path===jointKeysAxisWrapper||wrapper.path===jointKeysWrapper||').replace('  if(wrapper.path===jointKeysWrapper)',"  if(wrapper.path===jointKeysAxisWrapper)assert.equal(wrapper.sha256,'b1b2e367447adcc614698027fa09e79396708ed421da5c466169de7d05fd4b91');\n  if(wrapper.path===jointKeysWrapper)");
 assert.equal(text(next),expected);
});
test('existing frozen mixed source, tools, and candidate remain byte-identical',()=>{
 for(const [p,h]of [[candidatePath,item.sha256],[sourcePath,item.sourceReview.sha256],['tools/revised-joint-curtain-mixed-v111.mjs','2b13790f8cd656a87924639d388dc2ce39c811f9fcf61dc5a6eb465235a58756'],['tools/revised-design-review-joint-mixed-v111.mjs','cf5c99507375b7256faf3512ea658e775d55eb397862431458b108a7b02bfba3'],['tools/revised-design-policy-joint-mixed-v111.mjs','aa25ae3785e68a185452927992970e76963acff916af9b203b8a9e1a0c43fe0c']])assert.equal(digest(fs.readFileSync(p)),h);
});
test('only source joint+generator or joint+numericIce uses the new branch',()=>{
 const f=(joint,g=0,ice=0)=>({mechanisms:{covers:joint?{jointCohorts:[]}:{},generators:{count:g},numericIce:{count:ice}}});
 for(const facts of [f(true,1),f(true,0,1),f(true,1,1)])assert.equal(policyFamilyForSourceFacts(facts),'joint-mixed');
 for(const facts of [f(false,1,1),f(true),f(false),undefined])assert.equal(policyFamilyForSourceFacts(facts),'existing-joint-keys-axis');
});
test('existing joint key/axis and star families remain routed to unchanged chain, without old replay',()=>{
 const keys=JSON.parse(fs.readFileSync('.codex-temp/remaining98-v111/next99/source-review-99.json'));
 assert.equal(policyFamilyForSourceFacts(keys.sourceNormalizedFacts),'existing-joint-keys-axis');
 const stars={mechanisms:{covers:{jointCohorts:[{value:3,hidden:2,coverCount:2}]},generators:{count:0},numericIce:{count:0},starBlocks:{count:2}}};
 assert.equal(policyFamilyForSourceFacts(stars),'existing-joint-keys-axis');
});
test('source SHA is checked before loader/candidate family dispatch',async()=>{
 await assert.rejects(loadReviewedDesignSource(sourcePath,'0'.repeat(64)),/Source review drift/);
 await assert.rejects(checkCandidate({...item,sourceReview:{...item.sourceReview,sha256:'0'.repeat(64)}},{}),/Source review drift/);
});
test('new44 candidate retains formal metadata and complete route, without running old levels',async()=>{
 const archivePath='.codex-temp/remaining98-v111/adoption-58/adoption.json',bytes=fs.readFileSync(archivePath);
 assert.equal(digest(bytes),'0f72368925157279e2f09ec321983c2e6e57e9d4106a2af52349050ba5ec5a62');
 const archive=JSON.parse(bytes),{api}=await loadPreviewCore(),r=await checkCandidate(item,api);
 assert(r.checked.rulesPassed&&r.checked.sourceAligned&&r.checked.replay.complete&&r.checked.art.passed&&r.checked.mixedCarrierAudit.passed);
 const row=archive.baseline.levels[43],formal=formalLevelFromBaseline(r.raw,row),proof=formalCandidateForValidation(r.raw,formal);
 assert.equal(formal.timeSeconds,row.metadata.timeSeconds);assert.equal(formal.parMoves,row.starTargets.moveTarget);assert.equal(formal.reward,row.metadata.reward);assert.equal(formal.name,row.metadata.name);
 assert.deepEqual(proof.drags,r.raw.drags);assert(api.replayRevisedRoute(formal,proof.drags).complete);
 const actual=r.adapter.verifyReviewedDesign(proof,r.loaded.source,api);assert(actual.rulesPassed&&actual.jointRevealReplay.complete&&actual.mixedCarrierAudit.passed);
 assert.deepEqual(deriveDesignPolicy(r.loaded.source.facts,r.checked.proposedFacts,44),mixed.deriveDesignPolicy(r.loaded.source.facts,r.checked.proposedFacts,44));
 assert(!actual.pointerReplayValidated&&!actual.lowerBoundCertified&&!actual.releaseApproved);
});
