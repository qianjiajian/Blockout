from pathlib import Path
s=Path('src/core/revisedRepositionFloor.ts').read_text()
print('start',s.find('export interface SeamChamberCompositionOptions'),'end',s.find('/**\n * A proof for a level made of physically disconnected'))
