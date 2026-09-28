// Independent native implementation of the qualified 88/90 immediate FIFO graph.
// No game runtime writes. Shell stages, complete inventory and gate counters remain.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using System.Web.Script.Serialization;

public struct World : IEquatable<World> {
 public ulong A,B,C,D,E;
 public int Get(int i){ulong v=i<8?A:i<16?B:i<24?C:i<32?D:E;return (int)((v>>((i&7)*8))&255);}
 public World Set(int i,int value){World s=this;int shift=(i&7)*8;ulong mask=255UL<<shift,v=(ulong)value<<shift;if(i<8)s.A=(A&~mask)|v;else if(i<16)s.B=(B&~mask)|v;else if(i<24)s.C=(C&~mask)|v;else if(i<32)s.D=(D&~mask)|v;else s.E=(E&~mask)|v;return s;}
 public bool Equals(World x){return A==x.A&&B==x.B&&C==x.C&&D==x.D&&E==x.E;}
 public override bool Equals(object x){return x is World&&Equals((World)x);}
 public override int GetHashCode(){unchecked{ulong h=A*0x9e3779b185ebca87UL;h=(h^B)*0xc2b2ae3d27d4eb4fUL;h=(h^C)*0x165667b19e3779f9UL;h=(h^D)*0x9e3779b185ebca87UL;h=(h^E)*0xc2b2ae3d27d4eb4fUL;h^=h>>33;return (int)(h^(h>>32));}}
 public string Text(int n){byte[] a=new byte[n];for(int i=0;i<n;i++)a[i]=(byte)Get(i);return Convert.ToBase64String(a);}
}
public struct Bits {
 public ulong Lo;public uint Hi;
 public Bits(ulong lo,uint hi){Lo=lo;Hi=hi;}
 public Bits Or(Bits b){return new Bits(Lo|b.Lo,Hi|b.Hi);}
 public Bits Without(Bits b){return new Bits(Lo&~b.Lo,Hi&~b.Hi);}
 public bool Overlaps(Bits b){return (Lo&b.Lo)!=0||(Hi&b.Hi)!=0;}
}
public class Pose {public Bits Mask;public int[] Exits,Neighbors;}
public class Body {public int Layers,Spawn;public Pose[] Poses;}
public class PoseInput {public long[] mask;public int[] exits,neighbors;}
public class BodyInput {public int layers,spawn;public PoseInput[] poses;}
public class GraphInput {
 public int width,height;public int[] initial;public BodyInput[] blocks;public int[][] generators,groups;
 public int floor,maxStates,maxMilliseconds,weight=1000;public bool symmetry=true,collect=false,successorsOnly=false,optionalExit=true;
}
public struct Node {public World State;public int Cost,Clears;public Node(World s,int c,int k){State=s;Cost=c;Clears=k;}}
public struct Held {public World State;public Bits Other;public int H0,H1;public Held(World s,Bits b,int h0,int h1){State=s;Other=b;H0=h0;H1=h1;}}
public class BudgetStop:Exception{public BudgetStop(string s):base(s){}}
public class Walker {
public class StateTable {
 public readonly World[] States; readonly byte[] Dist; readonly int[] Slots; public int Count; readonly int Mask;
 static ulong Mix(ulong x){x^=x>>30;x*=0xbf58476d1ce4e5b9UL;x^=x>>27;x*=0x94d049bb133111ebUL;return x^(x>>31);}
 static ulong Hash(World s){ulong h=Mix(s.A+0x9e3779b97f4a7c15UL);h=Mix(h^s.B);h=Mix(h^s.C);h=Mix(h^s.D);return Mix(h^s.E);}
 public StateTable(int max){int cap=1;while(cap<max*2&&cap<1073741824)cap<<=1;if(cap<max*2)throw new Exception("table capacity overflow");Slots=new int[cap];Mask=cap-1;States=new World[max];Dist=new byte[max];}
 public int Relax(World s,int d,out bool improved){int p=(int)(Hash(s)&(uint)Mask);for(;;){int slot=Slots[p];if(slot==0){if(Count>=States.Length)throw new BudgetStop("max-states");int i=Count++;States[i]=s;Dist[i]=(byte)d;Slots[p]=i+1;improved=true;return i;}int i2=slot-1;if(States[i2].Equals(s)){if(Dist[i2]<=(byte)d){improved=false;return i2;}Dist[i2]=(byte)d;improved=true;return i2;}p=(p+1)&Mask;}}
 public int Distance(int i){return Dist[i];}
}
 readonly GraphInput input;readonly Body[] bodies;readonly int n,totalClears,radix;
 readonly Stopwatch clock=new Stopwatch();
 StateTable table; readonly List<int> currentQueue=new List<int>(); readonly List<int> nextQueue=new List<int>();
 readonly List<Held> held=new List<Held>();
 readonly int[] marks,sortValues=new int[40];int stamp=0,cost;World initial,current,currentKey;
 long explored,transitions;int maxClears=0;int? shortcut;readonly HashSet<string> singleEdges=new HashSet<string>();
 public Walker(GraphInput data){
  input=data;n=data.initial.Length;int cells=data.width*data.height;
  if(n<1||n>40||cells<1||cells>96||data.blocks.Length!=n||data.generators.Length!=2)throw new Exception("unsupported graph dimensions");
  if(data.floor<1||data.floor>10000||data.maxStates<1||data.maxMilliseconds<1||data.weight<0||data.weight>10000)throw new Exception("invalid budget");
  bodies=new Body[n];for(int i=0;i<n;i++){
   BodyInput b=data.blocks[i];if(b.layers<1||b.layers>2||b.poses.Length!=cells)throw new Exception("invalid body");
   bodies[i]=new Body{Layers=b.layers,Spawn=b.spawn,Poses=b.poses.Select(p=>p==null?null:new Pose{Mask=new Bits((ulong)(uint)p.mask[0]|((ulong)(uint)p.mask[1]<<32),(uint)p.mask[2]),Exits=p.exits,Neighbors=p.neighbors}).ToArray()};
   int v=data.initial[i];if(v<0||v>255||(v<254&&((v>>7)>=b.layers||(v&127)>=cells||b.poses[v&127]==null)))throw new Exception("invalid state");initial=initial.Set(i,v);totalClears+=b.layers;
  }
  radix=data.generators[0].Length+1;marks=new int[128*radix*(data.generators[1].Length+1)];
 }
 int Clears(World s){int k=0;for(int i=0;i<n;i++){int v=s.Get(i);if(v==255)k+=bodies[i].Layers;else if(v<254)k+=v>>7;}return k;}
 Bits Occupied(World s){Bits result=new Bits();for(int i=0;i<n;i++){int v=s.Get(i);if(v<254)result=result.Or(bodies[i].Poses[v&127].Mask);}return result;}
 World Key(World s){if(!input.symmetry)return s;World r=s;foreach(int[] group in input.groups){int count=0;foreach(int i in group)if(s.Get(i)!=254)sortValues[count++]=s.Get(i);Array.Sort(sortValues,0,count);int p=0;foreach(int i in group)if(s.Get(i)!=254)r=r.Set(i,sortValues[p++]);}return r;}
 int Head(World s,int g){int[] q=input.generators[g];int h=0;while(h<q.Length&&s.Get(q[h])!=254)h++;return h;}
 World Settle(World s,ref Bits full,ref Bits other,ref int h0,ref int h1){
  bool changed;do{changed=false;for(int g=0;g<2;g++){int h=g==0?h0:h1;int[] q=input.generators[g];if(h==q.Length)continue;int i=q[h];Body b=bodies[i];Bits mask=b.Poses[b.Spawn].Mask;if(mask.Overlaps(full))continue;if(s.Get(i)!=254)throw new Exception("FIFO invariant");s=s.Set(i,b.Spawn);full=full.Or(mask);other=other.Or(mask);if(g==0)h0++;else h1++;changed=true;}}while(changed);return s;
 }
 void Guard(){if(clock.ElapsedMilliseconds>=input.maxMilliseconds)throw new BudgetStop("deadline");}
 void Visit(World s,int edge){transitions++;Guard();int nd=cost+edge;if(nd>=input.floor)return;bool improved;int idx=table.Relax(s,nd,out improved);if(!improved)return;if(edge==0)currentQueue.Add(idx);else nextQueue.Add(idx);}
 void Expand(){
  int cleared=Clears(current),h0=Head(current,0),h1=Head(current,1);Bits occupied=Occupied(current);
  for(int i=0;i<n;i++){
   int start=current.Get(i);if(start>=254)continue;Body b=bodies[i];int stage=start>>7;
   held.Clear();held.Add(new Held(current,occupied.Without(b.Poses[start&127].Mask),h0,h1));if(++stamp==int.MaxValue){Array.Clear(marks,0,marks.Length);stamp=1;}marks[(start&127)+128*(h0+radix*h1)]=stamp;
   for(int pIndex=0;pIndex<held.Count;pIndex++){
    if((pIndex&63)==0)Guard();
    Held x=held[pIndex];int p=x.State.Get(i)&127;Pose pose=b.Poses[p];int exit=pose.Exits[stage];
    if(exit>=0&&cleared>=exit){bool peel=stage+1<b.Layers;World s=x.State.Set(i,peel?p|((stage+1)<<7):255);Bits full=peel?x.Other.Or(pose.Mask):x.Other,other=x.Other;int a=x.H0,z=x.H1;s=Settle(s,ref full,ref other,ref a,ref z);Visit(s,0);if(!input.optionalExit)continue;}
    if(pIndex>0)Visit(x.State,1);
    foreach(int to in pose.Neighbors){Bits mask=b.Poses[to].Mask;if(mask.Overlaps(x.Other))continue;World s=x.State.Set(i,to|(stage<<7));Bits other=x.Other,full=other.Or(mask);int a=x.H0,z=x.H1;s=Settle(s,ref full,ref other,ref a,ref z);int k=to+128*(a+radix*z);if(marks[k]==stamp)continue;marks[k]=stamp;held.Add(new Held(s,other,a,z));}
   }
  }
 }
 public object Run(){
  if(input.collect)throw new Exception("01bfs proof requires collect=false");
  clock.Start();cost=0;table=new StateTable(input.maxStates);bool added;int init=table.Relax(initial,0,out added);currentQueue.Add(init);string stopped=null;int qpos=0;
  try{
   for(cost=0;cost<input.floor;cost++){
    qpos=0;while(qpos<currentQueue.Count){Guard();int idx=currentQueue[qpos++];if(table.Distance(idx)!=cost)continue;current=table.States[idx];explored++;int clears=Clears(current);maxClears=Math.Max(maxClears,clears);if(clears==totalClears){shortcut=cost;throw new BudgetStop("relaxed-shortcut");}Expand();}
    currentQueue.Clear();var tmp=currentQueue;currentQueue.Clear();
    currentQueue.AddRange(nextQueue);nextQueue.Clear();
   }
  }catch(BudgetStop e){stopped=e.Message;}
  bool budget=stopped=="deadline"||stopped=="max-states";
  var r=new Dictionary<string,object>{{"status",budget?"unknown":shortcut.HasValue?"relaxed-shortcut":"threshold-proven"},{"thresholdProven",!budget&&!shortcut.HasValue},{"floor",input.floor},{"discoveredStates",table.Count},{"exploredStates",explored},{"attemptedTransitions",transitions},{"maxClearsSeen",maxClears},{"elapsedMilliseconds",clock.ElapsedMilliseconds},{"abstraction","88-90-native-immediate-full-fifo-shells-01bfs-v151"},{"normalizesClears",false},{"canonicalVisitedKeys",true}};
  if(stopped!=null)r["termination"]=stopped;else if(shortcut.HasValue)r["relaxedNonClearingDrags"]=cost;else r["termination"]="below-threshold-exhausted";return r;
 }
 public static int Main(string[] args){try{if(args.Length!=2)throw new Exception("input/output required");var json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue,RecursionLimit=256};var data=json.Deserialize<GraphInput>(File.ReadAllText(args[0]));File.WriteAllText(args[1],json.Serialize(new Walker(data).Run()));return 0;}catch(Exception e){Console.Error.WriteLine(e);return 1;}}
}
