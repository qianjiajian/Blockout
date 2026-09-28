import fs from'node:fs';
const source='tools/remake191-200/author194-196/native-keys.cs',out='tools/remake191-200/author194-196/native-keys32.cs';let t=fs.readFileSync(source,'utf8'),a=t.indexOf('public struct World:'),b=t.indexOf('public struct Mask128');
const world=`public struct World:IEquatable<World>{
 public ulong F0,F1,F2,F3;
 public int Get(int i){ulong v;switch(i>>3){case 0:v=F0;break;case 1:v=F1;break;case 2:v=F2;break;case 3:v=F3;break;default:throw new Exception("index");}return(int)((v>>((i&7)*8))&255);}
 public World Set(int i,int v){World s=this;int shift=(i&7)*8;ulong mask=255UL<<shift,b=(ulong)v<<shift;switch(i>>3){case 0:s.F0=(F0&~mask)|b;break;case 1:s.F1=(F1&~mask)|b;break;case 2:s.F2=(F2&~mask)|b;break;case 3:s.F3=(F3&~mask)|b;break;default:throw new Exception("index");}return s;}
 public bool Equals(World x){return F0==x.F0&&F1==x.F1&&F2==x.F2&&F3==x.F3;}
 public override bool Equals(object x){return x is World&&Equals((World)x);}
 public override int GetHashCode(){unchecked{ulong h=0x9e3779b185ebca87UL;h=(h^F0)*0xc2b2ae3d27d4eb4fUL;h=(h^F1)*0xc2b2ae3d27d4eb4fUL;h=(h^F2)*0xc2b2ae3d27d4eb4fUL;h=(h^F3)*0xc2b2ae3d27d4eb4fUL;return(int)(h^(h>>32));}}
 public string Text(int n){byte[] a=new byte[n*2];for(int i=0;i<n;i++){int v=Get(i);if(v==255)v=511;a[i*2]=(byte)v;a[i*2+1]=(byte)(v>>8);}return Convert.ToBase64String(a);}
}
`;
t=t.slice(0,a)+world+t.slice(b).replaceAll('511','255').replace('int v=a[i];','int v=a[i]==511?255:a[i];').replace('n>64||p.width*p.height>128','n>32||p.width*p.height>96');
fs.writeFileSync(out,t,{flag:'wx'});console.log(out);
