import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';

const ROOT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root';
const RULE='docs/rules/mechanism-rules-v1.74.0.md';
const RULE_HASH='1b4ad280531bbfb4ddcc1393af459580f8940bef6257c31ddec53997338a6568';
const ACCEPTED={
 144:{prior:ROOT+'/conditional144-metadata-corrected.json',levelSha256:'b78b143f638b23728ad4c73730c9d0ce5d7be0b351680fcd7018e2a68cb83071',routeSha256:'f738b2dfaac4140fb21b38c2b86ebca48ad5757ce906b369c28498846b801134',fields:[{field:'frozen15.color',design:'red'},{field:'frozen18.color',design:'green'},{field:'frozen23.color',design:'pink'}]},
 150:{prior:ROOT+'/conditional150-verified-fields.json',levelSha256:'455ad583cd00e780b7b5df0be0905643f4ea0e2d53da24d82686a27fc0b94e91',routeSha256:'b50b94ca01eb3663fdc3cdeee2003b7dbc7699618b7a3852ffaf5393c973dea4',fields:[{field:'yellow.initiallyOpen',design:true}]},
};
export function acceptedSourceReview(id){
 const a=ACCEPTED[id];assert(a);assert.equal(digest(fs.readFileSync(RULE)),RULE_HASH);
 const priorBytes=fs.readFileSync(a.prior),prior=JSON.parse(priorBytes);
 assert.equal(prior.sourceReview.passed,false);assert.equal(digest(prior.level),a.levelSha256);assert.equal(digest(prior.drags),a.routeSha256);
 return {...structuredClone(prior.sourceReview),passed:true,bindings:{...prior.sourceReview.bindings,[RULE]:RULE_HASH,[a.prior]:digest(priorBytes)},
  acceptance:{status:'USER_ACCEPTED_AUTHORED_SOURCE_FIELDS',ruleVersion:'1.74.0',ruleFile:RULE,ruleSha256:RULE_HASH,sourceFactsStatus:'UNKNOWN',fields:structuredClone(a.fields),priorCandidate:a.prior,priorCandidateSha256:digest(priorBytes),levelSha256:a.levelSha256,routeSha256:a.routeSha256,userInstruction:'正式接入',sourceFactsPromotedToVerified:false}};
}
export function verifyAcceptedSourceDesign(data){
 if(!Object.hasOwn(ACCEPTED,data.level.id))return null;
 const a=ACCEPTED[data.level.id],expected=acceptedSourceReview(data.level.id);
 assert.equal(digest(data.level),a.levelSha256,'Approval binds exact reviewed level');assert.equal(digest(data.drags),a.routeSha256,'Approval binds exact reviewed route');
 assert.deepEqual(data.sourceReview,expected,'Only the explicitly accepted fields may bypass source incompleteness');
 return expected.acceptance;
}
