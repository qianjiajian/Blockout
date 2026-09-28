from pathlib import Path
from PIL import Image, ImageDraw
import sys
name, start, end, step = sys.argv[1], *map(int, sys.argv[2:5])
root=Path('.codex-temp/video-audit-170-200')/name/'frames-1fps'
frames=list(range(start,end+1,step))
out=Path('deliverables/remake171-180-20260927/source176-177')
out.mkdir(parents=True,exist_ok=True)
for offset in range(0,len(frames),12):
    batch=frames[offset:offset+12]
    sheet=Image.new('RGB',(4*336,3*474),(230,230,230));draw=ImageDraw.Draw(sheet)
    for j,n in enumerate(batch):
        im=Image.open(root/f'sec-{n:04}.jpg').crop((0,175,448,805)).resize((336,450))
        x,y=(j%4)*336,(j//4)*474
        sheet.paste(im,(x,y+24));draw.text((x+8,y+6),f'{name} sec-{n:04}',fill='black')
    target=out/f'{name}-{start}-{end}-{step}-{offset//12}.jpg'
    sheet.save(target,quality=92);print(target)
