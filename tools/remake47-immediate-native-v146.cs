// Lv47 plain frozen bodies/gates and full immediate FIFO inventory only.
// Input is compiled by the independently qualified JavaScript graph builder.
// No runtime mutation; all actual routes remain independently checked there.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using System.Web.Script.Serialization;

public struct World : IEquatable<World> {
 public ulong A,B,C,D;
 public int Get(int i) { ulong v=i<8?A:i<16?B:i<24?C:D; return (int)((v>>((i&7)*8))&255); }
 public World Set(int i,int value) { World s=this; int shift=(i&7)*8; ulong mask=255UL<<shift,v=(ulong)value<<shift; if(i<8)s.A=(A&~mask)|v;else if(i<16)s.B=(B&~mask)|v;else if(i<24)s.C=(C&~mask)|v;else s.D=(D&~mask)|v;return s; }
 public bool Equals(World x){return A==x.A&&B==x.B&&C==x.C&&D==x.D;}
 public override bool Equals(object x){return x is World&&Equals((World)x);}
 public override int GetHashCode(){unchecked{ulong h=A*0x9e3779b185ebca87UL;h=(h^(B+0x517cc1b727220a95UL))*0xc2b2ae3d27d4eb4fUL;h=(h^C)*0x165667b19e3779f9UL;h=(h^D)*0x9e3779b185ebca87UL;h^=h>>33;return (int)(h^(h>>32));}}
 public string Text(int n){byte[] a=new byte[n];for(int i=0;i<n;i++)a[i]=(byte)Get(i);return Convert.ToBase64String(a);}
}
public class Pose {public ulong Mask;public int Exit;public int[] Neighbors;}
public class Body {public int Ice,Spawn;public Pose[] Poses;}
public class GraphInput {public int width,height;public int[] initial;public BodyInput[] blocks;public int[][] generators,groups;public int floor,maxStates,maxMilliseconds;public bool normalize=true,symmetry=true,collect=false;}
public class BodyInput {public int ice,spawn;public PoseInput[] poses;}
public class PoseInput {public long lo,hi;public int exit;public int[] neighbors;}
public class BudgetStop : Exception {public BudgetStop(string text):base(text){}}

public class Walker {
 readonly GraphInput input;readonly Body[] bodies;readonly int n;readonly Stopwatch clock=new Stopwatch();
 readonly int[] work=new int[64],normalWork=new int[64],sortValues=new int[32];
 readonly Dictionary<World,int> dist=new Dictionary<World,int>();readonly Dictionary<World,HashSet<string>> edges=new Dictionary<World,HashSet<string>>();
 List<World>[] buckets;World initial,current,currentKey;int cost;long explored,transitions;int maxCost=-1;int? shortcut=null;
 public Walker(GraphInput data){
  input=data;n=data.initial.Length;if(n<1||n>32||data.width*data.height>64||data.blocks.Length!=n)throw new Exception("unsupported dimensions");
  if(data.floor<1||data.floor>10000||data.maxStates<1||data.maxMilliseconds<1)throw new Exception("invalid budget");
  bodies=new Body[n];for(int i=0;i<n;i++){
   var b=data.blocks[i];if(b.ice<0||b.poses.Length!=data.width*data.height)throw new Exception("invalid body");
   bodies[i]=new Body{Ice=b.ice,Spawn=b.spawn,Poses=b.poses.Select(p=>p==null?null:new Pose{Mask=unchecked((ulong)(uint)p.lo)|((ulong)(uint)p.hi<<32),Exit=p.exit,Neighbors=p.neighbors}).ToArray()};
   int v=data.initial[i];if(v<0||v>255||(v<254&&(v>=b.poses.Length||b.poses[v]==null)))throw new Exception("invalid initial world");initial=initial.Set(i,v);
  }
 }
 int Clears(World s){int count=0;for(int i=0;i<n;i++)if(s.Get(i)==255)count++;return count;}
 ulong Occupied(World s){ulong mask=0;for(int i=0;i<n;i++){int v=s.Get(i);if(v<254)mask|=bodies[i].Poses[v].Mask;}return mask;}
 World Key(World s){if(!input.symmetry)return s;World result=s;foreach(int[] group in input.groups){int count=0;foreach(int i in group)if(s.Get(i)!=254)sortValues[count++]=s.Get(i);Array.Sort(sortValues,0,count);int j=0;foreach(int i in group)if(s.Get(i)!=254)result=result.Set(i,sortValues[j++]);}return result;}
 bool CanClear(int i,int start,int cleared,ulong other){
  Body b=bodies[i];if(cleared<b.Ice)return false;int head=0,tail=1;normalWork[0]=start;ulong seen=1UL<<start;
  while(head<tail){Pose p=b.Poses[normalWork[head++]];if(p.Exit>=0&&cleared>=p.Exit)return true;foreach(int next in p.Neighbors){ulong bit=1UL<<next;if((seen&bit)!=0||(b.Poses[next].Mask&other)!=0)continue;seen|=bit;normalWork[tail++]=next;}}
  return false;
 }
 World Normalize(World s){
  if(!input.normalize)return s;
  for(int i=0;i<n;i++)if(s.Get(i)==254)return s;
  while(true){int cleared=Clears(s);ulong occupied=Occupied(s);bool changed=false;
   for(int i=0;i<n;i++){int v=s.Get(i);if(v>=254)continue;if(!CanClear(i,v,cleared,occupied^bodies[i].Poses[v].Mask))continue;s=s.Set(i,255);changed=true;break;}
   if(!changed)return s;
  }
 }
 void Guard(){if(clock.ElapsedMilliseconds>=input.maxMilliseconds)throw new BudgetStop("deadline");}
 void Visit(World next,int edge){
  transitions++;int nextCost=cost+edge;if(nextCost>=input.floor)return;
  World s=Normalize(next),k=Key(s);if(input.collect)edges[currentKey].Add(edge+":"+k.Text(n));int prior;
  if(dist.TryGetValue(k,out prior)&&prior<=nextCost)return;
  if(!dist.ContainsKey(k)&&dist.Count>=input.maxStates)throw new BudgetStop("max-states");Guard();dist[k]=nextCost;buckets[nextCost].Add(s);
 }
 World Settle(World s){
  ulong occupied=Occupied(s);bool changed;
  do{changed=false;foreach(int[] queue in input.generators){
   int i=-1;foreach(int candidate in queue)if(s.Get(candidate)==254){i=candidate;break;}if(i<0)continue;
   Body b=bodies[i];ulong mask=b.Poses[b.Spawn].Mask;if((mask&occupied)!=0)continue;
   s=s.Set(i,b.Spawn);occupied|=mask;changed=true;
  }}while(changed);return s;
 }
 void Expand(){
  int cleared=Clears(current);
  for(int i=0;i<n;i++){
   int start=current.Get(i);Body b=bodies[i];if(start>=254||cleared<b.Ice)continue;
   // The held body ID is fixed. Arrivals can change the world while its anchor
   // returns to an earlier cell, so pose-only or quotient inner keys are unsafe.
   var nodes=new List<World>{current};var seen=new HashSet<World>{current};
   for(int head=0;head<nodes.Count;head++){
    Guard();World cur=nodes[head];int p=cur.Get(i);Pose pose=b.Poses[p];
    if(head>0)Visit(cur,1);
    if(pose.Exit>=0&&cleared>=pose.Exit)Visit(Settle(cur.Set(i,255)),0);
    ulong other=Occupied(cur)^pose.Mask;
    foreach(int next in pose.Neighbors){
     if((b.Poses[next].Mask&other)!=0)continue;
     World moved=Settle(cur.Set(i,next));if(seen.Add(moved))nodes.Add(moved);
    }
   }
  }
 }
 public object Run(){
  clock.Start();initial=Normalize(initial);World first=Key(initial);dist[first]=0;buckets=new List<World>[input.floor];for(int i=0;i<input.floor;i++)buckets[i]=new List<World>();buckets[0].Add(initial);string stopped=null;
  try{for(cost=0;cost<input.floor;cost++)while(buckets[cost].Count>0){Guard();var bucket=buckets[cost];current=bucket[bucket.Count-1];bucket.RemoveAt(bucket.Count-1);currentKey=Key(current);if(dist[currentKey]!=cost)continue;explored++;maxCost=Math.Max(maxCost,cost);
   if(Clears(current)==n){shortcut=shortcut.HasValue?Math.Min(shortcut.Value,cost):cost;if(!input.collect)goto finished;}
   if(input.collect&&!edges.ContainsKey(currentKey))edges[currentKey]=new HashSet<string>();Expand();
  }}catch(BudgetStop e){stopped=e.Message;}
  finished:
  var result=new Dictionary<string,object>{{"status",stopped!=null?"unknown":shortcut.HasValue?"relaxed-shortcut":"threshold-proven"},{"thresholdProven",stopped==null&&!shortcut.HasValue},{"floor",input.floor},{"exploredStates",explored},{"discoveredStates",dist.Count},{"attemptedTransitions",transitions},{"maxExpandedCost",maxCost},{"milliseconds",clock.ElapsedMilliseconds},{"abstraction","immediate-fifo-emitted-identity-empty-queue-monotone-suffix-native47-v1"}};
  if(stopped!=null)result["termination"]=stopped;else if(shortcut.HasValue)result["relaxedNonClearingDrags"]=shortcut.Value;else result["termination"]="below-threshold-exhausted";
  if(input.collect){result["distances"]=dist.Select(x=>new object[]{x.Key.Text(n),x.Value}).ToArray();result["edges"]=edges.Select(x=>new object[]{x.Key.Text(n),x.Value.ToArray()}).ToArray();}
  return result;
 }
 public static int Main(string[] args){try{if(args.Length!=2)throw new Exception("input/output required");var json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue,RecursionLimit=256};var input=json.Deserialize<GraphInput>(File.ReadAllText(args[0]));var result=new Walker(input).Run();File.WriteAllText(args[1],json.Serialize(result));return 0;}catch(Exception e){Console.Error.WriteLine(e.ToString());return 1;}}
}
