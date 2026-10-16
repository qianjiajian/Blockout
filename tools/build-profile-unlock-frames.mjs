import sharp from 'sharp';import{mkdir,writeFile}from'node:fs/promises';
const dir='public/assets/art/ui/profile-unlocks-v1';await mkdir(dir,{recursive:true});
const palettes=[['#bd762e','#ffe493'],['#329747','#a4ff92'],['#148ebf','#a3faff'],['#9553ce','#f0b4ff'],['#ee8d17','#fff78b'],['#e95078','#ffbdde'],['#bcebf1','#ffffff'],['#ca3626','#ffb83c'],['#387bcc','#bda6ff'],['#c89820','#fff6b5']];
const star=(cx,cy,r,color)=>{let pts=[];for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,d=j%2?r*.45:r;pts.push(`${cx+Math.cos(a)*d},${cy+Math.sin(a)*d}`);}return `<polygon points="${pts.join(' ')}" fill="${color}" stroke="#714e27" stroke-width=".6"/>`;};
for(let i=0;i<10;i++){
 const[a,b]=palettes[i];let decorations='';
 for(let j=0;j<4+i%3;j++){const angle=-Math.PI/2+j*2*Math.PI/(4+i%3);decorations+=star(48+40*Math.cos(angle),48+40*Math.sin(angle),i===9?7:5,b);}
 const crown=i>=8?`<path d="M30 14 L28 3 L39 8 L48 0 L57 8 L68 3 L66 14Z" fill="${b}" stroke="${a}" stroke-width="2"/>`:'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><defs><linearGradient id="g" x2=".8" y2="1"><stop stop-color="${b}"/><stop offset=".45" stop-color="${a}"/><stop offset=".7" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs><circle cx="48" cy="49" r="42" fill="#493022"/><circle cx="48" cy="47" r="40" fill="#173c40" stroke="url(#g)" stroke-width="8"/><circle cx="48" cy="47" r="34" fill="none" stroke="${b}" stroke-width="1.5"/>${decorations}${crown}</svg>`;
 await writeFile(`art-source/ui/profile-unlocks-v1/frame-${9+i}.svg`,svg).catch(async()=>{await mkdir('art-source/ui/profile-unlocks-v1',{recursive:true});await writeFile(`art-source/ui/profile-unlocks-v1/frame-${9+i}.svg`,svg);});
 await sharp(Buffer.from(svg)).resize(64,64).png().toFile(`${dir}/frame-${9+i}.png`);
}
console.log('10 ornamented circular frames generated from editable SVG sources.');
