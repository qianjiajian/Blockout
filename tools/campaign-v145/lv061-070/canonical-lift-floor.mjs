import fs from 'node:fs';
import crypto from 'node:crypto';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {qualifyLift} from './lift-floor.mjs';
import {searchCanonical} from './canonical-search68-69.mjs';
const fileSha=url=>crypto.createHash('sha256').update(fs.readFileSync(url)).digest('hex');
/** Exact label-symmetry quotient of the qualified optional-exit lift graph.
 * Permute only bodies with equal native shape, complete ordered color layers,
 * initial numeric ice, and owning batch. Pose/layer and current ice stay paired.
 * Occupancy, gate contacts, ice updates and derived clear counts are invariant.
 * Batch members start fully hidden and reveal together at the same fixed set
 * of initial poses; no source ID is used after reveal in this qualified domain.
 * Reveal bits remain ordered in the key. Each quotient edge has a same-cost
 * representative edge, and every real gesture maps to an optional-graph edge.
 * Therefore this quotient preserves the relaxed optimum; the optional-exit
 * relaxation is cost-nonincreasing relative to the complete actual puzzle.
 */
export function checkCanonicalLiftFloor(level,api,options={}){
 const floor=options.floor??16,maxStates=options.maxStates??500000,maxMilliseconds=options.maxMilliseconds??45000;
 const base={thresholdProven:false,abstraction:'qualified-full-inventory-lift-optional-exit-label-symmetry-v147',costNonincreasing:true,sourceLevelSha256:digest(level),solvabilityValidated:false,timeValidated:false,pointerValidated:false,toolBindings:{wrapper:fileSha(new URL(import.meta.url)),canonicalSearch:fileSha(new URL('./canonical-search68-69.mjs',import.meta.url)),qualifiedDomain:fileSha(new URL('./lift-floor.mjs',import.meta.url)),transitions:fileSha(new URL('../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs',import.meta.url))}};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return {...base,status:'invalid',reason:'Positive integer floor and budgets required'};
 try{if(![68,69].includes(level.id))throw new Error('Canonical wrapper qualified for Lv68–69 only');qualifyLift(level,api);if(level.blocks.some(b=>!Number.isInteger(b.frozen??0)||(b.frozen??0)<0||(b.frozen??0)>=64||(b.layers?.length??1)>=8))throw new Error('Canonical packed key range exceeded');}catch(e){return {...base,status:'unsupported',reason:e.message};}
 return {...base,...searchCanonical(level,{floor,maxStates,maxMilliseconds,prove:true})};
}
