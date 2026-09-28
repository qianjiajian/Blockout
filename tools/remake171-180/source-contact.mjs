import fs from 'node:fs';
import sharp from 'sharp';
const [name,a,b,c]=process.argv.slice(2),start=Number(a),end=Number(b),step=Number(c);
const dir='deliverables/remake171-180-20260927/source176-177';fs.mkdirSync(dir,{recursive:true});
const frames=[];for(let n=start;n<=end;n+=step)frames.push(n);
for(let offset=0;offset<frames.length;offset+=8){
 const items=[];
 for(const [j,n]of frames.slice(offset,offset+8).entries()){
  const im=await sharp(`.codex-temp/video-audit-170-200/${name}/frames-1fps/sec-${String(n).padStart(4,'0')}.jpg`).extract({left:0,top:175,width:448,height:630}).resize(336,473).toBuffer();
  const left=j%4*336,top=Math.floor(j/4)*500;
  items.push({input:im,left,top:top+27},{input:Buffer.from(`<svg width="336" height="27"><text x="8" y="20" font-size="18">${name} sec-${n}</text></svg>`),left,top});
 }
 const out=`${dir}/${name}-${start}-${end}-${step}-${offset/8}.jpg`;
 await sharp({create:{width:1344,height:1000,channels:3,background:'#eeeeee'}}).composite(items).jpeg({quality:95}).toFile(out);console.log(out);
}
