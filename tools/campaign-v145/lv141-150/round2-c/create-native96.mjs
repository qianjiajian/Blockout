import fs from 'node:fs';
const DIR='tools/campaign-v145/lv141-150/round2-c',OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/native96';
let cs=fs.readFileSync('tools/campaign-v145/lv131-140/root-native/native-axis-pruned.cs','utf8');
const struct=`public struct M96 {
 public ulong low;public uint high;
 public M96(ulong a,uint b){low=a;high=b;}
 public static M96 Bit(int i){return i<64?new M96(1UL<<i,0):new M96(0,1U<<(i-64));}
 public static M96 operator |(M96 a,M96 b){return new M96(a.low|b.low,a.high|b.high);}
 public static M96 operator ^(M96 a,M96 b){return new M96(a.low^b.low,a.high^b.high);}
 public static M96 operator &(M96 a,M96 b){return new M96(a.low&b.low,a.high&b.high);}
 public static bool operator !=(M96 a,int b){if(b!=0)throw new Exception("zero comparison only");return a.low!=0||a.high!=0;}
 public static bool operator ==(M96 a,int b){return !(a!=b);}
 public override bool Equals(object obj){return obj is M96&&low==((M96)obj).low&&high==((M96)obj).high;}
 public override int GetHashCode(){return low.GetHashCode()^(int)high;}
}
`;
cs=cs.replace('public class Pose{',struct+'public class Pose{').replaceAll('public ulong mask','public M96 mask').replaceAll('new int[64]','new int[96]').replaceAll('input.width*input.height>64','input.width*input.height>96').replaceAll('p.width*p.height>64','p.width*p.height>96');
cs=cs.replace(/static ulong Mask\(long\[\] a\)\{[^\n]*\}/,'static M96 Mask(long[] a){if(a.Length!=3)throw new Exception("requires mask96");return new M96((ulong)(uint)a[0]|((ulong)(uint)a[1]<<32),(uint)a[2]);}');
cs=cs.replaceAll('ulong Occupied','M96 Occupied').replaceAll('ulong mask=0','M96 mask=default(M96)').replaceAll('ulong occupied','M96 occupied').replaceAll('ulong other','M96 other').replaceAll('seen=1UL<<start','seen=M96.Bit(start)').replaceAll('ulong bit=1UL<<to','M96 bit=M96.Bit(to)').replaceAll('native-mask64-axis-countdown-optional-exit-identity-quotient-v172','native-mask96-axis-countdown-optional-exit-identity-quotient-v173');
fs.writeFileSync(DIR+'/native96.cs',cs);
let wrapper=fs.readFileSync('tools/campaign-v145/lv131-140/root-native/native-axis-pruned.mjs','utf8').replaceAll('tools/campaign-v145/lv131-140/root-native/native-axis-pruned.cs',DIR+'/native96.cs').replaceAll('tools/campaign-v145/lv131-140/root-native/native-axis-pruned.mjs',DIR+'/native96.mjs').replaceAll('deliverables/remake131-140-v146-20260924/root-native',OUT).replaceAll('c.W*c.H<=64','c.W*c.H<=96').replaceAll('restricted to64','restricted to96').replaceAll('below64','below96');
fs.writeFileSync(DIR+'/native96.mjs',wrapper);
let qual=fs.readFileSync('tools/campaign-v145/lv131-140/root-native/qualify-native-pruned.mjs','utf8').replaceAll("'./native-axis-pruned.mjs'","'./native96.mjs'").replace('lower.width=5','lower.width=8').replaceAll('[2+i%3,9+','[5+i%3,9+').replaceAll('b.x+=2','b.x+=5').replaceAll('shutters[0].x+=2','shutters[0].x+=5').replaceAll('gates[0].offset=2','gates[0].offset=5').replaceAll('large.width=9;large.height=9','large.width=10;large.height=10').replaceAll('≤64cells','≤96cells');
fs.writeFileSync(DIR+'/qualify-native96.mjs',qual);
