// Full inventory optional-lift relaxation; no forced peel or forced lift reveal.
// Compiled poses retain immutable grids, axes, portals and every shell stage.
using System;using System.IO;using System.Linq;using System.Collections.Generic;using System.Diagnostics;using System.Web.Script.Serialization;
public struct World:IEquatable<World>{
 public ulong A,B,C,D,E,F,G,H;
 public int Get(int i){ulong v;switch(i>>3){case 0:v=A;break;case 1:v=B;break;case 2:v=C;break;case 3:v=D;break;case 4:v=E;break;case 5:v=F;break;case 6:v=G;break;case 7:v=H;break;default:throw new Exception("index");}return(int)((v>>((i&7)*8))&255);}
 public World Set(int i,int v){World s=this;int k=(i&7)*8;ulong mask=255UL<<k,b=(ulong)v<<k;switch(i>>3){case 0:s.A=(A&~mask)|b;break;case 1:s.B=(B&~mask)|b;break;case 2:s.C=(C&~mask)|b;break;case 3:s.D=(D&~mask)|b;break;case 4:s.E=(E&~mask)|b;break;case 5:s.F=(F&~mask)|b;break;case 6:s.G=(G&~mask)|b;break;case 7:s.H=(H&~mask)|b;break;default:throw new Exception("index");}return s;}
 public bool Equals(World s){return A==s.A&&B==s.B&&C==s.C&&D==s.D&&E==s.E&&F==s.F&&G==s.G&&H==s.H;}public override bool Equals(object s){return s is World&&Equals((World)s);}
 public override int GetHashCode(){unchecked{ulong h=0x9e3779b185ebca87UL;h=(h^A)*0xc2b2ae3d27d4eb4fUL;h=(h^B)*0xc2b2ae3d27d4eb4fUL;h=(h^C)*0xc2b2ae3d27d4eb4fUL;h=(h^D)*0xc2b2ae3d27d4eb4fUL;h=(h^E)*0xc2b2ae3d27d4eb4fUL;h=(h^F)*0xc2b2ae3d27d4eb4fUL;h=(h^G)*0xc2b2ae3d27d4eb4fUL;h=(h^H)*0xc2b2ae3d27d4eb4fUL;return(int)(h^(h>>32));}}
 public string Text(int count){return String.Join(",",Enumerable.Range(0,count).Select(Get).Select(v=>v==255?65535:v));}
}
public struct Mask{public ulong Lo,Hi;public static Mask From(long[] a){return new Mask{Lo=(ulong)(uint)a[0]|((ulong)(uint)a[1]<<32),Hi=(ulong)(uint)a[2]|((ulong)(uint)a[3]<<32)};}public static Mask Bit(int i){return i<64?new Mask{Lo=1UL<<i}:new Mask{Hi=1UL<<(i-64)};}public static Mask operator |(Mask a,Mask b){return new Mask{Lo=a.Lo|b.Lo,Hi=a.Hi|b.Hi};}public bool Overlap(Mask b){return(Lo&b.Lo)!=0||(Hi&b.Hi)!=0;}}
public class PoseInput{public long[] mask;public int[] exits,neighbors;}public class BodyInput{public int layers,ice,cover;public PoseInput[] poses;}public class CoverInput{public int count,predecessor;public bool lift;public long[] mask;public int[] members;}
public class Input{public int width,height,floor,maxStates,maxMilliseconds;public int[] initial;public int[][] groups,states;public BodyInput[] blocks;public CoverInput[] covers;public bool successorsOnly;public int[] coverLowerBounds;}
public class Pose{public Mask mask;public int[] exits,neighbors;}public class Body{public int layers,ice,cover;public Pose[] poses;}public class Cover{public int count,predecessor;public bool lift;public Mask mask;public int[] members;}
public class BudgetStop:Exception{public BudgetStop(string s):base(s){}}
public class Solver{
 readonly Input input;readonly Body[] bodies;readonly Cover[] covers;readonly int n,total,count;readonly Stopwatch clock=new Stopwatch();
 readonly int[] held=new int[128],norm=new int[128],sort=new int[64];readonly Dictionary<World,int> seen=new Dictionary<World,int>();readonly Dictionary<World,int> rawSeen=new Dictionary<World,int>();readonly HashSet<World> zeroFailed=new HashSet<World>();
 readonly List<World>[] buckets;long explored,transitions;int cost,frontier,maxClears;World initial;int? shortcut;
 public Solver(Input p){input=p;n=p.blocks.Length;count=n+p.covers.Length;if(n<1||count>64||p.width*p.height>128||p.floor<1||p.floor>100||p.maxStates<1||p.maxMilliseconds<1)throw new Exception("domain");
  bodies=p.blocks.Select(b=>new Body{layers=b.layers,ice=b.ice,cover=b.cover,poses=b.poses.Select(q=>q==null?null:new Pose{mask=Mask.From(q.mask),exits=q.exits,neighbors=q.neighbors}).ToArray()}).ToArray();covers=p.covers.Select(c=>new Cover{count=c.count,predecessor=c.predecessor,lift=c.lift,mask=Mask.From(c.mask),members=c.members}).ToArray();
  if(bodies.Any(b=>b.layers<1||b.layers>2||b.ice<0||b.cover>=covers.Length||b.cover>=0&&covers[b.cover].lift&&b.ice!=0))throw new Exception("unsupported body");total=bodies.Sum(b=>b.layers);if(total>=255)throw new Exception("clear count");initial=From(p.initial);buckets=Enumerable.Range(0,p.floor).Select(i=>new List<World>()).ToArray();
 }
 World From(int[] a){if(a.Length!=count)throw new Exception("state length");World s=new World();for(int i=0;i<count;i++){int v=a[i]==65535?255:a[i];if(v<0||v>255)throw new Exception("invalid state");s=s.Set(i,v);}return s;}
 int Clears(World s){int c=0;for(int i=0;i<n;i++){int v=s.Get(i);c+=v==255?bodies[i].layers:v>>7;}return c;}
 bool Visible(World s,int i){return s.Get(i)!=255&&(bodies[i].cover<0||s.Get(n+bodies[i].cover)!=255);}
 bool Active(World s,int i,int clears){Body b=bodies[i];return Visible(s,i)&&clears-(b.cover<0?0:s.Get(n+b.cover))>=b.ice;}
 Mask Occupied(World s,int skip,int skipCover){Mask occupied=new Mask();for(int j=0;j<covers.Length;j++)if(j!=skipCover&&!covers[j].lift&&s.Get(n+j)==255)occupied|=covers[j].mask;for(int i=0;i<n;i++)if(i!=skip&&Visible(s,i))occupied|=bodies[i].poses[s.Get(i)&127].mask;return occupied;}
 World Settle(World s){int clears=Clears(s);bool changed;do{changed=false;for(int j=0;j<covers.Length;j++){Cover co=covers[j];if(co.lift||s.Get(n+j)!=255||clears<co.count)continue;Mask occ=Occupied(s,-1,j);bool ok=true;foreach(int i in co.members){Mask m=bodies[i].poses[s.Get(i)&127].mask;if(occ.Overlap(m)){ok=false;break;}occ|=m;}if(ok){s=s.Set(n+j,clears);changed=true;}}}while(changed);return s;}
 World Key(World s){foreach(int[] group in input.groups){for(int k=0;k<group.Length;k++)sort[k]=s.Get(group[k]);Array.Sort(sort,0,group.Length);for(int k=0;k<group.Length;k++)s=s.Set(group[k],sort[k]);}return s;}
 World Normalize(World s){for(;;){bool found=false;int clears=Clears(s);for(int i=0;i<n&&!found;i++){Body b=bodies[i];int v=s.Get(i);World candidate=s;if(!Active(s,i,clears)){if(v==255||b.cover<0||b.layers!=1)continue;Cover co=covers[b.cover];if(!co.lift||co.members.Length!=1||s.Get(n+b.cover)!=255||(co.predecessor>=0&&s.Get(n+co.predecessor)==255)||Occupied(s,-1,-1).Overlap(co.mask))continue;candidate=s.Set(n+b.cover,0);}if((v>>7)!=b.layers-1)continue;Mask occ=Occupied(candidate,i,-1),visited=Mask.Bit(v&127);int head=0,tail=1;norm[0]=v&127;
   while(head<tail){int at=norm[head++];Pose p=b.poses[at];if(p.exits[v>>7]>=0&&clears>=p.exits[v>>7]){s=Settle(candidate.Set(i,255));found=true;break;}foreach(int to in p.neighbors){Mask bit=Mask.Bit(to);if(visited.Overlap(bit)||p==null||b.poses[to].mask.Overlap(occ))continue;visited|=bit;norm[tail++]=to;}}
  }if(!found)return s;}}
 void Guard(){if(clock.ElapsedMilliseconds>=input.maxMilliseconds)throw new BudgetStop("deadline");}
 bool ZeroComplete(World s){Guard();s=Key(Normalize(s));int clears=Clears(s);if(clears==total)return true;if(zeroFailed.Contains(s))return false;
  Mask occupied=Occupied(s,-1,-1);for(int j=0;j<covers.Length;j++)if(covers[j].lift&&s.Get(n+j)==255&&(covers[j].predecessor<0||s.Get(n+covers[j].predecessor)!=255)&&!occupied.Overlap(covers[j].mask)&&ZeroComplete(Settle(s.Set(n+j,0))))return true;
  for(int i=0;i<n;i++){Body b=bodies[i];int v=s.Get(i);if(!Active(s,i,clears)||(v>>7)>=b.layers-1)continue;Mask occ=Occupied(s,i,-1),visited=Mask.Bit(v&127);var queue=new int[128];int head=0,tail=1;queue[0]=v&127;
   while(head<tail){int at=queue[head++];Pose p=b.poses[at];if(p.exits[v>>7]>=0&&clears>=p.exits[v>>7]&&ZeroComplete(Settle(s.Set(i,at|(((v>>7)+1)<<7)))))return true;foreach(int to in p.neighbors){Mask bit=Mask.Bit(to);if(visited.Overlap(bit)||b.poses[to].mask.Overlap(occ))continue;visited|=bit;queue[tail++]=to;}}
  }zeroFailed.Add(s);return false;
 }
 int Potential(World s){int h=0;if(input.coverLowerBounds!=null)for(int j=0;j<covers.Length;j++)if(s.Get(n+j)==255)h=Math.Max(h,input.coverLowerBounds[j]);return h;}
 void Visit(World raw,int delta,HashSet<string> collect){transitions++;if(collect==null&&(transitions&255)==0)Guard();int nextCost=cost+delta;if(collect==null&&nextCost>=input.floor)return;
  int prior;World rawKey=Key(raw);if(collect==null&&rawSeen.TryGetValue(rawKey,out prior)&&prior<=nextCost)return;if(collect==null)rawSeen[rawKey]=nextCost;
  World next=Key(Normalize(raw));if(collect!=null){collect.Add(delta+":"+next.Text(count));return;}
  if(nextCost+Potential(next)>=input.floor)return;
  if(nextCost==input.floor-1){if(ZeroComplete(next)){shortcut=nextCost;throw new BudgetStop("relaxed-shortcut");}return;}
  if(seen.TryGetValue(next,out prior)&&prior<=nextCost)return;if(seen.Count>=input.maxStates)throw new BudgetStop("max-states");seen[next]=nextCost;buckets[nextCost].Add(next);
 }
 void Expand(World s,HashSet<string> collect){int clears=Clears(s);Mask occupied=Occupied(s,-1,-1);
  for(int j=0;j<covers.Length;j++)if(covers[j].lift&&s.Get(n+j)==255&&(covers[j].predecessor<0||s.Get(n+covers[j].predecessor)!=255)&&!occupied.Overlap(covers[j].mask))Visit(Settle(s.Set(n+j,0)),0,collect);
  for(int i=0;i<n;i++){Body b=bodies[i];int v=s.Get(i);if(!Active(s,i,clears))continue;Mask occ=Occupied(s,i,-1),visited=Mask.Bit(v&127);int head=0,tail=1;held[0]=v&127;
   while(head<tail){int at=held[head++];Pose p=b.poses[at];if(at!=(v&127))Visit(s.Set(i,at|(v&128)),1,collect);if(p.exits[v>>7]>=0&&clears>=p.exits[v>>7])Visit(Settle(s.Set(i,(v>>7)+1<b.layers?at|(((v>>7)+1)<<7):255)),0,collect);
    foreach(int to in p.neighbors){Mask bit=Mask.Bit(to);if(visited.Overlap(bit)||b.poses[to].mask.Overlap(occ))continue;visited|=bit;held[tail++]=to;}}
  }
 }
 public object Run(){if(input.successorsOnly){var rows=new List<object>();foreach(int[] a in input.states){World s=From(a);var successors=new HashSet<string>();Expand(s,successors);rows.Add(new{state=s.Text(count),normalized=Key(Normalize(s)).Text(count),successors=successors.OrderBy(x=>x).ToArray()});}return new{rows=rows};}
  clock.Start();World first=Key(Normalize(initial));seen[first]=0;buckets[0].Add(first);string stop=null;try{for(cost=0;cost<input.floor;cost++){frontier=cost;for(int j=0;j<buckets[cost].Count;j++){Guard();World s=buckets[cost][j];if(seen[s]<cost||cost+Potential(s)>=input.floor)continue;explored++;int clears=Clears(s);maxClears=Math.Max(maxClears,clears);if(clears==total){shortcut=cost;throw new BudgetStop("relaxed-shortcut");}Expand(s,null);}}}catch(BudgetStop e){stop=e.Message;}
  bool unknown=stop=="deadline"||stop=="max-states";return new{status=unknown?"unknown":shortcut.HasValue?"relaxed-shortcut":"threshold-proven",thresholdProven=!unknown&&!shortcut.HasValue,floor=input.floor,frontierCost=frontier,relaxedNonClearingDrags=shortcut,exploredStates=explored,discoveredStates=seen.Count,attemptedTransitions=transitions,maxClearsSeen=maxClears,elapsedMilliseconds=clock.ElapsedMilliseconds,termination=stop??"below-threshold-exhausted",method="native-full-inventory-delayed-fifo-hidden-layer-certified-potential",pointerValidated=false,timeValidated=false};
 }
 public static int Main(string[] args){try{var json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue,RecursionLimit=256};var input=json.Deserialize<Input>(File.ReadAllText(args[0]));File.WriteAllText(args[1],json.Serialize(new Solver(input).Run()));return 0;}catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}}
}




