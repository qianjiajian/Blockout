import fs from 'node:fs';
let s=fs.readFileSync('tools/remake171-180/author175-177/author175c.mjs','utf8');
s=s.replace('api,original,save,audit,digest','api,original,audit,digest').replace("from './common.mjs'","from '../author175-177/common.mjs'");
s=s.replace("import {floorCountDown} from './floor-countdown.mjs';","import {freshFloor} from './native.mjs'; const save=(n,d)=>{const f='deliverables/remake171-180-20260927/assist175/'+n+'-'+Date.now()+'.json';fs.writeFileSync(f,JSON.stringify(d,null,2)+'\\n',{flag:'wx'});return f;};");
const start=s.indexOf('const opening='),end=s.indexOf('const hidden=',start);
s=s.slice(0,start)+"const opening=[['cyan','L4'],['yellow','SQ2','pink'],['cyan','RECT6'],['orange','SQ2'],['cyan','V3'],['red','V3'],['green','V3'],['pink','H2'],['cyan','RECT6'],['red','SQ3'],['orange','V2'],['green','SQ2','blue'],['purple','SQ2']];\n"+s.slice(end);
s=s.replace('floorCountDown(level,{floor:16,maxMilliseconds:5000,maxStates:300000})','freshFloor(level,api,{floor:16,maxMilliseconds:2500,maxStates:160000})').replace('175106','9175106');
s=s.replace("design:'Source 13 opening", "design:'New root family: thirteen larger ordinary/native bodies preserve source shell carriers. Source 13 opening");
fs.writeFileSync('tools/remake171-180/assist175/generate.mjs',s,{flag:'wx'});
