import assert from 'node:assert/strict';
import {readBound,checkBindings,mergeBindings,assertReviewedLowBandQualification} from './low-twenty-io.mjs';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,mapHistoricalBindings158} from './prefix-execution-environment-158.mjs';

export const HISTORICAL_LOW_BAND_QUALIFICATION={
 path:'deliverables/daily-formal-v4-20261008/proof/low-band-prefix-tail-independent-01/report.json',
 sha256:'d9f1704b21306a20ed6fd27f9443a0300d661d816c5cfe9229ddd677ac59b63d',
};

// Explicit compatibility for newly constructed worlds only. Historical math
// reports retain their original policy/version and remain immutable.
export async function assertReviewedLowBandQualification158(q,bindings={}){
 assert.equal(q.status,'INDEPENDENT_LOW_BAND_PREFIX_TAIL_158_PASS');
 assert.deepEqual(q.errors,[]);
 assert.equal(q.proofToolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 assert.deepEqual(q.historicalQualification,HISTORICAL_LOW_BAND_QUALIFICATION);
 assert.equal(q.activePolicy.version,'1.158.0');
 assert.equal(q.activePolicy.sha256,'519598c549cbdeed4a994baa70353ea1525713ea105a56b7f1660528bc894c08');
 assert.equal(q.historicalDesignPolicy.version,'1.156.0');
 assert.equal(q.historicalDesignPolicy.sha256,'71cbdc5c52b8d02b191c0db83c5a7875948450226473ad848817296de491b90a');
 assert.equal(q.mathematicalPolicy.version,'1.154.0');
 assert.equal(q.mathematicalPolicy.sha256,'5b8986873d7014f6d6612f3678891e295e72d30431f2b3b0bd67c2dd91d4698c');
 for(const k of ['newRealCandidateSearches','newRealCandidateConstructions','publicLedgerClaims'])assert.equal(q[k],0);
 assert.equal(q.publicRequestCountBefore,q.publicRequestCountAfter);
 assert.equal(q.formalReady,false);assert.equal(q.searchAlgorithmChanged,false);
 assert.equal(q.failedOriginalRetryAllowed,false);
 for(const p of ['tools/daily-challenge/formal-v4/prefix-tail-low-band-158.mjs',
  'tools/daily-challenge/formal-v4/prefix-execution-environment-158.mjs'])assert(/^[a-f0-9]{64}$/.test(q.toolBindings?.[p]??''));
 const original=await readBound(HISTORICAL_LOW_BAND_QUALIFICATION,bindings);
 const environment=prefixExecutionEnvironment(await loadV4Runtime());
 const archived=mapHistoricalBindings158(original.toolBindings,environment);
 // The old report remains byte-exact. Only the single documented old manifest
 // binding is resolved to its actual archival bytes for today's metadata read.
 await assertReviewedLowBandQualification({...original,toolBindings:archived.bindings},bindings);
 mergeBindings(bindings,environment.bindings);
 await checkBindings(q.toolBindings);mergeBindings(bindings,q.toolBindings);
 return bindings;
}
