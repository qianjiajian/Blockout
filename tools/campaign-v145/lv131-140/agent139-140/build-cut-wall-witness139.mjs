import fs from'node:fs';import assert from'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';let cs=fs.readFileSync(root+'native-cut-fast-witness139.cs','utf8');
const before='for(int i=0;i<n;i++)if(Augment(i,adj,matches,new bool[n]))h++;return h;';assert(cs.includes(before));
cs=cs.replace(before,`for(int i=0;i<n;i++)if(Augment(i,adj,matches,new bool[n]))h++;
 // Upper-witness guidance only: remove all bodies already charged by single
 // obligations or eligible for the row matching, then inspect residual walls.
 int clears=Clears(s);Mask128 residual=Occupied(s,clears);
 for(int i=0;i<n;i++){int p=s.Get(i);if(p==511||clears<bodies[i].reveal)continue;
  if(separated[i]==null||counted[i]||(((input.leftRows[i][p&127]|input.rightRows[i][p&127])&upto)!=0))residual^=bodies[i].poses[p&127].mask;
 }
 Body t=bodies[input.target];int start=at&127,head=0,tail=1;int[] wallQueue=new int[128];wallQueue[0]=start;Mask128 wallSeen=Mask128.Bit(start);bool reachable=false;
 while(head<tail&&!reachable){int p=wallQueue[head++];Pose q=t.poses[p];if(q.exits[0]>=0&&clears>=q.exits[0]){reachable=true;break;}
  foreach(int next in q.neighbors){Mask128 bit=Mask128.Bit(next);if(wallSeen.Overlap(bit)||t.poses[next].mask.Overlap(residual))continue;wallSeen|=bit;wallQueue[tail++]=next;}
 }
 if(!reachable)h++;return h;`);
fs.writeFileSync(root+'native-cut-wall-witness139.cs',cs,{flag:'wx'});
const js=fs.readFileSync(root+'native-cut-fast-witness139.mjs','utf8').replaceAll('native-cut-fast-witness139','native-cut-wall-witness139');fs.writeFileSync(root+'native-cut-wall-witness139.mjs',js,{flag:'wx'});
const driver=fs.readFileSync(root+'solve-cut-witness139.mjs','utf8').replace("'./native-cut-witness139.mjs'","'./native-cut-wall-witness139.mjs'").replace('cut-witness-solve139-','cut-wall-witness-solve139-');fs.writeFileSync(root+'solve-cut-wall-witness139.mjs',driver,{flag:'wx'});
