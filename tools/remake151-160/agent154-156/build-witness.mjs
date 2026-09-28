import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
const source='tools/campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
let s=fs.readFileSync(source,'utf8');
s=s.replace("'../../../revised-preview-validation-v160.mjs'","'../../revised-preview-validation-v160.mjs'");
s=s.replace(" api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');",` api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');
 const original=level;level=structuredClone(level);level.mechanismRules='revised-2026-09-23-v1.4';
 const flipPhases=new Map((level.flipDoors??[]).map(d=>[d.id,{initiallyOpen:d.initiallyOpen,frozen:d.frozen??0}]));
 level.gates.push(...(level.flipDoors??[]).map(({initiallyOpen,...g})=>g));level.flipDoors=[];api.validateLevel(level);`);
s=s.replace(' const source=new api.PuzzleModel(level).snapshot();assertStateMatches(c,c.initial,source);return c;',` c.level=original;c.flipPhases=flipPhases;
 const source=new api.PuzzleModel(original).snapshot();assertStateMatches(c,c.initial,source);return c;`);
const before='count>=(ex.gate.frozen??0)&&exitSweepClear(c,b,p,ex,occ)';
assert(s.includes(before));s=s.replaceAll(before,'count>=(ex.gate.frozen??0)&&phaseOpen(c,ex.gate.id,count)&&exitSweepClear(c,b,p,ex,occ)');
s=s.replaceAll('count>=(ex.gate.frozen??0)&&exitSweepClear(c,b,p,ex,occupied(c,cur,i))','count>=(ex.gate.frozen??0)&&phaseOpen(c,ex.gate.id,count)&&exitSweepClear(c,b,p,ex,occupied(c,cur,i))');
s=s.replace('export function cleared(c,s)',`function phaseOpen(c,id,count){const d=c.flipPhases.get(id);return !d||d.initiallyOpen!==Boolean(Math.max(0,count-d.frozen)%2);}
export function cleared(c,s)`);
s=s.replace("abstraction:'full-inventory128-star-lift-reveal-age-ice-keys-axes-optional-contact-v147'","abstraction:'v102-witness-only-full-inventory-stable-v15-flip-phase'");
const header=`// DERIVED WITNESS DISCOVERY ONLY. Base ${source} SHA ${digest(fs.readFileSync(source))}.
// New v1.5 stable headless flip phase: before frozen thaw, unchanged; after thaw
// toggles once for each subsequent clear. Full candidate stays original v1.5.
// This graph is never a difficulty lower-bound or GUI-interleaving proof.
// Every accepted route MUST fresh-replay the unmodified actual PuzzleModel.
`;
fs.writeFileSync('tools/remake151-160/agent154-156/witness-v15.mjs',header+s,{flag:'wx'});
