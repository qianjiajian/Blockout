import fs from 'node:fs';let s=fs.readFileSync('tools/continue231-240/author232-open.mjs','utf8');
s=s.replace("if(!visible)return null;",`if(!visible)return null;
 for(let k=0;k<8;k++){const b=visible[Math.floor(rand()*visible.length)];if(b.color==='cyan')continue;const colors=sh(['red','blue','green']);for(const color of colors){if(visible.some(a=>a!==b&&a.color===color&&touch(a,b)))continue;const old=b.color;b.color=color;if(api.auditCandidateBlockArt({blocks:[b]}).passed)break;b.color=old;}}`);
s=s.replace("id:'l232-liftA',x:0,y:1", "id:'l232-liftA',x:0,y:7").replace("id:'l232-liftB',x:4,y:1", "id:'l232-liftB',x:4,y:7")
 .replace('两个帘内升降移至上部开局区','两个帘内升降随帘一起原创移至下部双区')
 .replace('逐层原向新排列','普通开局体有限换色以清晰解锁前置，逐层原向新排列')
 .replace('for(let seed=start;seed<start+count;seed++){let level;',"for(let seed=start;seed<start+count;seed++){while(fs.existsSync(out+'/PAUSE_SEARCH'))await new Promise(r=>setTimeout(r,250));let level;");
fs.writeFileSync('tools/continue231-240/author232-nested.mjs',s,{flag:'wx'});
