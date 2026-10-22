import fs from 'node:fs';
const src='tools/continue231-240/author232-eight-route.mjs';
let s=fs.readFileSync(src,'utf8');
s=s.replace('deep.slice(0,6)','deep.slice(0,8)').replace('assert.equal(ord.size,8)','assert.equal(ord.size,10)');
s=s.replace("b.x+width(b)/2<4?['blue','red']:['red','blue']","b.x+width(b)/2<4?['red','blue']:['blue','red']");
s=s.replace('恰好8个红蓝普通体、其余18个冰门颜色体','恰好10个红蓝普通体、其余16个冰门颜色体');
fs.writeFileSync('tools/continue231-240/author232-ten-route.mjs',s,{flag:'wx'});
