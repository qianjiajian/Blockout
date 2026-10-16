import assert from 'node:assert/strict';

// Dimensions and rectangle/irregular classification manually observed in the
// corresponding first stable video frames; these are not solver objectives.
export const SOURCE_GEOMETRY = {
  221: [8, 11, 'irregular'], 222: [7, 9, 'irregular'],
  223: [6, 9, 'irregular'], 224: [7, 10, 'rectangle'],
  225: [7, 9, 'irregular'], 226: [7, 8, 'irregular'],
  227: [7, 9, 'rectangle'], 228: [6, 10, 'irregular'],
  229: [6, 8, 'irregular'], 230: [7, 9, 'rectangle'],
};

export function verifySourceGeometry(level) {
  const [width, height, classification] = SOURCE_GEOMETRY[level.id];
  assert.equal(level.width, width, `Lv${level.id} source width`);
  assert.equal(level.height, height, `Lv${level.id} source height`);
  const cells = level.playable ?? Array.from({length: width * height}, (_, p) => [p % width, Math.floor(p / width)]);
  const mask = new Set(cells.map(p => p.join(',')));
  assert.equal(mask.size, cells.length);
  assert.equal(level.blocked?.length ?? 0, 0, 'No interior blocked cells');
  assert(cells.every(([x,y]) => x >= 0 && x < width && y >= 0 && y < height));
  assert(cells.some(([x]) => x === 0) && cells.some(([x]) => x === width-1));
  assert(cells.some(([,y]) => y === 0) && cells.some(([,y]) => y === height-1));
  if (classification === 'rectangle') assert.equal(mask.size, width * height);
  else assert(mask.size < width * height);
  const mirrorX = cells.every(([x,y]) => mask.has([width-1-x,y].join(',')));
  const mirrorY = cells.every(([x,y]) => mask.has([x,height-1-y].join(',')));
  assert(mirrorX || mirrorY, 'Original irregular contour must have an axis of symmetry');
  function flood(start, permitted) {
    const queue=[start], seen=new Set([start.join(',')]);
    for(let i=0;i<queue.length;i++) for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const [x,y]=queue[i], next=[x+dx,y+dy], key=next.join(',');
      if(!seen.has(key)&&permitted(...next)){seen.add(key);queue.push(next);}
    }
    return seen;
  }
  assert.equal(flood(cells[0],(x,y)=>mask.has([x,y].join(','))).size, mask.size, 'Connected playable contour');
  const outside=flood([-1,-1],(x,y)=>x>=-1&&x<=width&&y>=-1&&y<=height&&!mask.has([x,y].join(',')));
  assert.equal(outside.size, (width+2)*(height+2)-mask.size, 'No enclosed interior holes');
  return {width,height,classification,playableCells:mask.size,mirrorX,mirrorY,passed:true};
}
