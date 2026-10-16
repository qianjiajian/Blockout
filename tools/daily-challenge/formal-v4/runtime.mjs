import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadRuntime,levelSha256} from '../formal-v2/contract.mjs';
import {ICE_PROOF_VERSION} from '../formal-v3/bounded-ice-proof.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

export const FROZEN_MATH_SHA='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
export const FROZEN_BOUNDED_FILES=Object.freeze({
 'tools/daily-challenge/formal-v3/bounded-proof.mjs':'ebf6522ed5a6c8b3c5bc4e217a8026f68f05894cc07ebc54f190efc941360054',
 'tools/daily-challenge/formal-v3/bounded-ice-proof.mjs':'3d6bd7894b185ee69715b4c677986a564864d2c8b590fcc96b4526ff153a80ab',
 'tools/daily-challenge/formal-v3/ice-preserving-projection.mjs':'90897f75a65ed7f9c02501f1b2d1a2a3e846d5d94458861174a692c115b4217d',
});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function assertV4Runtime(runtime){
 assert.equal(runtime.toolchainSha256,FROZEN_MATH_SHA,'Frozen mathematical closure required');
 assert.equal(levelSha256(runtime.toolchainBindings),FROZEN_MATH_SHA);
 assert.equal(runtime.policyRuleVersion,'1.156.0','The actual active policy is v1.156');
 assert.equal(runtime.mathRuleVersion,'1.154.0');
 assert.equal(runtime.boundedRuleVersion,runtime.mathRuleVersion,'Primitive rule fields describe the mathematical contract, not the active policy');
 assert.equal(runtime.boundedRuleSha256,runtime.mathRuleSha256);
 assert.equal(runtime.dailyBudgetRuleVersion,'1.154.0');
 assert.equal(runtime.iceProofVersion,ICE_PROOF_VERSION);
 for(const [file,expected]of Object.entries(FROZEN_BOUNDED_FILES))assert.equal(runtime.toolchainBindings[file],expected);
}

/** The solver closure is unchanged. This separate loader genuinely validates
 * today's policy without rewriting the frozen loader's accepted-version list.
 * Primitive ruleVersion remains its inherited mathematical contract v1.154;
 * policyRuleVersion/sha identify the current selection contract explicitly. */
export async function loadV4Runtime(){
 const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.156.0','Reviewed active v1.156 rule lock required');
 const manifest=JSON.parse(await fs.readFile('docs/rules/manifest.json','utf8'));
 const policy=manifest.versions.find(r=>r.version==='1.156.0'),math=manifest.versions.find(r=>r.version==='1.154.0');
 assert(policy&&math);
 for(const [file,expected]of Object.entries(FROZEN_BOUNDED_FILES))assert.equal(hash(await fs.readFile(file)),expected,`Frozen file changed: ${file}`);
 const base=await loadRuntime(),toolchainBindings={...base.toolchainBindings,...FROZEN_BOUNDED_FILES};
 const result={...base,toolchainBindings,toolchainSha256:levelSha256(toolchainBindings),
  policyRuleVersion:policy.version,policyRuleSha256:policy.sha256,
  mathRuleVersion:math.version,mathRuleSha256:math.sha256,
  boundedRuleVersion:math.version,boundedRuleSha256:math.sha256,
  dailyBudgetRuleVersion:math.version,dailyBudgetRuleSha256:math.sha256,
  ruleBindingMeaning:'current-v1.156-policy-with-unchanged-inherited-v1.154-mathematics',
  iceProofVersion:ICE_PROOF_VERSION,iceBindings:toolchainBindings,iceProofSha256:levelSha256(toolchainBindings),
  policyRuntimeBinding:{path:'tools/daily-challenge/formal-v4/runtime.mjs',sha256:hash(await fs.readFile('tools/daily-challenge/formal-v4/runtime.mjs'))}};
 assertV4Runtime(result);return result;
}
