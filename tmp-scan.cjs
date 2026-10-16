const fs=require('fs'),path=require('path');
const root='deliverables'; const out=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p); else if(e.isFile()&&e.name.endsWith('.json')){let j;try{j=JSON.parse(fs.readFileSync(p,'utf8'));}catch{continue;} const s=JSON.stringify(j); if(/lowerBound|nonClearingDrags|reposition|thresholdProven|necessaryReposition/.test(s)&&/"(?:levelId|id)"\s*:\s*(?:4[2-9]|5[0-9]|12[1247]|18[1-9]|19[0-9])/.test(s)){out.push({p,preview:s.slice(0,1000)});}}}}
walk(root);console.log(out.length); for(const x of out)console.log(x.p);
