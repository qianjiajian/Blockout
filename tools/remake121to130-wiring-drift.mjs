import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inspectDisjointWiring as strictInspect} from './remake111to120-wiring-drift-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
// Independently inspected concurrent131–140 append includes this explanatory
// comment. Permit only that exact comment in addition to the existing strict
// disjoint JSON-stage checks. No executable statement is ignored.
export function inspectDisjointWiring(file,ids,previous,current=fs.readFileSync(file,'utf8')){
 const comment='// v1.72: validated 131–140 members are applied after historical repairs.\n';
 const normalized=current.replaceAll('\r\n','\n');
 const stripped=file==='src/core/levels.ts'&&!previous.includes(comment)?normalized.replace(comment,''):current;
 const result=strictInspect(file,ids,previous,stripped);
 return{...result,currentSha256:digest(current),reviewedExtraComment:stripped!==current?comment.trim():null};
}
export function inspectScopedAxisChange(file,ids,previous,current=fs.readFileSync(file,'utf8')){
 assert.equal(file,'src/core/axisRectangularRepairs.ts');assert(!ids.includes(118));
 const a=previous.replaceAll('\r\n','\n'),b=current.replaceAll('\r\n','\n'),re=/    case 118: [\s\S]*?(?=    case 135:)/;
 const before=re.exec(a)?.[0],after=re.exec(b)?.[0];assert(before&&after);
 assert.equal(before,'    case 118: return removeAxis(level, "v111-118-b6");\n');
 assert.equal(digest(after),'6788b25cdf0fc45ae7a84a96c9834f12fab458e8892363f5644f15e275002e92');
 assert.equal(a.replace(before,''),b.replace(after,''));
 return{file,kind:'reviewed-exact-switch-case118-repair',currentSha256:digest(current),requestedIds:ids,unchangedForRequestedIds:true};
}
