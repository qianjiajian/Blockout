// WITNESS DISCOVERY ONLY: relaxed queue-free prefix, never a lower-bound certificate. Real FIFO replay required.
// Exact integer implementation of the mask-floor optional-contact graph.
// Same final-body normalization and identity quotient as v139; no shell peel forced.
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using System.Web.Script.Serialization;
public struct World:IEquatable<World>{
 public ulong F0,F1,F2,F3,F4,F5,F6,F7,F8,F9,F10,F11,F12,F13,F14,F15;
 public int Get(int i){ulong v;switch(i>>2){case 0:v=F0;break;case 1:v=F1;break;case 2:v=F2;break;case 3:v=F3;break;case 4:v=F4;break;case 5:v=F5;break;case 6:v=F6;break;case 7:v=F7;break;case 8:v=F8;break;case 9:v=F9;break;case 10:v=F10;break;case 11:v=F11;break;case 12:v=F12;break;case 13:v=F13;break;case 14:v=F14;break;case 15:v=F15;break;default:throw new Exception("index");}return(int)((v>>((i&3)*16))&65535);}
 public World Set(int i,int v){World s=this;int shift=(i&3)*16;ulong mask=65535UL<<shift,b=(ulong)v<<shift;switch(i>>2){case 0:s.F0=(F0&~mask)|b;break;case 1:s.F1=(F1&~mask)|b;break;case 2:s.F2=(F2&~mask)|b;break;case 3:s.F3=(F3&~mask)|b;break;case 4:s.F4=(F4&~mask)|b;break;case 5:s.F5=(F5&~mask)|b;break;case 6:s.F6=(F6&~mask)|b;break;case 7:s.F7=(F7&~mask)|b;break;case 8:s.F8=(F8&~mask)|b;break;case 9:s.F9=(F9&~mask)|b;break;case 10:s.F10=(F10&~mask)|b;break;case 11:s.F11=(F11&~mask)|b;break;case 12:s.F12=(F12&~mask)|b;break;case 13:s.F13=(F13&~mask)|b;break;case 14:s.F14=(F14&~mask)|b;break;case 15:s.F15=(F15&~mask)|b;break;default:throw new Exception("index");}return s;}
 public bool Equals(World x){return F0==x.F0&&F1==x.F1&&F2==x.F2&&F3==x.F3&&F4==x.F4&&F5==x.F5&&F6==x.F6&&F7==x.F7&&F8==x.F8&&F9==x.F9&&F10==x.F10&&F11==x.F11&&F12==x.F12&&F13==x.F13&&F14==x.F14&&F15==x.F15;}
 public override bool Equals(object x){return x is World&&Equals((World)x);}
 public override int GetHashCode(){unchecked{ulong h=0x9e3779b185ebca87UL;h=(h^F0)*0xc2b2ae3d27d4eb4fUL;h=(h^F1)*0xc2b2ae3d27d4eb4fUL;h=(h^F2)*0xc2b2ae3d27d4eb4fUL;h=(h^F3)*0xc2b2ae3d27d4eb4fUL;h=(h^F4)*0xc2b2ae3d27d4eb4fUL;h=(h^F5)*0xc2b2ae3d27d4eb4fUL;h=(h^F6)*0xc2b2ae3d27d4eb4fUL;h=(h^F7)*0xc2b2ae3d27d4eb4fUL;h=(h^F8)*0xc2b2ae3d27d4eb4fUL;h=(h^F9)*0xc2b2ae3d27d4eb4fUL;h=(h^F10)*0xc2b2ae3d27d4eb4fUL;h=(h^F11)*0xc2b2ae3d27d4eb4fUL;h=(h^F12)*0xc2b2ae3d27d4eb4fUL;h=(h^F13)*0xc2b2ae3d27d4eb4fUL;h=(h^F14)*0xc2b2ae3d27d4eb4fUL;h=(h^F15)*0xc2b2ae3d27d4eb4fUL;return(int)(h^(h>>32));}}
 public string Text(int n){byte[] a=new byte[n*2];for(int i=0;i<n;i++){int v=Get(i);a[i*2]=(byte)v;a[i*2+1]=(byte)(v>>8);}return Convert.ToBase64String(a);}
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
public class BodyInput{public int layers,ice,reveal;public PoseInput[] poses;}
public class CoverInput{public int count;public long[] mask;}
public class Step{public int body,at;public bool clear;}
public class WitnessNode{public World state;public int cost,parent,clears,h;public Step[] actions;}
public class Input{public int target,weight;public int[] extraTargets;public int[][][][] extraSeparated;public bool travelDown;public int[][] leftRows,rightRows;public int[][][] separated;public int width,height,floor,maxStates,maxMilliseconds,goalClears;public int[] initial;public int[][] groups,states;public BodyInput[] blocks;public CoverInput[] covers;public bool successorsOnly;}
public class Pose{public Mask128 mask;public int[] exits,neighbors;}
public class Body{public int layers,ice,reveal;public Pose[] poses;}
public class Cover{public int count;public Mask128 mask;}
public class BudgetStop:Exception{public BudgetStop(string s):base(s){}}
public class Solver{
 readonly List<WitnessNode> witnessNodes=new List<WitnessNode>();readonly List<int> heap=new List<int>();readonly Dictionary<World,int> bestCost=new Dictionary<World,int>();Mask128[][] separated;Mask128[][][] extras;Step pending;int currentIndex,bestIndex;
 readonly Input input;readonly Body[] bodies;readonly Cover[] covers;readonly int n,total;
 readonly int[] heldQueue=new int[128],normQueue=new int[128],sortValues=new int[64];
 readonly Stopwatch clock=new Stopwatch();readonly List<int> currentQueue=new List<int>(),nextQueue=new List<int>();
 readonly Dictionary<World,int> indices=new Dictionary<World,int>();readonly List<World> states=new List<World>();readonly List<byte> distances=new List<byte>();
 long explored,transitions;int cost,maxClears;World initial,current;int? shortcut;
 static Mask128 Mask(long[] a){return Mask128.From(a);}
 World From(int[] a){if(a.Length!=n)throw new Exception("state length");World s=new World();for(int i=0;i<n;i++){int v=a[i];if(v<0||v>511||(v!=511&&((v>>7)>=bodies[i].layers||(v&127)>=input.width*input.height||bodies[i].poses[v&127]==null)))throw new Exception("invalid state");s=s.Set(i,v);}return s;}
 public Solver(Input p){input=p;n=p.blocks.Length;if(n<1||n>64||p.width*p.height>128)throw new Exception("dimensions");if(p.goalClears<1)throw new Exception("prefix goal");if(p.floor<1||p.floor>254||p.maxStates<1||p.maxMilliseconds<1)throw new Exception("budget");
  bodies=p.blocks.Select(b=>new Body{layers=b.layers,ice=b.ice,reveal=b.reveal,poses=b.poses.Select(x=>x==null?null:new Pose{mask=Mask(x.mask),exits=x.exits,neighbors=x.neighbors}).ToArray()}).ToArray();
  if(bodies.Any(b=>b.layers<1||b.layers>2||b.ice<0||b.reveal<0))throw new Exception("body domain");
  separated=p.separated.Select(a=>a==null?null:a.Select(b=>{Mask128 m=new Mask128();foreach(int k in b)m=m|Mask128.Bit(k);return m;}).ToArray()).ToArray();
  extras=p.extraSeparated.Select(table=>table.Select(a=>a==null?null:a.Select(b=>{Mask128 m=new Mask128();foreach(int k in b)m=m|Mask128.Bit(k);return m;}).ToArray()).ToArray()).ToArray();
  covers=p.covers.Select(c=>new Cover{count=c.count,mask=Mask(c.mask)}).ToArray();total=bodies.Sum(b=>b.layers);initial=From(p.initial);
 }
 int Clears(World s){int c=0;for(int i=0;i<n;i++){int v=s.Get(i);c+=v==511?bodies[i].layers:v>>7;}return c;}
 Mask128 Occupied(World s,int c){Mask128 mask=new Mask128();foreach(Cover cover in covers)if(c<cover.count)mask|=cover.mask;for(int i=0;i<n;i++){int v=s.Get(i);if(v!=511&&c>=bodies[i].reveal)mask|=bodies[i].poses[v&127].mask;}return mask;}
 World Key(World s){foreach(int[] g in input.groups){for(int j=0;j<g.Length;j++)sortValues[j]=s.Get(g[j]);Array.Sort(sortValues,0,g.Length);for(int j=0;j<g.Length;j++)s=s.Set(g[j],sortValues[j]);}return s;}
 World Normalize(World s,List<Step> steps=null){for(;;){int clears=Clears(s);if(clears>=input.goalClears)return s;Mask128 occupied=Occupied(s,clears);bool found=false;
  for(int i=0;i<n&&!found;i++){Body b=bodies[i];int v=s.Get(i);if(v==511||v>>7!=b.layers-1||clears<b.reveal+b.ice)continue;int start=v&127,stage=v>>7;Mask128 other=occupied^b.poses[start].mask,seen=Mask128.Bit(start);int head=0,tail=1;normQueue[0]=start;
   while(head<tail){int at=normQueue[head++];Pose p=b.poses[at];if(p.exits[stage]>=0&&clears>=p.exits[stage]){if(steps!=null)steps.Add(new Step{body=i,at=at,clear=true});s=s.Set(i,511);found=true;break;}foreach(int to in p.neighbors){Mask128 bit=Mask128.Bit(to);if(seen.Overlap(bit)||b.poses[to].mask.Overlap(other))continue;seen|=bit;normQueue[tail++]=to;}}
  }if(!found)return s;
 }}
 void Guard(){if(clock.ElapsedMilliseconds>=input.maxMilliseconds)throw new BudgetStop("deadline");}
 bool Augment(int left,List<int>[] adj,int[] matches,bool[] seen){foreach(int right in adj[left]){if(seen[right])continue;seen[right]=true;if(matches[right]<0||Augment(matches[right],adj,matches,seen)){matches[right]=left;return true;}}return false;}
 int Hint(World s){
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
 }
 int Score(int i){WitnessNode a=witnessNodes[i];return -(a.cost+a.h)*100+a.clears*input.weight-a.cost;}
 void Push(int i){heap.Add(i);int at=heap.Count-1;while(at>0){int p=(at-1)>>1;if(Score(heap[p])>=Score(heap[at]))break;int t=heap[p];heap[p]=heap[at];heap[at]=t;at=p;}}
 int Pop(){int ret=heap[0],last=heap[heap.Count-1];heap.RemoveAt(heap.Count-1);if(heap.Count>0){heap[0]=last;int at=0;while(at*2+1<heap.Count){int k=at*2+1;if(k+1<heap.Count&&Score(heap[k+1])>Score(heap[k]))k++;if(Score(heap[at])>=Score(heap[k]))break;int t=heap[at];heap[at]=heap[k];heap[k]=t;at=k;}}return ret;}
 void Visit(World s,int edge,HashSet<string> collect){transitions++;if((transitions&255)==0)Guard();int nextCost=cost+edge;if(nextCost>=input.floor)return;var acts=new List<Step>();acts.Add(pending);World normalized=Normalize(s,acts);int h=Hint(normalized);if(nextCost+h>=input.floor)return;int old;if(bestCost.TryGetValue(Key(normalized),out old)&&old<=nextCost)return;if(witnessNodes.Count>=input.maxStates)throw new BudgetStop("max-states");bestCost[Key(normalized)]=nextCost;witnessNodes.Add(new WitnessNode{state=normalized,cost=nextCost,parent=currentIndex,clears=Clears(normalized),h=h,actions=acts.ToArray()});Push(witnessNodes.Count-1);}
 void Expand(World s,HashSet<string> collect){int clears=Clears(s);if(clears>=input.goalClears)return;Mask128 occupied=Occupied(s,clears);
  for(int i=0;i<n;i++){Body b=bodies[i];int v=s.Get(i);if(v==511||clears<b.reveal+b.ice)continue;int start=v&127,stage=v>>7;Mask128 other=occupied^b.poses[start].mask,seen=Mask128.Bit(start);int head=0,tail=1;heldQueue[0]=start;
   while(head<tail){int at=heldQueue[head++];Pose p=b.poses[at];if(at!=start){pending=new Step{body=i,at=at,clear=false};Visit(s.Set(i,at|(stage<<7)),1,collect);}if(p.exits[stage]>=0&&clears>=p.exits[stage]){pending=new Step{body=i,at=at,clear=true};Visit(s.Set(i,stage+1<b.layers?at|((stage+1)<<7):511),0,collect);}
    foreach(int to in p.neighbors){Mask128 bit=Mask128.Bit(to);if(seen.Overlap(bit)||b.poses[to].mask.Overlap(other))continue;seen|=bit;heldQueue[tail++]=to;}
   }
  }
 }
 public object Run(){clock.Start();var firstActs=new List<Step>();World first=Normalize(initial,firstActs);witnessNodes.Add(new WitnessNode{state=first,cost=0,parent=-1,clears=Clears(first),h=Hint(first),actions=firstActs.ToArray()});bestCost[Key(first)]=0;Push(0);string stopped=null;bool won=false;
 try{while(heap.Count>0){Guard();currentIndex=Pop();WitnessNode a=witnessNodes[currentIndex];if(bestCost[Key(a.state)]<a.cost)continue;cost=a.cost;current=a.state;explored++;if(a.clears>witnessNodes[bestIndex].clears||(a.clears==witnessNodes[bestIndex].clears&&a.cost+a.h<witnessNodes[bestIndex].cost+witnessNodes[bestIndex].h))bestIndex=currentIndex;maxClears=Math.Max(maxClears,a.clears);if(a.clears>=input.goalClears){bestIndex=currentIndex;won=true;break;}Expand(a.state,null);}}
 catch(BudgetStop e){stopped=e.Message;}
 var route=new List<Step[]>();int ni=bestIndex;while(ni>=0){route.Add(witnessNodes[ni].actions);ni=witnessNodes[ni].parent;}route.Reverse();return new{status=won?"relaxed-prefix-witness":stopped==null?"exhausted":"unknown",cost=witnessNodes[bestIndex].cost,h=witnessNodes[bestIndex].h,steps=route.SelectMany(x=>x).ToArray(),exploredStates=explored,discoveredStates=witnessNodes.Count,attemptedTransitions=transitions,maxClearsSeen=maxClears,elapsedMilliseconds=clock.ElapsedMilliseconds,termination=stopped,thresholdProven=false,witnessOnly=true};
 }
 public static int Main(string[] args){try{var json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue,RecursionLimit=256};Input p=json.Deserialize<Input>(File.ReadAllText(args[0]));File.WriteAllText(args[1],json.Serialize(new Solver(p).Run()));return 0;}catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}}
}
