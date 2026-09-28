import fs from 'node:fs';
import crypto from 'node:crypto';
const root='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent55-57';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const video='C:/Users/Administrator/Desktop/block out/参考视频/51-60.mp4';
const report={
  ruleVersion:'1.47.0',
  scope:'source-media-binding-only; candidate verification remains separately bound',
  sourceVideo:{file:video,bytes:fs.statSync(video).size,sha256:hash(video)},
  extraction:{tool:'C:/Users/Administrator/AppData/Local/Temp/codex-video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe',command:'ffmpeg -v error -ss <seconds> -i <video> -frames:v 1 <output>'},
  independentlyViewedOpeningFrames:[
    {level:55,seconds:259,file:`${root}/raw-source-55-at-259s.png`,observation:'Lv55 initial 03:00 board, four ice5, curtain8, no removal.'},
    {level:56,seconds:330,file:`${root}/raw-source-56-at-330s.png`,observation:'Lv56 full 6×8 opening, 18 bodies, ice7/5, three axis bodies, one generator queue3; no H2 opening or visible shell.'},
    {level:57,seconds:438,file:`${root}/raw-source-57-at-438s.png`,observation:'Lv57 initial 01:40 board, covers6/12, cyanH2 ice3, generator queue3; no removal.'},
  ].map(row=>({...row,sha256:hash(row.file),review:`${root}/source-review${row.level}.json`,reviewSha256:hash(`${root}/source-review${row.level}.json`)})),
  excludedNonOpeningFrames:[{level:55,seconds:258,reason:'Home screen immediately before level55 load.'},{level:57,seconds:437,reason:'Home screen immediately before level57 load.'}],
  shell56IndependentReview:{reviewer:'root',frames:[331,349,415,420,422,424,426],conclusion:'18 opening bodies have no H2 carrier/shell border; queue purpleH3→greenL3→yellowH2 and ice carrier greenV2=7/pinksideT4=5 confirmed. Combined temporal inventory supports source shell0; retain original truth and record correction.'},
};
const file=`${root}/source-media-binding-${Date.now()}.json`;
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,videoSha256:report.sourceVideo.sha256}));
