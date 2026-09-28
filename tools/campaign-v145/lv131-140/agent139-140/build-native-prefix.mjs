import fs from 'node:fs';import assert from 'node:assert/strict';
const out='tools/campaign-v145/lv131-140/agent139-140/native-prefix.cs';
let s=fs.readFileSync('tools/campaign-v145/lv121-130/round3-c/assist126/native-floor.cs','utf8');
const replace=(a,b)=>{assert(s.includes(a),a);s=s.replace(a,b);};
const fields=Array.from({length:16},(_,i)=>'F'+i);
const world=`public struct World:IEquatable<World>{
 public ulong ${fields.join(',')};
 public int Get(int i){ulong v;switch(i>>2){${fields.map((f,i)=>`case ${i}:v=${f};break;`).join('')}default:throw new Exception("index");}return(int)((v>>((i&3)*16))&65535);}
 public World Set(int i,int v){World s=this;int shift=(i&3)*16;ulong mask=65535UL<<shift,b=(ulong)v<<shift;switch(i>>2){${fields.map((f,i)=>`case ${i}:s.${f}=(${f}&~mask)|b;break;`).join('')}default:throw new Exception("index");}return s;}
 public bool Equals(World x){return ${fields.map(f=>f+'==x.'+f).join('&&')};}
 public override bool Equals(object x){return x is World&&Equals((World)x);}
 public override int GetHashCode(){unchecked{ulong h=0x9e3779b185ebca87UL;${fields.map(f=>`h=(h^${f})*0xc2b2ae3d27d4eb4fUL;`).join('')}return(int)(h^(h>>32));}}
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
`;
s=s.slice(0,s.indexOf('public struct World'))+world+s.slice(s.indexOf('public class PoseInput'));
s=s.replace('public int width,height,floor,maxStates,maxMilliseconds;','public int width,height,floor,maxStates,maxMilliseconds,goalClears;');
s=s.replaceAll('public ulong mask;','public Mask128 mask;');
s=s.replace('new int[64],normQueue=new int[64],sortValues=new int[32]','new int[128],normQueue=new int[128],sortValues=new int[64]');
replace('static ulong Mask(long[] a){if(a.Length!=3||a[2]!=0)throw new Exception("requires mask64");return(ulong)(uint)a[0]|((ulong)(uint)a[1]<<32);}','static Mask128 Mask(long[] a){return Mask128.From(a);}');
s=s.replaceAll('v>255','v>511').replaceAll('v!=255','v!=511').replaceAll('v==255','v==511').replaceAll('Set(i,255)','Set(i,511)').replaceAll(':255)',':511)');
s=s.replace('n>32||p.width*p.height>64','n>64||p.width*p.height>128');
s=s.replace('ulong Occupied(World s,int c){ulong mask=0;','Mask128 Occupied(World s,int c){Mask128 mask=new Mask128();');
s=s.replaceAll('ulong occupied=Occupied(s,clears)','Mask128 occupied=Occupied(s,clears)').replaceAll('ulong other=occupied^b.poses[start].mask,seen=1UL<<start','Mask128 other=occupied^b.poses[start].mask,seen=Mask128.Bit(start)').replaceAll('ulong bit=1UL<<to;if((seen&bit)!=0||(b.poses[to].mask&other)!=0)','Mask128 bit=Mask128.Bit(to);if(seen.Overlap(bit)||b.poses[to].mask.Overlap(other))');
replace('for(;;){int clears=Clears(s);','for(;;){int clears=Clears(s);if(clears>=input.goalClears)return s;');
replace('void Expand(World s,HashSet<string> collect){int clears=Clears(s);','void Expand(World s,HashSet<string> collect){int clears=Clears(s);if(clears>=input.goalClears)return;');
s=s.replace('if(clears==total)','if(clears>=input.goalClears)');
replace('if(p.floor<1','if(p.goalClears<1)throw new Exception("prefix goal");if(p.floor<1');
s=s.replace('native-mask64-countdown-optional-exit-identity-quotient-monotone-clears-126-v172','native-mask128-fixed-cover-prefix-identity-quotient-stop-at-goal-v172');
assert(!s.includes('ulong occupied'));assert(!s.includes('v==255'));fs.writeFileSync(out,s);
