import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const out = 'public/assets/art/ui/profile-reference-v1';
await mkdir(out, {recursive:true});
await mkdir('art-source/ui/profile-reference-v1', {recursive:true});
await copyFile('.codex-temp/profile-reference/frame-24.png','art-source/ui/profile-reference-v1/edit-reference.png');
await copyFile('.codex-temp/profile-reference/frame-3.png','art-source/ui/profile-reference-v1/stats-reference.png');
const frameSource = 'C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-6a39a842-b63e-45c4-bc6c-358b610cc448.png';
await copyFile(frameSource, 'art-source/ui/profile-reference-v1/frame-reference.png');
const mask = (w,h,body) => Buffer.from(`<svg width="${w}" height="${h}">${body}</svg>`);
for(let i=0;i<15;i++) {
  const x=[82,139,196,253,310][i%5], y=[354,414,474][Math.floor(i/5)];
  await sharp('.codex-temp/profile-reference/frame-24.png').extract({left:x-25,top:y-25,width:50,height:50}).ensureAlpha()
    .composite([{input:mask(50,50,'<circle cx="25" cy="25" r="24" fill="white"/>'),blend:'dest-in'}]).png().toFile(`${out}/avatar-${i}.png`);
}
await sharp('.codex-temp/profile-reference/frame-9.png').extract({left:9,top:118,width:370,height:86}).ensureAlpha()
  .composite([{input:mask(370,86,'<path d="M0 29 Q10 18 38 25 L38 20 Q40 0 183 0 Q330 0 333 20 L333 25 Q356 17 370 29 L357 50 L369 81 Q344 69 326 83 L302 86 L67 86 L42 80 Q15 67 0 81 L12 51Z" fill="white"/>'),blend:'dest-in'}]).png().toFile(`${out}/header.png`);
for (const [i,x] of [66,171,278].entries()) await sharp('.codex-temp/profile-reference/frame-3.png')
  .extract({left:x,top:390,width:46,height:49}).png().toFile(`${out}/stat-${i}.png`);
for(let i=0;i<9;i++) {
  const x=[109,183,258,333,408][i%5], y=i<5?425:503;
  await sharp(frameSource).extract({left:x-32,top:y-32,width:64,height:64}).ensureAlpha()
    .composite([{input:mask(64,64,'<circle cx="32" cy="32" r="31" fill="white"/>'),blend:'dest-in'}]).png().toFile(`${out}/frame-${i}.png`);
}
await sharp(frameSource).extract({left:39,top:177,width:431,height:569})
  .composite([{input:mask(431,569,'<g fill="#b4532f"><rect x="16" y="44" width="402" height="86"/><rect x="18" y="139" width="397" height="50"/><rect x="16" y="200" width="400" height="262"/><rect x="125" y="472" width="181" height="72"/></g>')}]).png().toFile(`${out}/panel.png`);
await sharp(frameSource).extract({left:12,top:116,width:486,height:105}).ensureAlpha()
  .composite([{input:mask(486,105,'<path d="M0 40 Q13 23 50 33 L50 25 Q53 0 243 0 Q434 0 436 25 L436 33 Q465 23 486 40 L469 68 L484 105 Q452 91 429 105 L395 105 L88 105 L55 105 Q20 89 0 105 L16 68Z" fill="white"/>'),blend:'dest-in'}]).png().toFile(`${out}/header.png`);
await sharp(frameSource).extract({left:166,top:650,width:177,height:69}).png().toFile(`${out}/save.png`);
await sharp(frameSource).extract({left:397,top:242,width:44,height:44}).png().toFile(`${out}/edit.png`);
await sharp('.codex-temp/profile-reference/frame-15.png').extract({left:161,top:439,width:24,height:25}).ensureAlpha()
  .composite([{input:mask(24,25,'<circle cx="12" cy="12" r="11" fill="white"/>'),blend:'dest-in'}]).png().toFile(`${out}/coin.png`);
await writeFile('art-source/ui/profile-reference-v1/provenance.json',JSON.stringify({source:'C:/Users/Administrator/Downloads/QQ20261008-200604.mp4',frameSource,frames:[3,9,24],method:'User-provided video/screenshot artwork crops with alpha circle/silhouette masks; dynamic text rendered by game. No ImageGen.',frameCount:9},null,2));
