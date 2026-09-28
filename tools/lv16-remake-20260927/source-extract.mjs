import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root='deliverables/lv16-remake-20260927';fs.mkdirSync(root,{recursive:true});
const ffmpeg='.codex-temp/video-py/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe',video='C:/Users/Administrator/Desktop/block out/参考视频/11-20.mp4';
const seconds=process.argv.slice(2).map(Number);
if(seconds.length){for(const second of seconds){if(!Number.isFinite(second)||second<238||second>278)throw new Error('Only Lv16 interval238–278 is permitted');execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-ss',String(second),'-i',video,'-frames:v','1','-n',path.join(root,'source-video-'+second+'.png')],{windowsHide:true,stdio:'pipe'});}}
else execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-ss','238','-i',video,'-t','40','-vf','fps=1/2,scale=240:-1,tile=5x4','-frames:v','1','-n',path.join(root,'source-video-238-278-contact.png')],{windowsHide:true,stdio:'pipe'});
console.log(JSON.stringify({root,video,seconds}));
