import fs from 'node:fs';
let s=fs.readFileSync('tools/continue231-240/author232-ten-route.mjs','utf8');
s=s.replace('deep.slice(0,8)','deep.slice(0,10)').replace('assert.equal(ord.size,10)','assert.equal(ord.size,12)');
s=s.replace('恰好10个红蓝普通体、其余16个冰门颜色体','恰好12个红蓝普通体、其余14个冰门颜色体');
s=s.replace('floor:16','floor:26');
s=s.replace("row.status='ROUTE_'+row.route.status;","row.status='DIAGNOSTIC_ROUTE_'+row.route.status;");
fs.writeFileSync('tools/continue231-240/author232-twelve-route.mjs',s,{flag:'wx'});
