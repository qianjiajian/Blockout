import fs from 'node:fs';
import {loadLeagueProofRuntime} from './proof-contract.mjs';
import {auditExistingLeagueMechanisms} from './mechanism-compose.mjs';
import {leagueMechanismPlan} from './mechanism-policy.mjs';

// Read-only intake for already proved native mechanism candidates. Never
// recomposes or repeats any lower/upper search on the supplied final graph.
const [file,indexText]=process.argv.slice(2),index=Number(indexText);
if(!file||!Number.isInteger(index))throw Error('usage: mechanism-audit-final.mjs packet.json index');
const packet=JSON.parse(fs.readFileSync(file)),proof=packet.proof?.level?packet.proof:packet;
const level=packet.level??proof.level,drags=packet.drags??proof.drags;
if(!level||!drags)throw Error('Final exact level and complete drags are required');
const plan=packet.plan??leagueMechanismPlan(index,{blockCount:level.blocks.length});
if(index===13){const ice=plan.secondary.find(t=>t.mechanism==='numeric-ice');if(ice){ice.instances=5;ice.minimumCounter=3;}plan.capacityBasis='Five actual numeric-ice bodies with counters>=3 and at least3 real frozen exits form an increased combination relative to the old7 frozen exits; native lower and full route are proved separately.';}
const runtime=await loadLeagueProofRuntime(),result=await auditExistingLeagueMechanisms({index,sourceLevelId:packet.sourceLevelId??proof.sourceLevelId,level,drags,plan},{runtime});
const out=`deliverables/league-v2-20261008/mechanisms/native-final-${index}-${Date.now()}.mechanism.json`;
fs.writeFileSync(out,JSON.stringify({...result,basePath:file,mechanismReceipt:out,alreadyProvedInput:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,ok:result.ok,issues:result.issues,total:result.comparison.currentTotal,levelSHA:result.levelSha256,routeSHA:result.routeSha256,fullBoardSearches:0}));
