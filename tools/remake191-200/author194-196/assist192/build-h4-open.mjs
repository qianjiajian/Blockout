import fs from 'node:fs';
let s=fs.readFileSync('tools/remake191-200/author194-196/assist192/h4.mjs','utf8');
s=s.replace('198192','199192').replace('o11:[0,3]','o11:[0,4]');
fs.writeFileSync('tools/remake191-200/author194-196/assist192/h4-open.mjs',s,{flag:'wx'});
