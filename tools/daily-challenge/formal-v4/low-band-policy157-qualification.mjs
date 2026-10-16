import assert from 'node:assert/strict';
import {readBound,checkBindings,mergeBindings,assertReviewedLowBandQualification} from './low-twenty-io.mjs';

export const HISTORICAL_LOW_BAND_QUALIFICATION={
 path:'deliverables/daily-formal-v4-20261008/proof/low-band-prefix-tail-independent-01/report.json',
 sha256:'d9f1704b21306a20ed6fd27f9443a0300d661d816c5cfe9229ddd677ac59b63d',
};

// Explicit compatibility for newly constructed worlds only. Historical math
// reports retain their original policy/version and remain immutable.
export async function assertReviewedLowBandQualification157(q,bindings={}){
 assert.equal(q.status,'INDEPENDENT_LOW_BAND_PREFIX_TAIL_157_PASS');
 assert.deepEqual(q.errors,[]);
 assert.equal(q.proofToolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 assert.deepEqual(q.historicalQualification,HISTORICAL_LOW_BAND_QUALIFICATION);
 assert.equal(q.activePolicy.version,'1.157.0');
 assert.equal(q.activePolicy.sha256,'4a34f0466f58f2562c98b3813f9634bb402ee4bcc422e4fa42de04df5be6f377');
 assert.equal(q.historicalDesignPolicy.version,'1.156.0');
 assert.equal(q.historicalDesignPolicy.sha256,'71cbdc5c52b8d02b191c0db83c5a7875948450226473ad848817296de491b90a');
 assert.equal(q.mathematicalPolicy.version,'1.154.0');
 assert.equal(q.mathematicalPolicy.sha256,'5b8986873d7014f6d6612f3678891e295e72d30431f2b3b0bd67c2dd91d4698c');
 for(const k of ['newRealCandidateSearches','newRealCandidateConstructions','publicLedgerClaims'])assert.equal(q[k],0);
 assert.equal(q.publicRequestCountBefore,q.publicRequestCountAfter);
 assert.equal(q.formalReady,false);assert.equal(q.searchAlgorithmChanged,false);
 assert.equal(q.failedOriginalRetryAllowed,false);
 for(const p of ['tools/daily-challenge/formal-v4/prefix-tail-low-band-157.mjs',
  'tools/daily-challenge/formal-v4/prefix-execution-environment-157.mjs'])assert(/^[a-f0-9]{64}$/.test(q.toolBindings?.[p]??''));
 const original=await readBound(HISTORICAL_LOW_BAND_QUALIFICATION,bindings);
 await assertReviewedLowBandQualification(original,bindings);
 await checkBindings(q.toolBindings);mergeBindings(bindings,q.toolBindings);
 return bindings;
}
