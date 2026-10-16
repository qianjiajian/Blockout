from pathlib import Path
p=Path('src/core/revisedRepositionFloor.ts')
s=p.read_text()
start=s.index('export interface SeamChamberCompositionOptions')
end=s.index('/**\n * A proof for a level made of physically disconnected',start)
s=s[:start]+s[end:]
p.write_text(s)
