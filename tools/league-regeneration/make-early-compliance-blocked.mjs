import fs from 'node:fs';
const hard=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261005/round2/early/early-hard-pool.json','utf8'));
const src4=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261005/round2/early/source4-random-hard-pool.json','utf8'));
const block={
 generatedAt:new Date().toISOString(),range:[1,5],
 unlockContract:{beforeIndex6:{noFrozenGates:true},beforeIndex10:{noFrozenBlocks:true},beforeIndex15:{noLayers:true}},
 finiteSearch:{sourcePool:[4,42,50,60,170,187],maxVariantsPerSource:600,routeBudget:{maxStates:180000,maxTransitions:800000,maxMilliseconds:1500},proofBudget:{maxStates:700000,maxTransitions:3000000,maxMilliseconds:15000},noInfiniteRetry:true},
 results:{acceptedExistingInvalid:[1,2,4,5],reason:'existing accepted templates source45 contain frozen gates',routeScoreOnlyCandidates:{earlyHardPool:hard.entries.map(e=>({source:e.source,variant:e.variant,cost:e.cost,routeReplay:'valid-complete',score:'PASS-30',lowerProof:'UNKNOWN'})),source4Pool:src4.entries.map(e=>({variant:e.variant,cost:e.cost,score:'PASS-30',lowerProof:'RELAXED_SHORTCUT'})),index3Source198:'stripped source198 retains frozen gates; not index3-compatible'},formalStatus:'BLOCKED_L16_PROOF_UNAVAILABLE'}
};
fs.writeFileSync('deliverables/league-regeneration-20261005/round2/early/early-1-5-compliance-blocked.json',JSON.stringify(block,null,2)+'\n');
console.log(JSON.stringify({formalStatus:block.results.formalStatus,earlyHard:block.results.routeScoreOnlyCandidates.earlyHardPool.length,source4:block.results.routeScoreOnlyCandidates.source4Pool.length}));
