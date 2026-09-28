import fs from 'node:fs';
const src='tools/campaign-v145/lv141-150/round2-root/decisions.mjs';
let code=fs.readFileSync(src,'utf8').replace('{loadApi,projection,OUTPUT}','{loadApi,projection}');
code=code.replace('const {api}=await loadApi();',"const OUTPUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b';\nconst {api}=await loadApi();");
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/decisions147.mjs',code);
