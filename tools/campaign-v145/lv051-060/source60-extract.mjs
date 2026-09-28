import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/source60-review';fs.mkdirSync(dir,{recursive:true});
const ffmpeg='C:/Users/Administrator/AppData/Local/Temp/codex-video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe',video='C:/Users/Administrator/Desktop/block out/参考视频/51-60.mp4';
for(const seconds of [693,693.5,694]){const file=`${dir}/raw-source60-${seconds}s.png`;if(fs.existsSync(file))continue;const r=spawnSync(ffmpeg,['-v','error','-ss',String(seconds),'-i',video,'-frames:v','1',file],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);console.log(file);}
