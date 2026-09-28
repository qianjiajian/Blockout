import fs from'node:fs';import assert from'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';let s=fs.readFileSync(root+'actual-checker-tail139.mjs','utf8');
const old="drag.blockId==='n139-opening-12'?destinations[1]:null";assert(s.includes(old));s=s.replace(old,"drag.blockId==='n139-opening-12'?destinations[1]:drag.blockId==='n139-opening-6'?[6,4]:null");
s=s.replaceAll('actual-checker-prefix139-','actual-checker-lane-prefix139-').replaceAll('actual-checker-tail139-','actual-checker-lane-tail139-');
fs.writeFileSync(root+'actual-checker-clear-lane139.mjs',s,{flag:'wx'});
