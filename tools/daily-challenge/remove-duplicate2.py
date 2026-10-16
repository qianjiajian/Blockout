from pathlib import Path
p=Path('src/core/revisedRepositionFloor.ts')
s=p.read_text()
start=s.find('export interface SeamChamberCompositionOptions')
end=s.find('/**\n * A proof for a level made of physically disconnected',start)
print(start,end)
if start >= 0 and end > start:
    p.write_text(s[:start]+s[end:])
