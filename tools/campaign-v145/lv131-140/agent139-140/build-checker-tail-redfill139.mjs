import fs from'node:fs';import assert from'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';let s=fs.readFileSync(root+'actual-checker-red139.mjs','utf8');
assert(s.includes("['n139-opening-14','red']"));s=s.replace("['n139-opening-14','red']","['n139-opening-14','red'],['a139-checker-fill-5','red']");
s=s.replaceAll('actual-checker-red-prefix139-','actual-checker-redfill-prefix139-').replaceAll('actual-checker-red-tail139-','actual-checker-redfill-tail139-');
fs.writeFileSync(root+'actual-checker-redfill139.mjs',s,{flag:'wx'});
