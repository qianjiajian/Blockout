import sharp from "sharp";
import { mkdir,copyFile,writeFile,readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const source=resolve("art-source/ui/league-video-v1"),runtime=resolve("public/assets/art/ui/league-video-v1");
await mkdir(source,{recursive:true});await mkdir(runtime,{recursive:true});
// Rebuild deterministic slices from the original ImageGen outputs archived
// inside this project; no dependency on a user's generated-images directory.
await sharp(resolve(source,"background-source.png")).resize(992,2156).png().toFile(resolve(runtime,"background.png"));
await copyFile(resolve(runtime,"background.png"),resolve(source,"background.png"));
const entries=[];
async function atlas(file,names,rects){
  const m=await sharp(resolve(source,file)).metadata();
  if(!m.hasAlpha)throw Error("Atlas must have alpha");
  for(let i=0;i<8;i++){
    const fallback={left:Math.floor(i%4*m.width/4),top:Math.floor(Math.floor(i/4)*m.height/2),width:Math.floor((i%4+1)*m.width/4)-Math.floor(i%4*m.width/4),height:Math.floor((Math.floor(i/4)+1)*m.height/2)-Math.floor(Math.floor(i/4)*m.height/2)};
    const {left,top,width,height}=rects?.[i]??fallback;
    const name=names[i]+".png";
    const cell=await sharp(resolve(source,file)).extract({left,top,width,height}).png().toBuffer();
    const pixels=await sharp(cell).trim().png().toBuffer();
    await writeFile(resolve(source,name),pixels);await writeFile(resolve(runtime,name),pixels);
    const metadata=await sharp(pixels).metadata();
    entries.push({name,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,sha256:createHash("sha256").update(pixels).digest("hex"),crop:{left,top,width,height},atlas:file});
  }
}
await atlas("trophies-source.png",["bronze","silver","gold","platinum","emerald","diamond","master","glory"]);
// ImageGen's atlas uses unequal column widths. Crop actual separated objects,
// rather than assuming a mathematically uniform grid that cuts through them.
await atlas("chrome-source.png",["row","round-button","score-token","continue-button","self-row","parchment","coin-reward","glory-star"],[
  {left:0,top:80,width:585,height:330},{left:590,top:70,width:345,height:360},
  {left:950,top:90,width:280,height:320},{left:1240,top:90,width:534,height:320},
  {left:0,top:440,width:585,height:370},{left:590,top:440,width:335,height:400},
  {left:935,top:450,width:400,height:365},{left:1370,top:450,width:370,height:365},
]);
entries.push({name:"background.png",width:992,height:2156,hasAlpha:false,sha256:createHash("sha256").update(await readFile(resolve(runtime,"background.png"))).digest("hex"),atlas:"background-source.png"});
await writeFile(resolve(source,"manifest.json"),JSON.stringify({generator:"built-in image_gen",purpose:"User-authorized video league UI",runtimeBase:"/assets/art/ui/league-video-v1/",entries},null,2));
console.log(JSON.stringify({source,runtime,entries:entries.length}));
