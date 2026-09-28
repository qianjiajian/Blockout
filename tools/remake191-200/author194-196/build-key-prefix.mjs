import fs from'node:fs';let s=fs.readFileSync('tools/remake191-200/author194-196/native-keys32.cs','utf8');
s=s.replace('public int[] initial;','public int[] initial,goalKeyIndices;');s=s.replace(' int Clears(World s)', ' bool Goal(World s){return input.goalKeyIndices!=null&&input.goalKeyIndices.Length>0?input.goalKeyIndices.All(i=>s.Get(i)==255):Clears(s)>=input.goalClears;}\n int Clears(World s)');
s=s.replaceAll('if(clears>=input.goalClears)return s;','if(Goal(s))return s;').replaceAll('Clears(normalized)<input.goalClears','!Goal(normalized)').replaceAll('if(clears>=input.goalClears)return;','if(Goal(s))return;').replaceAll('if(clears>=input.goalClears){shortcut','if(Goal(current)){shortcut');
fs.writeFileSync('tools/remake191-200/author194-196/native-key-prefix32.cs',s,{flag:'wx'});
