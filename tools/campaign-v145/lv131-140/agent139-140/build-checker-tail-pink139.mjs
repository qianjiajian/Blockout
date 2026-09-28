import fs from'node:fs';import assert from'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';let s=fs.readFileSync(root+'actual-checker-redfill139.mjs','utf8');
assert(s.includes("['a139-checker-fill-5','red']"));s=s.replace("['a139-checker-fill-5','red']","['a139-checker-fill-5','red'],['n139-c16-5','pink']");
s=s.replaceAll('actual-checker-redfill-prefix139-','actual-checker-final-prefix139-').replaceAll('actual-checker-redfill-tail139-','actual-checker-final-tail139-');
fs.writeFileSync(root+'actual-checker-final139.mjs',s,{flag:'wx'});
