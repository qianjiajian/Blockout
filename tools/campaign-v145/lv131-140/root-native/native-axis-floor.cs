// Exact integer implementation of the mask-floor optional-contact graph.
// Same final-body normalization and identity quotient as v139; no shell peel forced.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using System.Web.Script.Serialization;
public struct World:IEquatable<World>{
 public ulong A,B,C,D;
 public int Get(int i){ulong v=i<8?A:i<16?B:i<24?C:D;return(int)((v>>((i&7)*8))&255);}
 public World Set(int i,int v){World s=this;int shift=(i&7)*8;ulong m=255UL<<shift,b=(ulong)v<<shift;if(i<8)s.A=(A&~m)|b;else if(i<16)s.B=(B&~m)|b;else if(i<24)s.C=(C&~m)|b;else s.D=(D&~m)|b;return s;}
 public bool Equals(World x){return A==x.A&&B==x.B&&C==x.C&&D==x.D;}
 public override bool Equals(object x){return x is World&&Equals((World)x);}
 public override int GetHashCode(){unchecked{ulong h=A*0x9e3779b185ebca87UL;h=(h^B)*0xc2b2ae3d27d4eb4fUL;h=(h^C)*0x165667b19e3779f9UL;h=(h^D)*0xc2b2ae3d27d4eb4fUL;return(int)(h^(h>>32));}}
 public string Text(int n){byte[] a=new byte[n];for(int i=0;i<n;i++)a[i]=(byte)Get(i);return Convert.ToBase64String(a);}
}
public class PoseInput{public long[] mask;public int[] exits,neighbors;}
public class BodyInput{public int layers,ice,reveal;public PoseInput[] poses;}
public class CoverInput{public int count;public long[] mask;}
public class Input{public int width,height,floor,maxStates,maxMilliseconds;public int[] initial;public int[][] groups,states;public BodyInput[] blocks;public CoverInput[] covers;public bool successorsOnly;}
public class Pose{public ulong mask;public int[] exits,neighbors;}
public class Body{public int layers,ice,reveal;public Pose[] poses;}
public class Cover{public int count;public ulong mask;}
public class BudgetStop:Exception{public BudgetStop(string s):base(s){}}
public class Solver{
 readonly Input input;readonly Body[] bodies;readonly Cover[] covers;readonly int n,total;
 readonly int[] heldQueue=new int[64],normQueue=new int[64],sortValues=new int[32];
 readonly Stopwatch clock=new Stopwatch();readonly List<int> currentQueue=new List<int>(),nextQueue=new List<int>();
 readonly Dictionary<World,int> indices=new Dictionary<World,int>();readonly List<World> states=new List<World>();readonly List<byte> distances=new List<byte>();
 long explored,transitions;int cost,maxClears;World initial,current;int? shortcut;
 static ulong Mask(long[] a){if(a.Length!=3||a[2]!=0)throw new Exception("requires mask64");return(ulong)(uint)a[0]|((ulong)(uint)a[1]<<32);}
 World From(int[] a){if(a.Length!=n)throw new Exception("state length");World s=new World();for(int i=0;i<n;i++){int v=a[i];if(v<0||v>255||(v!=255&&((v>>7)>=bodies[i].layers||(v&127)>=input.width*input.height||bodies[i].poses[v&127]==null)))throw new Exception("invalid state");s=s.Set(i,v);}return s;}
 public Solver(Input p){input=p;n=p.blocks.Length;if(n<1||n>32||p.width*p.height>64)throw new Exception("dimensions");if(p.floor<1||p.floor>254||p.maxStates<1||p.maxMilliseconds<1)throw new Exception("budget");
  bodies=p.blocks.Select(b=>new Body{layers=b.layers,ice=b.ice,reveal=b.reveal,poses=b.poses.Select(x=>x==null?null:new Pose{mask=Mask(x.mask),exits=x.exits,neighbors=x.neighbors}).ToArray()}).ToArray();
  if(bodies.Any(b=>b.layers<1||b.layers>2||b.ice<0||b.reveal<0))throw new Exception("body domain");
  covers=p.covers.Select(c=>new Cover{count=c.count,mask=Mask(c.mask)}).ToArray();total=bodies.Sum(b=>b.layers);initial=From(p.initial);
 }
 int Clears(World s){int c=0;for(int i=0;i<n;i++){int v=s.Get(i);c+=v==255?bodies[i].layers:v>>7;}return c;}
 ulong Occupied(World s,int c){ulong mask=0;foreach(Cover cover in covers)if(c<cover.count)mask|=cover.mask;for(int i=0;i<n;i++){int v=s.Get(i);if(v!=255&&c>=bodies[i].reveal)mask|=bodies[i].poses[v&127].mask;}return mask;}
 World Key(World s){foreach(int[] g in input.groups){for(int j=0;j<g.Length;j++)sortValues[j]=s.Get(g[j]);Array.Sort(sortValues,0,g.Length);for(int j=0;j<g.Length;j++)s=s.Set(g[j],sortValues[j]);}return s;}
 World Normalize(World s){for(;;){int clears=Clears(s);ulong occupied=Occupied(s,clears);bool found=false;
  for(int i=0;i<n&&!found;i++){Body b=bodies[i];int v=s.Get(i);if(v==255||v>>7!=b.layers-1||clears<b.reveal+b.ice)continue;int start=v&127,stage=v>>7;ulong other=occupied^b.poses[start].mask,seen=1UL<<start;int head=0,tail=1;normQueue[0]=start;
   while(head<tail){int at=normQueue[head++];Pose p=b.poses[at];if(p.exits[stage]>=0&&clears>=p.exits[stage]){s=s.Set(i,255);found=true;break;}foreach(int to in p.neighbors){ulong bit=1UL<<to;if((seen&bit)!=0||(b.poses[to].mask&other)!=0)continue;seen|=bit;normQueue[tail++]=to;}}
  }if(!found)return s;
 }}
 void Guard(){if(clock.ElapsedMilliseconds>=input.maxMilliseconds)throw new BudgetStop("deadline");}
 void Visit(World s,int edge,HashSet<string> collect){transitions++;if(collect==null&&((transitions&255)==0))Guard();int nextCost=cost+edge;if(collect==null&&nextCost>=input.floor)return;World normalized=Key(Normalize(s));if(collect!=null){collect.Add(edge+":"+normalized.Text(n));return;}
  int i;if(indices.TryGetValue(normalized,out i)){if(distances[i]<=nextCost)return;distances[i]=(byte)nextCost;}else{if(states.Count>=input.maxStates)throw new BudgetStop("max-states");i=states.Count;indices.Add(normalized,i);states.Add(normalized);distances.Add((byte)nextCost);}if(edge==0)currentQueue.Add(i);else nextQueue.Add(i);
 }
 void Expand(World s,HashSet<string> collect){int clears=Clears(s);ulong occupied=Occupied(s,clears);
  for(int i=0;i<n;i++){Body b=bodies[i];int v=s.Get(i);if(v==255||clears<b.reveal+b.ice)continue;int start=v&127,stage=v>>7;ulong other=occupied^b.poses[start].mask,seen=1UL<<start;int head=0,tail=1;heldQueue[0]=start;
   while(head<tail){int at=heldQueue[head++];Pose p=b.poses[at];if(at!=start)Visit(s.Set(i,at|(stage<<7)),1,collect);if(p.exits[stage]>=0&&clears>=p.exits[stage])Visit(s.Set(i,stage+1<b.layers?at|((stage+1)<<7):255),0,collect);
    foreach(int to in p.neighbors){ulong bit=1UL<<to;if((seen&bit)!=0||(b.poses[to].mask&other)!=0)continue;seen|=bit;heldQueue[tail++]=to;}
   }
  }
 }
 public object Run(){
  if(input.successorsOnly){var rows=new List<object>();foreach(int[] a in input.states){World s=From(a);var next=new HashSet<string>();Expand(s,next);rows.Add(new{state=s.Text(n),normalized=Normalize(s).Text(n),canonical=Key(Normalize(s)).Text(n),successors=next.OrderBy(x=>x).ToArray()});}return new{rows=rows};}
  long[] exploredByCost=new long[input.floor];clock.Start();World first=Key(Normalize(initial));indices.Add(first,0);states.Add(first);distances.Add(0);currentQueue.Add(0);string stopped=null;
  try{for(cost=0;cost<input.floor;cost++){for(int q=0;q<currentQueue.Count;q++){Guard();int i=currentQueue[q];if(distances[i]!=cost)continue;current=states[i];explored++;exploredByCost[cost]++;int clears=Clears(current);maxClears=Math.Max(maxClears,clears);if(clears==total){shortcut=cost;throw new BudgetStop("relaxed-shortcut");}Expand(current,null);}currentQueue.Clear();currentQueue.AddRange(nextQueue);nextQueue.Clear();}}
  catch(BudgetStop e){stopped=e.Message;}
  bool unknown=stopped=="deadline"||stopped=="max-states";return new{status=unknown?"unknown":shortcut.HasValue?"relaxed-shortcut":"threshold-proven",thresholdProven=!unknown&&!shortcut.HasValue,floor=input.floor,relaxedNonClearingDrags=shortcut,lastExpandedCost=Array.FindLastIndex(exploredByCost,x=>x>0),exploredByCost=exploredByCost,exploredStates=explored,discoveredStates=states.Count,attemptedTransitions=transitions,maxClearsSeen=maxClears,elapsedMilliseconds=clock.ElapsedMilliseconds,termination=stopped??"below-threshold-exhausted",abstraction="native-mask64-axis-countdown-optional-exit-identity-quotient-v172",pointerValidated=false,timeValidated=false};
 }
 public static int Main(string[] args){try{var json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue,RecursionLimit=256};Input p=json.Deserialize<Input>(File.ReadAllText(args[0]));File.WriteAllText(args[1],json.Serialize(new Solver(p).Run()));return 0;}catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}}
}
