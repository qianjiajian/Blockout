// WITNESS DISCOVERY ONLY; heap order/canonical contact deliberately not a proof graph.
// Exact integer implementation of the mask-floor optional-contact graph.
// Same final-body normalization and identity quotient as v139; no shell peel forced.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using System.Web.Script.Serialization;
public struct World:IEquatable<World>{
 public ulong F0,F1,F2,F3;
 public int Get(int i){ulong v;switch(i>>3){case 0:v=F0;break;case 1:v=F1;break;case 2:v=F2;break;case 3:v=F3;break;default:throw new Exception("index");}return(int)((v>>((i&7)*8))&255);}
 public World Set(int i,int v){World s=this;int shift=(i&7)*8;ulong mask=255UL<<shift,b=(ulong)v<<shift;switch(i>>3){case 0:s.F0=(F0&~mask)|b;break;case 1:s.F1=(F1&~mask)|b;break;case 2:s.F2=(F2&~mask)|b;break;case 3:s.F3=(F3&~mask)|b;break;default:throw new Exception("index");}return s;}
 public bool Equals(World x){return F0==x.F0&&F1==x.F1&&F2==x.F2&&F3==x.F3;}
 public override bool Equals(object x){return x is World&&Equals((World)x);}
 public override int GetHashCode(){unchecked{ulong h=0x9e3779b185ebca87UL;h=(h^F0)*0xc2b2ae3d27d4eb4fUL;h=(h^F1)*0xc2b2ae3d27d4eb4fUL;h=(h^F2)*0xc2b2ae3d27d4eb4fUL;h=(h^F3)*0xc2b2ae3d27d4eb4fUL;return(int)(h^(h>>32));}}
 public string Text(int n){byte[] a=new byte[n*2];for(int i=0;i<n;i++){int v=Get(i);if(v==255)v=511;a[i*2]=(byte)v;a[i*2+1]=(byte)(v>>8);}return Convert.ToBase64String(a);}
}
public struct Mask128{
 public ulong Lo,Hi;
 public static Mask128 From(long[] a){if(a.Length!=4)throw new Exception("requires mask128");return new Mask128{Lo=(ulong)(uint)a[0]|((ulong)(uint)a[1]<<32),Hi=(ulong)(uint)a[2]|((ulong)(uint)a[3]<<32)};}
 public static Mask128 Bit(int i){return i<64?new Mask128{Lo=1UL<<i}:new Mask128{Hi=1UL<<(i-64)};}
 public static Mask128 operator |(Mask128 a,Mask128 b){return new Mask128{Lo=a.Lo|b.Lo,Hi=a.Hi|b.Hi};}
 public static Mask128 operator ^(Mask128 a,Mask128 b){return new Mask128{Lo=a.Lo^b.Lo,Hi=a.Hi^b.Hi};}
 public bool Overlap(Mask128 b){return (Lo&b.Lo)!=0||(Hi&b.Hi)!=0;}
}
public class PoseInput{public long[] mask;public int[] exits,neighbors;}
public class BodyInput{public int layers,ice,reveal,lockCount;public int[] keyIndices;public PoseInput[] poses;}
public class CoverInput{public int count;public long[] mask;}
public class Input{public int width,height,floor,maxStates,maxMilliseconds,goalClears;public int[] initial;public int[][] groups,states;public BodyInput[] blocks;public CoverInput[] covers;public bool successorsOnly;}
public class Pose{public Mask128 mask;public int[] exits,neighbors;}
public class Body{public int layers,ice,reveal,lockCount;public int[] keyIndices;public Pose[] poses;}
public class Cover{public int count;public Mask128 mask;}
public class BudgetStop:Exception{public BudgetStop(string s):base(s){}}
public class Solver{
 readonly Input input;readonly Body[] bodies;readonly Cover[] covers;readonly int n,total;readonly bool singleStage;
 readonly int[] heldQueue=new int[128],normQueue=new int[128],sortValues=new int[64];
 readonly Stopwatch clock=new Stopwatch();readonly List<int> currentQueue=new List<int>(),nextQueue=new List<int>();
 readonly Dictionary<World,int> indices=new Dictionary<World,int>();readonly List<World> states=new List<World>();readonly List<byte> distances=new List<byte>();
 readonly List<int> parents=new List<int>(),heap=new List<int>();int currentIndex;
 int Score(int i){return Clears(states[i])*1000-distances[i];}
 void Push(int i){heap.Add(i);int at=heap.Count-1;while(at>0){int p=(at-1)/2;if(Score(heap[p])>=Score(heap[at]))break;int tmp=heap[p];heap[p]=heap[at];heap[at]=tmp;at=p;}}
 int Pop(){int v=heap[0],last=heap[heap.Count-1];heap.RemoveAt(heap.Count-1);if(heap.Count>0){heap[0]=last;int p=0;while(p*2+1<heap.Count){int a=p*2+1;if(a+1<heap.Count&&Score(heap[a+1])>Score(heap[a]))a++;if(Score(heap[p])>=Score(heap[a]))break;int tmp=heap[p];heap[p]=heap[a];heap[a]=tmp;p=a;}}return v;}
 long explored,transitions;int cost,maxClears;World initial,current;int? shortcut;
 static Mask128 Mask(long[] a){return Mask128.From(a);}
 World From(int[] a){if(a.Length!=n)throw new Exception("state length");World s=new World();for(int i=0;i<n;i++){int v=a[i]==511?255:a[i];if(v<0||v>255||(v!=255&&((v>>7)>=bodies[i].layers||(v&127)>=input.width*input.height||bodies[i].poses[v&127]==null)))throw new Exception("invalid state");s=s.Set(i,v);}return s;}
 public Solver(Input p){input=p;n=p.blocks.Length;if(n<1||n>32||p.width*p.height>96)throw new Exception("dimensions");if(p.goalClears<1)throw new Exception("prefix goal");if(p.floor<1||p.floor>254||p.maxStates<1||p.maxMilliseconds<1)throw new Exception("budget");
  bodies=p.blocks.Select(b=>new Body{layers=b.layers,ice=b.ice,reveal=b.reveal,lockCount=b.lockCount,keyIndices=b.keyIndices??new int[0],poses=b.poses.Select(x=>x==null?null:new Pose{mask=Mask(x.mask),exits=x.exits,neighbors=x.neighbors}).ToArray()}).ToArray();
  if(bodies.Any(b=>b.layers<1||b.layers>2||b.ice<0||b.reveal<0))throw new Exception("body domain");
  covers=p.covers.Select(c=>new Cover{count=c.count,mask=Mask(c.mask)}).ToArray();total=bodies.Sum(b=>b.layers);singleStage=bodies.All(b=>b.layers==1);initial=From(p.initial);
 }
 int Clears(World s){int c=0;for(int i=0;i<n;i++){int v=s.Get(i);c+=v==255?bodies[i].layers:v>>7;}return c;}
 bool Locked(World s,Body b){return b.lockCount>b.keyIndices.Count(i=>s.Get(i)==255);}
 Mask128 Occupied(World s,int c){Mask128 mask=new Mask128();foreach(Cover cover in covers)if(c<cover.count)mask|=cover.mask;for(int i=0;i<n;i++){int v=s.Get(i);if(v!=255&&c>=bodies[i].reveal)mask|=bodies[i].poses[v&127].mask;}return mask;}
 World Key(World s){foreach(int[] g in input.groups){for(int j=0;j<g.Length;j++)sortValues[j]=s.Get(g[j]);Array.Sort(sortValues,0,g.Length);for(int j=0;j<g.Length;j++)s=s.Set(g[j],sortValues[j]);}return s;}
 World Normalize(World s){for(;;){int clears=Clears(s);if(clears>=input.goalClears)return s;Mask128 occupied=Occupied(s,clears);bool found=false;
  for(int i=0;i<n&&!found;i++){Body b=bodies[i];int v=s.Get(i);if(v==255||v>>7!=b.layers-1||clears<b.reveal+b.ice||Locked(s,b))continue;int start=v&127,stage=v>>7;Mask128 other=occupied^b.poses[start].mask,seen=Mask128.Bit(start);int head=0,tail=1;normQueue[0]=start;
   while(head<tail){int at=normQueue[head++];Pose p=b.poses[at];if(p.exits[stage]>=0&&clears>=p.exits[stage]){s=s.Set(i,255);found=true;break;}foreach(int to in p.neighbors){Mask128 bit=Mask128.Bit(to);if(seen.Overlap(bit)||b.poses[to].mask.Overlap(other))continue;seen|=bit;normQueue[tail++]=to;}}
  }if(!found)return s;
 }}
 void Guard(){if(clock.ElapsedMilliseconds>=input.maxMilliseconds)throw new BudgetStop("deadline");}
 void Visit(World s,int edge,HashSet<string> collect){transitions++;if(collect==null&&((transitions&255)==0))Guard();int nextCost=cost+edge;if(collect==null&&nextCost>=input.floor)return;World normalized=Key(Normalize(s));if(collect==null&&singleStage&&nextCost==input.floor-1&&Clears(normalized)<input.goalClears)return;if(collect!=null){collect.Add(edge+":"+normalized.Text(n));return;}
  int i;if(indices.TryGetValue(normalized,out i)){if(distances[i]<=nextCost)return;distances[i]=(byte)nextCost;parents[i]=currentIndex;}else{if(states.Count>=input.maxStates)throw new BudgetStop("max-states");i=states.Count;indices.Add(normalized,i);states.Add(normalized);distances.Add((byte)nextCost);parents.Add(currentIndex);}Push(i);
 }
 void Expand(World s,HashSet<string> collect){int clears=Clears(s);if(clears>=input.goalClears)return;Mask128 occupied=Occupied(s,clears);
  for(int i=0;i<n;i++){Body b=bodies[i];int v=s.Get(i);if(v==255||clears<b.reveal+b.ice||Locked(s,b))continue;int start=v&127,stage=v>>7;Mask128 other=occupied^b.poses[start].mask,seen=Mask128.Bit(start);int head=0,tail=1;heldQueue[0]=start;
   while(head<tail){int at=heldQueue[head++];Pose p=b.poses[at];if(p.exits[stage]>=0&&clears>=p.exits[stage]){Visit(s.Set(i,stage+1<b.layers?at|((stage+1)<<7):255),0,collect);continue;}if(at!=start)Visit(s.Set(i,at|(stage<<7)),1,collect);
    foreach(int to in p.neighbors){Mask128 bit=Mask128.Bit(to);if(seen.Overlap(bit)||b.poses[to].mask.Overlap(other))continue;seen|=bit;heldQueue[tail++]=to;}
   }
  }
 }
 public object Run(){
  if(input.successorsOnly){var rows=new List<object>();foreach(int[] a in input.states){World s=From(a);var next=new HashSet<string>();Expand(s,next);rows.Add(new{state=s.Text(n),normalized=Normalize(s).Text(n),canonical=Key(Normalize(s)).Text(n),successors=next.OrderBy(x=>x).ToArray()});}return new{rows=rows};}
  clock.Start();World first=Key(Normalize(initial));indices.Add(first,0);states.Add(first);distances.Add(0);parents.Add(-1);Push(0);string stopped=null;
  try{while(heap.Count>0){Guard();int i=Pop();cost=distances[i];currentIndex=i;current=states[i];explored++;int clears=Clears(current);maxClears=Math.Max(maxClears,clears);if(clears>=input.goalClears){shortcut=cost;throw new BudgetStop("witness");}Expand(current,null);}}
  catch(BudgetStop e){stopped=e.Message;}
  var route=new List<string>();if(shortcut.HasValue){for(int at=currentIndex;at>=0;at=parents[at])route.Add(states[at].Text(n));route.Reverse();}bool unknown=stopped=="deadline"||stopped=="max-states";return new{witnessStates=route.ToArray(),discoveryOnly=true,status=unknown?"unknown":shortcut.HasValue?"witness":"exhausted",thresholdProven=false,floor=input.floor,relaxedNonClearingDrags=shortcut,exploredStates=explored,discoveredStates=states.Count,attemptedTransitions=transitions,maxClearsSeen=maxClears,elapsedMilliseconds=clock.ElapsedMilliseconds,termination=stopped??"below-threshold-exhausted",abstraction="native-mask128-fixed-cover-prefix-identity-quotient-stop-at-goal-v172",pointerValidated=false,timeValidated=false};
 }
 public static int Main(string[] args){try{var json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue,RecursionLimit=256};Input p=json.Deserialize<Input>(File.ReadAllText(args[0]));File.WriteAllText(args[1],json.Serialize(new Solver(p).Run()));return 0;}catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}}
}

