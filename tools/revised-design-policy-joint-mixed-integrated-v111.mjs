import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {digest} from './revised-preview-validation-v160.mjs';
import * as prior from './revised-design-policy-joint-keys-axis-v111.mjs';
import * as mixed from './revised-design-policy-joint-mixed-v111.mjs';

export const RULE_VERSION=prior.RULE_VERSION;
export const measurePolicyFacts=prior.measurePolicyFacts;
/** Route from independently pinned SOURCE facts, never candidate omissions.
 * Other positive families keep the whole existing star/grid/key/axis chain. */
export function policyFamilyForSourceFacts(facts){
 const m=facts?.mechanisms;
 return Array.isArray(m?.covers?.jointCohorts)&&(m.generators?.count>0||m.numericIce?.count>0)?'joint-mixed':'existing-joint-keys-axis';
}
const choose=facts=>policyFamilyForSourceFacts(facts)==='joint-mixed'?mixed:prior;
function reviewedFacts(p,h,root=process.cwd()){
 assert.match(h??'',/^[a-f0-9]{64}$/i,'Pin independent source SHA');
 const bytes=fs.readFileSync(path.resolve(root,p));
 assert.equal(digest(bytes),h.toLowerCase(),'Source review drift before family selection');
 return JSON.parse(bytes).sourceNormalizedFacts;
}
export async function loadReviewedDesignSource(p,h,root=process.cwd()){
 return choose(reviewedFacts(p,h,root)).loadReviewedDesignSource(p,h,root);
}
export function deriveDesignPolicy(sourceFacts,designFacts,levelId){
 return choose(sourceFacts).deriveDesignPolicy(sourceFacts,designFacts,levelId);
}
export function verifyReviewedDesign(raw,source,api){
 return choose(source.facts).verifyReviewedDesign(raw,source,api);
}
export async function checkCandidate(item,api){
 return choose(reviewedFacts(item.sourceReview.path,item.sourceReview.sha256)).checkCandidate(item,api);
}
