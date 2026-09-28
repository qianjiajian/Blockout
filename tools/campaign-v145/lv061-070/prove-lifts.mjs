import fs from 'node:fs';
import {loadApi,ruleGate,auditStructure,OUTPUT,writeNew,TARGETS} from './remake61to70-v146.mjs';
import {checkCanonicalLiftFloor} from './canonical-lift-floor.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const {api}=await loadApi(),lock=ruleGate();
for(const file of process.argv.slice(2)){const d=JSON.parse(fs.readFileSync(file)),audit=auditStructure(d,api),replay=api.replayRevisedRoute(d.level,d.drags),proof=checkCanonicalLiftFloor(d.level,api,{floor:TARGETS[d.level.id].min,maxStates:500000,maxMilliseconds:90000});const out=`${OUTPUT}/checks/root-canonical-${d.level.id}-${Date.now()}.json`;writeNew(out,{candidate:file,candidateSha256:digest(fs.readFileSync(file)),ruleVersion:lock.activeVersion,levelSha256:digest(d.level),routeSha256:digest(d.drags),audit,replay,proof,formalAdopted:false});console.log(JSON.stringify({out,status:proof.status,L:proof.floor,U:replay.nonClearingDrags,states:proof.states}));}
