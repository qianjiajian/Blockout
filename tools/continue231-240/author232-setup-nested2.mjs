import fs from 'node:fs';
import assert from 'node:assert/strict';
const input=new URL('./author232-nested.mjs',import.meta.url),out=new URL('./author232-nested2.mjs',import.meta.url);
let text=fs.readFileSync(input,'utf8');
assert.equal((text.match(/count:0,skin:'lift'/g)||[]).length,2);
text=text.replaceAll("count:0,skin:'lift'","count:1,skin:'lift'");
text=text.replace("两个帘内升降随帘一起原创移至下部双区","两个帘内升降随帘一起原创移至下部双区（count=1仅用于未揭开编码，skin=lift仍按真实区域腾空触发，没有倒数阈值）");
text=text.replace('level.preservedMoveTarget=rt.effectiveDrags;','level.parMoves=rt.effectiveDrags;level.preservedMoveTarget=rt.effectiveDrags;');
fs.writeFileSync(out,text,{flag:'wx'});
