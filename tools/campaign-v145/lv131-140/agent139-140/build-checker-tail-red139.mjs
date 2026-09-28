import fs from'node:fs';import assert from'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';let s=fs.readFileSync(root+'actual-checker-recolor139.mjs','utf8');
assert(s.includes("['n139-c16-7','purple']"));s=s.replace("['n139-c16-7','purple']","['n139-c16-7','purple'],['n139-c16-4','blue'],['n139-opening-14','red']");
s=s.replaceAll('actual-checker-recolor-prefix139-','actual-checker-red-prefix139-').replaceAll('actual-checker-recolor-tail139-','actual-checker-red-tail139-');
fs.writeFileSync(root+'actual-checker-red139.mjs',s,{flag:'wx'});
