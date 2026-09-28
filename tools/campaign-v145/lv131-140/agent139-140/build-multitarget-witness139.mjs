import fs from 'node:fs';import assert from 'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';
let cs=fs.readFileSync(root+'native-staggered-witness139.cs','utf8');
cs=cs.replace('public int target,weight;','public int target,weight;public int[] extraTargets;public int[][][][] extraSeparated;');
cs=cs.replace('Mask128[][] separated;Step pending;','Mask128[][] separated;Mask128[][][] extras;Step pending;');
cs=cs.replace('  covers=p.covers.Select','  extras=p.extraSeparated.Select(table=>table.Select(a=>a==null?null:a.Select(b=>{Mask128 m=new Mask128();foreach(int k in b)m=m|Mask128.Bit(k);return m;}).ToArray()).ToArray()).ToArray();\n  covers=p.covers.Select');
const from=cs.indexOf(' int Hint(World s)'),to=cs.indexOf('\n int Score(',from);assert(from>0&&to>from);
cs=cs.slice(0,from)+` int Hint(World s){
 int at=s.Get(input.target),h=0;bool[] counted=new bool[n];
 for(int i=0;i<n;i++){int p=s.Get(i);if(p==511||separated[i]==null)continue;
  bool blocked=at!=511&&separated[i][p&127].Overlap(Mask128.Bit(at&127));
  for(int k=0;k<input.extraTargets.Length&&!blocked;k++){int targetAt=s.Get(input.extraTargets[k]);if(targetAt!=511&&extras[k][i][p&127].Overlap(Mask128.Bit(targetAt&127)))blocked=true;}
  if(blocked){h++;counted[i]=true;}
 }
 if(at==511||input.leftRows==null)return h;
 int upto=input.travelDown?((1<<input.height)-1)^((1<<((at&127)/input.width))-1):(1<<((at&127)/input.width+1))-1;
 List<int>[] adj=new List<int>[n];int[] matches=Enumerable.Repeat(-1,n).ToArray();
 for(int i=0;i<n;i++){adj[i]=new List<int>();int p=s.Get(i);if(p==511||counted[i]||separated[i]==null)continue;int left=input.leftRows[i][p&127]&upto;
  for(int j=0;j<n;j++){int q=s.Get(j);if(q==511||counted[j]||separated[j]==null||i==j)continue;int right=input.rightRows[j][q&127]&upto;if((left&(right|(right<<1)|(right>>1)))!=0)adj[i].Add(j);}
 }
 for(int i=0;i<n;i++)if(Augment(i,adj,matches,new bool[n]))h++;return h;
 }`+cs.slice(to);
fs.writeFileSync(root+'native-multitarget-witness139.cs',cs);
let js=fs.readFileSync(root+'native-staggered-witness139.mjs','utf8').replaceAll('native-staggered-witness139','native-multitarget-witness139');
const marker=' if(target.shape.length===3';assert(js.includes(marker));
const inserted=`
 // Upper-search guidance only. Union distinct fixed nonordinary bodies across
 // every still-live ordinary opening target; never use as a floor certificate.
 const openingIds=new Set(projection.level.blocks.filter(b=>!b.shutterId&&b.color===color).map(b=>b.id));
 p.extraTargets=c.blocks.map((b,i)=>i!==ti&&openingIds.has(b.id)?i:-1).filter(i=>i>=0);
 p.extraSeparated=p.extraTargets.map(index=>{const t=c.blocks[index],memo=new Map();return c.blocks.map(b=>b.layers[0]===color?null:b.poses.map((pose,pos)=>{if(!pose)return[];const tag=JSON.stringify(b.shape)+'@'+pos;if(memo.has(tag))return memo.get(tag);const valid=t.poses.map(q=>q&&!overlap(q.mask,pose.mask)&&!overlap(q.mask,coverMask)),seen=new Set(),todo=[];for(let at=0;at<valid.length;at++)if(valid[at]&&t.poses[at].exits[0]&&!t.poses[at].exits[0].frozen){seen.add(at);todo.push(at);}for(let k=0;k<todo.length;k++)for(const next of t.poses[todo[k]].neighbors)if(valid[next]&&!seen.has(next)){seen.add(next);todo.push(next);}const answer=t.poses.map((q,j)=>q&&!seen.has(j)?j:-1).filter(j=>j>=0);memo.set(tag,answer);return answer;}));});
`;
js=js.replace(marker,inserted+marker).replace("if(target.shape.length===3&&", "if(['left','right'].includes(level.gates.find(g=>g.color===color).side)&&target.shape.length===3&&");fs.writeFileSync(root+'native-multitarget-witness139.mjs',js);
console.log(JSON.stringify({created:['native-multitarget-witness139.cs','native-multitarget-witness139.mjs'],witnessOnly:true,thresholdProven:false}));
