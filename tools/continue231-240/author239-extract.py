import cv2, os, json
video = 'C:/Users/Administrator/Desktop/block out/参考视频/231-240.mp4'
out = 'deliverables/continue231-240-20261019/author239/source'
os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(video)
times = list(range(905, 923)) + [836, 837, 838, 839, 888, 888.5]
rows=[]
for sec in times:
    name=f'frame-{sec}.png'
    file=os.path.join(out,name)
    if os.path.exists(file): raise RuntimeError('Refuse source overwrite '+file)
    cap.set(cv2.CAP_PROP_POS_MSEC,sec*1000)
    ok,frame=cap.read()
    if not ok: raise RuntimeError(sec)
    h,w=frame.shape[:2]
    frame=frame[:,(w-810)//2:(w+810)//2]
    cv2.imwrite(file,frame)
    rows.append({'seconds':sec,'file':file})
cap.release()
with open(out+'/metadata.json','x',encoding='utf8') as f: json.dump({'video':video,'frames':rows},f,ensure_ascii=False,indent=2)
print(json.dumps({'out':out,'frames':len(rows)}))
