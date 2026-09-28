import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const currentBoardShapePath = path.join(projectRoot, 'src', 'core', 'boardShapes.ts');
const competitorCatalogPath = path.join(
  projectRoot,
  'deliverables',
  'competitor-board-shapes',
  'blockout-lv001-lv100-board-shapes.json',
);
const outputDirectory = path.join(projectRoot, 'deliverables', 'original-board-shape-proposal');
const jsonPath = path.join(outputDirectory, 'blockout-original-lv001-lv100-board-shape-proposal.json');
const csvPath = path.join(outputDirectory, 'blockout-original-lv001-lv100-board-shape-proposal.csv');
const markdownPath = path.join(outputDirectory, 'blockout-original-lv001-lv100-board-shape-proposal.md');

const featureIntroLevels = new Map([
  [6, '数字冰块'],
  [7, '冰门'],
  [8, '单层外壳'],
  [35, '生成器'],
  [50, '移动升降台'],
  [70, '传送带与卷帘'],
  [91, '星标方块'],
]);

const chapters = [
  ['tutorial-rectangle', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'l-shape', 't-shape'],
  ['near-rectangle', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'stair', 'open-bay', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'narrow-waist'],
  ['near-rectangle', 'l-shape', 'near-rectangle', 'open-bay', 'stair', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'h-shape'],
  ['near-rectangle', 'near-rectangle', 't-shape', 'near-rectangle', 'near-rectangle', 'near-rectangle', 'stair', 'narrow-waist', 'open-bay', 'split'],
  ['near-rectangle', 'near-rectangle', 'open-bay', 'l-shape', 'h-shape', 'near-rectangle', 'stair', 'split', 'near-rectangle', 'near-rectangle'],
  ['near-rectangle', 'open-bay', 'near-rectangle', 'stair', 't-shape', 'near-rectangle', 'narrow-waist', 'near-rectangle', 'h-shape', 'split'],
  ['near-rectangle', 'open-bay', 'stair', 'near-rectangle', 'l-shape', 'split', 'narrow-waist', 'split', 'h-shape', 'near-rectangle'],
  ['near-rectangle', 'open-bay', 'stair', 't-shape', 'split', 'narrow-waist', 'l-shape', 'near-rectangle', 'h-shape', 'split'],
  ['near-rectangle', 'open-bay', 'split', 'stair', 'narrow-waist', 'near-rectangle', 'split', 't-shape', 'h-shape', 'split'],
  ['near-rectangle', 'split', 'open-bay', 'stair', 'split', 'narrow-waist', 'near-rectangle', 'split', 'h-shape', 'split'],
];
const schedule = chapters.flat();

const familyDefinitions = {
  'tutorial-rectangle': {
    familyCn: '完整/近矩形',
    familyGroup: '规整盘面',
    basePressure: 1,
  },
  'near-rectangle': {
    familyCn: '完整/近矩形',
    familyGroup: '规整盘面',
    basePressure: 2,
  },
  'l-shape': {
    familyCn: 'L形',
    familyGroup: '单区异形',
    basePressure: 3,
  },
  't-shape': {
    familyCn: 'T/十字形',
    familyGroup: '单区异形',
    basePressure: 4,
  },
  'h-shape': {
    familyCn: 'H形',
    familyGroup: '单区异形',
    basePressure: 4,
  },
  'narrow-waist': {
    familyCn: '窄颈/工字形',
    familyGroup: '单区异形',
    basePressure: 4,
  },
  stair: {
    familyCn: '阶梯/多边形',
    familyGroup: '单区异形',
    basePressure: 3,
  },
  'open-bay': {
    familyCn: '凹口/开槽形',
    familyGroup: '单区异形',
    basePressure: 3,
  },
  split: {
    familyCn: '多分区组合',
    familyGroup: '多分区',
    basePressure: 4,
  },
};

async function loadCurrentLevelRows() {
  const server = await createServer({
    root: projectRoot,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const { LEVELS } = await server.ssrLoadModule('/src/core/levels.ts');
    const byLevel = new Map(LEVELS.map((level) => {
      const playable = new Set(
        (level.playable ?? []).map(([x, y]) => `${x},${y}`),
      );
      const rows = Array.from({ length: level.height }, (_, y) => (
        Array.from({ length: level.width }, (_, x) => playable.has(`${x},${y}`) ? '#' : '.').join('')
      ));
      return [level.id, rows];
    }));
    if (byLevel.size !== 100) throw new Error(`Expected 100 runtime levels, found ${byLevel.size}.`);
    return byLevel;
  } finally {
    await server.close();
  }
}

function createGrid(width, height, active = false) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => active));
}

function fillRect(grid, x, y, width, height, active = true) {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  for (let row = Math.max(0, y); row < Math.min(gridHeight, y + height); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(gridWidth, x + width); col += 1) {
      grid[row][col] = active;
    }
  }
}

function toRows(grid) {
  return grid.map((row) => row.map((active) => active ? '#' : '.').join(''));
}

function mixSeed(value) {
  let seed = value >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  return (seed ^ (seed >>> 16)) >>> 0;
}

function valueFrom(seed, shift, modulo) {
  return modulo <= 1 ? 0 : (mixSeed(seed + shift * 0x9e3779b9) % modulo);
}

function carveCorner(grid, corner, depth, span) {
  const height = grid.length;
  const width = grid[0].length;
  for (let dy = 0; dy < depth; dy += 1) {
    const rowSpan = Math.max(1, span - dy);
    for (let dx = 0; dx < rowSpan; dx += 1) {
      const x = corner % 2 === 0 ? dx : width - 1 - dx;
      const y = corner < 2 ? dy : height - 1 - dy;
      grid[y][x] = false;
    }
  }
}

function carveEdgeBay(grid, edge, start, span, depth) {
  const height = grid.length;
  const width = grid[0].length;
  if (edge === 0 || edge === 2) {
    for (let offset = 0; offset < span; offset += 1) {
      for (let inset = 0; inset < depth; inset += 1) {
        const x = Math.min(width - 1, start + offset);
        const y = edge === 0 ? inset : height - 1 - inset;
        grid[y][x] = false;
      }
    }
  } else {
    for (let offset = 0; offset < span; offset += 1) {
      for (let inset = 0; inset < depth; inset += 1) {
        const x = edge === 1 ? width - 1 - inset : inset;
        const y = Math.min(height - 1, start + offset);
        grid[y][x] = false;
      }
    }
  }
}

function nearRectangle(width, height, seed, gentle = false, milestone = false) {
  const grid = createGrid(width, height, true);
  if (gentle) {
    const corner = valueFrom(seed, 1, 4);
    carveCorner(grid, corner, 1, 1 + valueFrom(seed, 2, Math.max(1, Math.min(2, width - 3))));
    return { grid, shapeName: ['左上', '右上', '左下', '右下'][corner] + '轻削角矩形' };
  }
  const maxDepth = Math.max(1, Math.min(2, Math.floor(Math.min(width, height) / 4)));
  const depth = 1 + valueFrom(seed, 3, maxDepth);
  const edge = valueFrom(seed, 4, 4);
  const edgeLength = edge % 2 === 0 ? width : height;
  const spanLimit = Math.max(1, Math.min(3, edgeLength - 3));
  const span = 1 + valueFrom(seed, 5, spanLimit);
  const startLimit = Math.max(1, edgeLength - span + 1);
  const start = valueFrom(seed, 6, startLimit);
  carveEdgeBay(grid, edge, start, span, depth);
  if (milestone || valueFrom(seed, 7, 3) === 0) {
    const opposite = (edge + 2) % 4;
    const oppositeLength = opposite % 2 === 0 ? width : height;
    const secondSpan = 1 + valueFrom(seed, 8, Math.max(1, Math.min(2, oppositeLength - 3)));
    const secondStart = valueFrom(seed, 9, Math.max(1, oppositeLength - secondSpan + 1));
    carveEdgeBay(grid, opposite, secondStart, secondSpan, 1);
  }
  const edgeNames = ['上沿', '右沿', '下沿', '左沿'];
  return { grid, shapeName: `${edgeNames[edge]}${milestone ? '双向' : '浅'}缺口近矩形` };
}

function earlyDistinctBoard(width, height, levelNumber) {
  const grid = createGrid(width, height, true);
  if (levelNumber === 2) {
    const bayWidth = Math.min(2, width - 4);
    fillRect(grid, Math.floor((width - bayWidth) / 2), 0, bayWidth, 1, false);
    return { grid, shapeName: '上沿双格浅湾矩形' };
  }
  if (levelNumber === 3) {
    for (let corner = 0; corner < 4; corner += 1) carveCorner(grid, corner, 1, 1);
    return { grid, shapeName: '四角切面八边形' };
  }
  if (levelNumber === 4) {
    carveEdgeBay(grid, 3, Math.max(1, Math.floor(height / 2) - 1), Math.min(3, height - 2), 2);
    return { grid, shapeName: '左侧宽口浅C形' };
  }
  if (levelNumber === 5) {
    carveCorner(grid, 0, 2, 2);
    carveCorner(grid, 3, 2, 2);
    return { grid, shapeName: '对角双削角矩形' };
  }
  if (levelNumber === 6) {
    fillRect(grid, 0, 0, 2, 1, false);
    fillRect(grid, width - 2, 0, 2, 1, false);
    fillRect(grid, 0, height - 1, 2, 1, false);
    fillRect(grid, width - 2, height - 1, 2, 1, false);
    return { grid, shapeName: '上下宽肩胶囊形' };
  }
  if (levelNumber === 7) {
    const span = Math.min(3, height - 2);
    const start = Math.floor((height - span) / 2);
    carveEdgeBay(grid, 1, start, span, 1);
    carveEdgeBay(grid, 3, start, span, 1);
    return { grid, shapeName: '双侧浅收腰形' };
  }
  throw new Error(`Unsupported early board level: ${levelNumber}`);
}

function lShape(width, height, seed) {
  const grid = createGrid(width, height);
  const minimumVertical = Math.max(3, Math.ceil(width * 0.4));
  const maximumVertical = Math.max(minimumVertical, Math.min(width - 2, Math.ceil(width * 0.58)));
  const minimumHorizontal = Math.max(3, Math.ceil(height * 0.4));
  const maximumHorizontal = Math.max(minimumHorizontal, Math.min(height - 2, Math.ceil(height * 0.58)));
  const vertical = minimumVertical + valueFrom(seed, 1, maximumVertical - minimumVertical + 1);
  const horizontal = minimumHorizontal + valueFrom(seed, 2, maximumHorizontal - minimumHorizontal + 1);
  const corner = valueFrom(seed, 3, 4);
  const left = corner % 2 === 0;
  const top = corner < 2;
  fillRect(grid, left ? 0 : width - vertical, 0, vertical, height);
  fillRect(grid, 0, top ? 0 : height - horizontal, width, horizontal);
  const shoulderMode = valueFrom(seed, 4, 3);
  const shoulderLength = 1 + valueFrom(seed, 5, Math.max(1, Math.min(3, width - vertical - 1, height - horizontal - 1)));
  if (shoulderMode === 1) {
    fillRect(
      grid,
      left ? vertical : width - vertical - shoulderLength,
      top ? horizontal : height - horizontal - 2,
      shoulderLength,
      2,
    );
  } else if (shoulderMode === 2) {
    fillRect(
      grid,
      left ? vertical : width - vertical - 2,
      top ? horizontal : height - horizontal - shoulderLength,
      2,
      shoulderLength,
    );
  }
  const freeStart = top ? horizontal + 1 : 2;
  const freeLength = Math.max(0, height - horizontal - 2);
  if (freeLength >= 2) carveEdgeBay(grid, left ? 3 : 1, freeStart, Math.min(3, freeLength), Math.min(2, vertical - 2));
  return { grid, shapeName: `${['左上', '右上', '左下', '右下'][corner]}${shoulderMode ? '厚肩阶' : '宽臂'}开槽L形` };
}

function tShape(width, height, seed) {
  const grid = createGrid(width, height);
  const orientation = valueFrom(seed, 1, 4);
  const verticalStem = orientation === 0 || orientation === 2;
  if (verticalStem) {
    const barHeight = Math.max(2, Math.ceil(height * 0.38));
    const stemWidth = Math.max(2, Math.ceil(width * 0.38));
    const stemX = Math.min(width - stemWidth, Math.max(0, Math.floor((width - stemWidth) / 2) + valueFrom(seed, 2, 3) - 1));
    fillRect(grid, 0, orientation === 0 ? 0 : height - barHeight, width, barHeight);
    fillRect(grid, stemX, 0, stemWidth, height);
  } else {
    const barWidth = Math.max(2, Math.ceil(width * 0.38));
    const stemHeight = Math.max(2, Math.ceil(height * 0.38));
    const stemY = Math.min(height - stemHeight, Math.max(0, Math.floor((height - stemHeight) / 2) + valueFrom(seed, 3, 3) - 1));
    fillRect(grid, orientation === 3 ? 0 : width - barWidth, 0, barWidth, height);
    fillRect(grid, 0, stemY, width, stemHeight);
  }
  return { grid, shapeName: `${['向下', '向左', '向上', '向右'][orientation]}偏心T形` };
}

function hShape(width, height, seed) {
  const grid = createGrid(width, height);
  const minimumLeg = Math.max(2, Math.ceil(width * 0.22));
  const maximumLeg = Math.max(minimumLeg, Math.min(width - minimumLeg - 2, Math.ceil(width * 0.38)));
  const leftLeg = minimumLeg + valueFrom(seed, 1, maximumLeg - minimumLeg + 1);
  const rightLeg = minimumLeg + valueFrom(seed, 2, maximumLeg - minimumLeg + 1);
  const bridgeHeight = Math.max(2, Math.ceil(height * 0.25));
  const bridgeY = Math.min(height - bridgeHeight - 1, Math.max(1, Math.floor((height - bridgeHeight) / 2) + valueFrom(seed, 3, 3) - 1));
  fillRect(grid, 0, 0, leftLeg, height);
  fillRect(grid, width - rightLeg, 0, rightLeg, height);
  fillRect(grid, 0, bridgeY, width, bridgeHeight);
  const bayOnRight = valueFrom(seed, 4, 2) === 1;
  const lowerBay = valueFrom(seed, 5, 2) === 1;
  const freeStart = lowerBay ? bridgeY + bridgeHeight : 0;
  const freeSpan = lowerBay ? height - freeStart : bridgeY;
  const baySpan = Math.max(1, Math.min(3, freeSpan));
  const targetLeg = bayOnRight ? rightLeg : leftLeg;
  if (targetLeg >= 3 && freeSpan >= 2) {
    carveEdgeBay(grid, bayOnRight ? 1 : 3, freeStart, baySpan, Math.min(2, targetLeg - 2));
  }
  return { grid, shapeName: `${bridgeY < height / 2 ? '横梁上移' : '横梁下移'}异宽腿H形` };
}

function narrowWaist(width, height, seed) {
  const grid = createGrid(width, height);
  const vertical = valueFrom(seed, 1, 3) !== 0;
  if (vertical) {
    const chamberBase = Math.max(2, Math.floor(height * 0.26));
    const tallerTop = valueFrom(seed, 2, 2) === 1;
    const topChamberHeight = chamberBase + (tallerTop ? 1 : 0);
    const bottomChamberHeight = chamberBase + (tallerTop ? 0 : 1);
    const stemWidth = Math.max(2, Math.ceil(width * 0.25));
    const stemX = Math.min(width - stemWidth, Math.max(0, Math.floor((width - stemWidth) / 2) + valueFrom(seed, 4, 3) - 1));
    fillRect(grid, 0, 0, width, topChamberHeight);
    fillRect(grid, 0, height - bottomChamberHeight, width, bottomChamberHeight);
    fillRect(grid, stemX, 0, stemWidth, height);
    const bayOnBottom = valueFrom(seed, 5, 2) === 1;
    const targetChamberHeight = bayOnBottom ? bottomChamberHeight : topChamberHeight;
    const bayStart = valueFrom(seed, 6, 2) === 0 ? 0 : Math.max(0, width - 3);
    if (targetChamberHeight >= 3) carveEdgeBay(grid, bayOnBottom ? 2 : 0, bayStart, Math.min(3, width), Math.min(2, targetChamberHeight - 2));
    return { grid, shapeName: `${stemX < (width - stemWidth) / 2 ? '左偏' : '右偏'}削角窄颈工字形` };
  }
  const chamberBase = Math.max(2, Math.floor(width * 0.26));
  const widerLeft = valueFrom(seed, 2, 2) === 1;
  const leftChamberWidth = chamberBase + (widerLeft ? 1 : 0);
  const rightChamberWidth = chamberBase + (widerLeft ? 0 : 1);
  const stemHeight = Math.max(2, Math.floor(height * 0.25));
  const stemY = Math.min(height - stemHeight, Math.max(0, Math.floor((height - stemHeight) / 2) + valueFrom(seed, 5, 3) - 1));
  fillRect(grid, 0, 0, leftChamberWidth, height);
  fillRect(grid, width - rightChamberWidth, 0, rightChamberWidth, height);
  fillRect(grid, 0, stemY, width, stemHeight);
  const bayOnRight = valueFrom(seed, 8, 2) === 1;
  const lowerBay = valueFrom(seed, 9, 2) === 1;
  const bayStart = lowerBay ? Math.max(stemY + stemHeight, height - 3) : 0;
  const availableSpan = lowerBay ? height - bayStart : stemY;
  const targetChamberWidth = bayOnRight ? rightChamberWidth : leftChamberWidth;
  if (targetChamberWidth >= 3 && availableSpan >= 2) {
    carveEdgeBay(grid, bayOnRight ? 1 : 3, bayStart, Math.min(3, availableSpan), Math.min(2, targetChamberWidth - 2));
  }
  return { grid, shapeName: `${stemY < (height - stemHeight) / 2 ? '上偏' : '下偏'}削角横向窄颈形` };
}

function stairShape(width, height, seed) {
  const grid = createGrid(width, height, true);
  const orientation = valueFrom(seed, 1, 4);
  const axisLength = orientation < 2 ? height : width;
  const perpendicularLength = orientation < 2 ? width : height;
  const leadingMargin = Math.min(2, Math.max(1, axisLength - 4));
  const trailingMargin = Math.min(2, Math.max(1, axisLength - leadingMargin - 2));
  const span = Math.max(2, axisLength - leadingMargin - trailingMargin);
  const maximumDepth = Math.max(2, Math.min(4, perpendicularLength - 3));
  const tiers = 2 + valueFrom(seed, 4, Math.max(1, Math.min(2, maximumDepth - 1)));
  const reverse = valueFrom(seed, 5, 2) === 1;
  for (let offset = 0; offset < span; offset += 1) {
    const progress = reverse ? span - 1 - offset : offset;
    const depth = Math.min(maximumDepth, 1 + Math.floor(progress * (maximumDepth - 1) / Math.max(1, span - 1)));
    for (let inset = 0; inset < depth; inset += 1) {
      if (orientation === 0) grid[leadingMargin + offset][inset] = false;
      if (orientation === 1) grid[leadingMargin + offset][width - 1 - inset] = false;
      if (orientation === 2) grid[inset][leadingMargin + offset] = false;
      if (orientation === 3) grid[height - 1 - inset][leadingMargin + offset] = false;
    }
  }
  if (valueFrom(seed, 6, 2)) {
    const opposite = (orientation + 1) % 2 + (orientation >= 2 ? 2 : 0);
    const oppositeLength = opposite < 2 ? height : width;
    const notchStart = Math.max(1, Math.floor(oppositeLength / 2) - 1);
    carveEdgeBay(grid, opposite, notchStart, Math.min(2, oppositeLength - notchStart - 1), 1);
  }
  return { grid, shapeName: `${['左沿', '右沿', '上沿', '下沿'][orientation]}${reverse ? '回折' : '递进'}${tiers}级阶台形` };
}

function openBay(width, height, seed) {
  const mode = valueFrom(seed, 1, 3);
  const grid = createGrid(width, height, true);
  if (mode === 0) {
    const fromTop = valueFrom(seed, 2, 2) === 0;
    const bayWidth = Math.max(2, Math.floor(width * 0.42));
    const bayDepth = Math.max(2, Math.floor(height * 0.48));
    const bayX = Math.min(width - bayWidth, Math.max(0, Math.floor((width - bayWidth) / 2) + valueFrom(seed, 3, 3) - 1));
    fillRect(grid, bayX, fromTop ? 0 : height - bayDepth, bayWidth, bayDepth, false);
    return { grid, shapeName: `${fromTop ? '上开口' : '下开口'}偏心U湾` };
  }
  if (mode === 1) {
    const fromLeft = valueFrom(seed, 4, 2) === 0;
    const bayHeight = Math.max(2, Math.floor(height * 0.42));
    const bayDepth = Math.max(2, Math.floor(width * 0.48));
    const bayY = Math.min(height - bayHeight, Math.max(0, Math.floor((height - bayHeight) / 2) + valueFrom(seed, 5, 3) - 1));
    fillRect(grid, fromLeft ? 0 : width - bayDepth, bayY, bayDepth, bayHeight, false);
    return { grid, shapeName: `${fromLeft ? '左开口' : '右开口'}深凹槽` };
  }
  const topDepth = Math.max(2, Math.floor(height * 0.3));
  const sideWidth = Math.max(2, Math.floor(width * 0.34));
  fillRect(grid, width - sideWidth, 0, sideWidth, topDepth, false);
  fillRect(grid, 0, height - topDepth, sideWidth, topDepth, false);
  return { grid, shapeName: '上下错位S形开槽' };
}

function splitShape(width, height, levelNumber, seed) {
  const grid = createGrid(width, height);
  const componentTarget = [80, 90, 100].includes(levelNumber) ? 3 : 2;
  if (componentTarget === 2) {
    const horizontal = valueFrom(seed, 1, 2) === 0;
    if (horizontal) {
      const gap = 1;
      const topHeight = Math.max(2, Math.floor((height - gap) * (0.42 + valueFrom(seed, 2, 2) * 0.08)));
      const bottomY = topHeight + gap;
      const topInset = valueFrom(seed, 3, Math.max(1, Math.min(3, width - 4)));
      const bottomInset = valueFrom(seed, 4, Math.max(1, Math.min(3, width - 4)));
      fillRect(grid, topInset, 0, width - topInset, topHeight);
      fillRect(grid, 0, bottomY, width - bottomInset, height - bottomY);
    } else {
      const gap = 1;
      const leftWidth = Math.max(2, Math.floor((width - gap) * (0.42 + valueFrom(seed, 5, 2) * 0.08)));
      const rightX = leftWidth + gap;
      const topInset = valueFrom(seed, 6, Math.max(1, Math.min(3, height - 4)));
      const bottomInset = valueFrom(seed, 7, Math.max(1, Math.min(3, height - 4)));
      fillRect(grid, 0, topInset, leftWidth, height - topInset);
      fillRect(grid, rightX, 0, width - rightX, height - bottomInset);
    }
    return { grid, shapeName: '大小错位双分区', componentTarget };
  }
  if (componentTarget === 3) {
    if (levelNumber === 90) {
      const topHeight = Math.max(4, Math.floor(height * 0.42));
      fillRect(grid, 1, 0, width - 2, topHeight);
      fillRect(grid, 0, 1, width, Math.max(2, topHeight - 2));
      const lowerY = topHeight + 1;
      const centerGap = 2;
      const wingWidth = Math.floor((width - centerGap) / 2);
      fillRect(grid, 0, lowerY, wingWidth, height - lowerY);
      fillRect(grid, width - wingWidth, lowerY, wingWidth, height - lowerY);
      return { grid, shapeName: '上主区下双翼三角分区', componentTarget };
    }
    if (levelNumber === 100) {
      const spineWidth = Math.max(3, Math.floor(width * 0.34));
      const centerGap = 2;
      const wingHeight = Math.floor((height - centerGap) / 2);
      fillRect(grid, 0, 1, spineWidth, height - 2);
      fillRect(grid, 1, 0, Math.max(2, spineWidth - 1), height);
      fillRect(grid, spineWidth + 1, 0, width - spineWidth - 1, wingHeight);
      fillRect(grid, spineWidth + 1, height - wingHeight, width - spineWidth - 1, wingHeight);
      return { grid, shapeName: '三翼环抱中央开口分区', componentTarget };
    }
    const availableHeight = height - 2;
    const baseHeight = Math.floor(availableHeight / 3);
    const heights = [baseHeight, baseHeight, availableHeight - baseHeight * 2];
    let y = 0;
    for (let index = 0; index < 3; index += 1) {
      const leftInset = valueFrom(seed, 8 + index * 2, 2);
      const rightInset = valueFrom(seed, 9 + index * 2, 2);
      fillRect(grid, leftInset, y, width - leftInset - rightInset, heights[index]);
      y += heights[index] + 1;
    }
    return { grid, shapeName: '错位三横岛分区', componentTarget };
  }
  throw new Error(`Unsupported component target: ${componentTarget}`);
}

function generate(family, width, height, levelNumber, seed) {
  if (family === 'tutorial-rectangle') return { grid: createGrid(width, height, true), shapeName: '新手完整矩形' };
  if (family === 'near-rectangle') {
    if (levelNumber >= 2 && levelNumber <= 7) return earlyDistinctBoard(width, height, levelNumber);
    return nearRectangle(
      width,
      height,
      seed,
      featureIntroLevels.has(levelNumber) || levelNumber % 10 === 1,
      levelNumber % 5 === 0,
    );
  }
  if (family === 'l-shape') return lShape(width, height, seed);
  if (family === 't-shape') return tShape(width, height, seed);
  if (family === 'h-shape') return hShape(width, height, seed);
  if (family === 'narrow-waist') return narrowWaist(width, height, seed);
  if (family === 'stair') return stairShape(width, height, seed);
  if (family === 'open-bay') return openBay(width, height, seed);
  if (family === 'split') return splitShape(width, height, levelNumber, seed);
  throw new Error(`Unknown family: ${family}`);
}

function analyze(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const active = new Set();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (rows[y][x] === '#') active.add(`${x},${y}`);
  }
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const remaining = new Set(active);
  const componentSizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    let size = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      size += 1;
      const [x, y] = current.split(',').map(Number);
      for (const [dx, dy] of directions) {
        const neighbor = `${x + dx},${y + dy}`;
        if (!remaining.has(neighbor)) continue;
        remaining.delete(neighbor);
        queue.push(neighbor);
      }
    }
    componentSizes.push(size);
  }
  const outsideVoids = new Set();
  const voidQueue = [];
  const addOutside = (x, y) => {
    const cell = `${x},${y}`;
    if (x < 0 || y < 0 || x >= width || y >= height || rows[y][x] === '#' || outsideVoids.has(cell)) return;
    outsideVoids.add(cell);
    voidQueue.push(cell);
  };
  for (let x = 0; x < width; x += 1) {
    addOutside(x, 0);
    addOutside(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    addOutside(0, y);
    addOutside(width - 1, y);
  }
  for (let index = 0; index < voidQueue.length; index += 1) {
    const [x, y] = voidQueue[index].split(',').map(Number);
    for (const [dx, dy] of directions) addOutside(x + dx, y + dy);
  }
  let enclosedVoidCells = 0;
  let perimeter = 0;
  let minimumCellDegree = 4;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = `${x},${y}`;
      if (!active.has(cell) && !outsideVoids.has(cell)) enclosedVoidCells += 1;
      if (!active.has(cell)) continue;
      let degree = 0;
      for (const [dx, dy] of directions) if (active.has(`${x + dx},${y + dy}`)) degree += 1;
      minimumCellDegree = Math.min(minimumCellDegree, degree);
      for (const [dx, dy] of directions) if (!active.has(`${x + dx},${y + dy}`)) perimeter += 1;
    }
  }
  return {
    playable_cell_count: active.size,
    void_cell_count: width * height - active.size,
    footprint_ratio: Number((active.size / (width * height)).toFixed(4)),
    component_count: componentSizes.length,
    component_sizes: componentSizes.toSorted((left, right) => right - left),
    minimum_component_size: Math.min(...componentSizes),
    enclosed_void_cell_count: enclosedVoidCells,
    minimum_cell_degree: minimumCellDegree,
    perimeter,
  };
}

function jaccard(leftRows, rightRows) {
  if (!Array.isArray(rightRows) || leftRows.length !== rightRows.length || leftRows[0].length !== rightRows[0].length) return null;
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < leftRows.length; y += 1) {
    for (let x = 0; x < leftRows[0].length; x += 1) {
      const left = leftRows[y][x] === '#';
      const right = rightRows[y][x] === '#';
      if (left && right) intersection += 1;
      if (left || right) union += 1;
    }
  }
  return union ? intersection / union : 1;
}

function trimRows(rows) {
  const active = [];
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[0].length; x += 1) if (rows[y][x] === '#') active.push([x, y]);
  }
  if (!active.length) return rows;
  const minX = Math.min(...active.map(([x]) => x));
  const maxX = Math.max(...active.map(([x]) => x));
  const minY = Math.min(...active.map(([, y]) => y));
  const maxY = Math.max(...active.map(([, y]) => y));
  return rows.slice(minY, maxY + 1).map((row) => row.slice(minX, maxX + 1));
}

function rotateRows(rows) {
  return Array.from({ length: rows[0].length }, (_, y) => (
    Array.from({ length: rows.length }, (_, x) => rows[rows.length - 1 - x][y]).join('')
  ));
}

function mirrorRows(rows) {
  return rows.map((row) => [...row].reverse().join(''));
}

function d4Rows(rows) {
  const variants = [];
  let current = trimRows(rows);
  for (let index = 0; index < 4; index += 1) {
    variants.push(trimRows(current), trimRows(mirrorRows(current)));
    current = rotateRows(current);
  }
  return [...new Map(variants.map((variant) => [`${variant[0].length}x${variant.length}:${variant.join('/')}`, variant])).values()];
}

function canonicalD4(rows) {
  return d4Rows(rows)
    .map((variant) => `${variant[0].length}x${variant.length}:${variant.join('/')}`)
    .toSorted()[0];
}

function touchesAllOuterEdges(rows) {
  return rows[0].includes('#')
    && rows.at(-1).includes('#')
    && rows.some((row) => row[0] === '#')
    && rows.some((row) => row.at(-1) === '#');
}

function designRole(levelNumber, family) {
  const intro = featureIntroLevels.get(levelNumber);
  if (intro) return `${intro}教学承载位：使用低干扰轮廓，机制本身承担主要变化。`;
  if (levelNumber === 1) return '新手教程：最小完整盘面，只建立拖动与出口认知。';
  if (family === 'near-rectangle') {
    if (levelNumber % 10 === 1) return '章节回落：规整空间恢复操作余量。';
    if (levelNumber % 5 === 0) return '五关节点：用双向浅缺口提高轮廓辨识，但不叠加深窄颈。';
    return '机制/色块承载位：保持连续空间，只用轻削角保证轮廓唯一。';
  }
  if (family === 'l-shape') return '利用转角形成长短轴差异，训练方向规划。';
  if (family === 't-shape') return '横梁与主干共享通路，形成集中式路径竞争。';
  if (family === 'h-shape') return '两侧通路经偏心横梁互通，增加横向切换判断。';
  if (family === 'narrow-waist') return '两个宽区通过至少两格宽的窄颈连接，制造顺序约束。';
  if (family === 'stair') return '用逐级边界改变可用宽度，增加不同尺寸色块的路径差异。';
  if (family === 'open-bay') return '从外沿切入深槽，形成U形或S形绕行但不产生封闭内孔。';
  return '用2–3个有效分区组织局部处理顺序；每个分区均保留可操作面积。';
}

function milestoneRole(levelNumber) {
  if (levelNumber === 48 || levelNumber === 69) return '机制教学前移位主峰轮廓';
  if (levelNumber % 5 !== 0) return null;
  if (featureIntroLevels.has(levelNumber)) return '机制峰值预留：轮廓主动降压';
  return levelNumber % 10 === 0 ? '章节主峰轮廓' : '章节中段节点轮廓';
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const currentRowsByLevel = await loadCurrentLevelRows();
const competitorCatalog = JSON.parse(fs.readFileSync(competitorCatalogPath, 'utf8'));
const competitorRows = competitorCatalog.levels
  .filter((level) => Array.isArray(level.playable_mask))
  .map((level) => ({ levelNumber: level.level_id.match(/\d+/u)?.[0] ?? null, rows: level.playable_mask }));
const exactCompetitorSignatures = new Set(competitorRows.map(({ rows }) => `${rows[0].length}x${rows.length}:${rows.join('/')}`));
const competitorD4Canonicals = new Set(competitorRows.map(({ rows }) => canonicalD4(rows)));
const exactCurrentSignatures = new Set(
  [...currentRowsByLevel.values()].map((rows) => `${rows[0].length}x${rows.length}:${rows.join('/')}`),
);

if (schedule.length !== 100) throw new Error(`Expected a 100-level schedule, found ${schedule.length}.`);

const usedSignatures = new Set();
const usedNonRegularD4Canonicals = new Set();
const levels = [];
for (let index = 0; index < schedule.length; index += 1) {
  const levelNumber = index + 1;
  const family = schedule[index];
  const definition = familyDefinitions[family];
  const currentRows = currentRowsByLevel.get(levelNumber);
  const height = currentRows.length;
  const width = currentRows[0].length;
  let selected = null;
  const rejectionCounts = {};
  for (let attempt = 0; attempt < 1024; attempt += 1) {
    const seed = mixSeed(levelNumber * 1009 + attempt * 9176 + family.length * 7919);
    const generated = generate(family, width, height, levelNumber, seed);
    const rows = toRows(generated.grid);
    const stats = analyze(rows);
    const signature = `${width}x${height}:${rows.join('/')}`;
    const d4Canonical = canonicalD4(rows);
    const expectedComponents = family === 'split' ? generated.componentTarget : 1;
    const isSingleIrregular = definition.familyGroup === '单区异形';
    const minimumComponentSize = family === 'split' ? 12 : 6;
    const coverageOutOfBand = family === 'split'
      ? stats.footprint_ratio < 0.58 || stats.footprint_ratio > 0.85
      : isSingleIrregular
        ? stats.footprint_ratio < 0.62 || stats.footprint_ratio > 0.94 || stats.void_cell_count < 4
        : stats.footprint_ratio < 0.52;
    const rejectionReasons = [
      [rows.some((row) => row.length !== width || /[^#.]/u.test(row)), 'invalid_rows'],
      [stats.enclosed_void_cell_count !== 0, 'enclosed_void'],
      [stats.minimum_cell_degree < 2, 'single_cell_appendage'],
      [!touchesAllOuterEdges(rows), 'missing_outer_edge_contact'],
      [stats.component_count !== expectedComponents, 'component_count'],
      [stats.minimum_component_size < minimumComponentSize, 'small_component'],
      [coverageOutOfBand, 'coverage_out_of_band'],
      [usedSignatures.has(signature), 'proposal_duplicate'],
      [definition.familyGroup !== '规整盘面' && usedNonRegularD4Canonicals.has(d4Canonical), 'proposal_d4_duplicate'],
      [levelNumber !== 1 && exactCompetitorSignatures.has(signature), 'competitor_match'],
      [levelNumber !== 1 && definition.familyGroup !== '规整盘面' && competitorD4Canonicals.has(d4Canonical), 'competitor_d4_match'],
      [levelNumber !== 1 && exactCurrentSignatures.has(signature), 'current_match'],
    ].filter(([rejected]) => rejected).map(([, reason]) => reason);
    if (rejectionReasons.length) {
      for (const reason of rejectionReasons) rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1;
      continue;
    }
    selected = { ...generated, rows, stats, signature, d4Canonical, attempt };
    break;
  }
  if (!selected) {
    throw new Error(`Could not generate a valid original mask for Level ${levelNumber} (${family}): ${JSON.stringify(rejectionCounts)}`);
  }
  usedSignatures.add(selected.signature);
  if (definition.familyGroup !== '规整盘面') usedNonRegularD4Canonicals.add(selected.d4Canonical);

  const sameDimensionCompetitors = competitorRows.filter(({ rows }) => rows.length === height && rows[0].length === width);
  const nearest = sameDimensionCompetitors
    .map((competitor) => ({
      level: competitor.levelNumber ? Number(competitor.levelNumber) : null,
      similarity: jaccard(selected.rows, competitor.rows),
    }))
    .toSorted((left, right) => right.similarity - left.similarity)[0] ?? null;
  const currentSimilarity = jaccard(selected.rows, currentRows);
  const intro = featureIntroLevels.get(levelNumber) ?? null;
  const milestone = milestoneRole(levelNumber);
  const shapePressure = intro
    ? 1
    : Math.min(5, definition.basePressure + (family === 'split' && selected.stats.component_count >= 3 ? 1 : 0));

  levels.push({
    level_id: `Level ${levelNumber}`,
    level_number: levelNumber,
    status: 'pending_user_confirmation',
    applied_to_game: false,
    board: {
      rows: height,
      cols: width,
      playable_mask: selected.rows,
      playable_cell_count: selected.stats.playable_cell_count,
      void_cell_count: selected.stats.void_cell_count,
      footprint_ratio: selected.stats.footprint_ratio,
      component_count: selected.stats.component_count,
      component_sizes: selected.stats.component_sizes,
      enclosed_void_cell_count: selected.stats.enclosed_void_cell_count,
      minimum_cell_degree: selected.stats.minimum_cell_degree,
      perimeter: selected.stats.perimeter,
    },
    shape: {
      family_id: family,
      family: definition.familyCn,
      family_group: definition.familyGroup,
      name: selected.shapeName,
      pressure: shapePressure,
      design_role: designRole(levelNumber, family),
      milestone_role: milestone,
      mechanism_intro_reserved_for: intro,
    },
    originality: {
      generation_attempt: selected.attempt + 1,
      d4_canonical_signature: selected.d4Canonical,
      exact_match_with_any_competitor: exactCompetitorSignatures.has(selected.signature),
      d4_exact_match_with_any_competitor: competitorD4Canonicals.has(selected.d4Canonical),
      exact_match_with_any_current_board: exactCurrentSignatures.has(selected.signature),
      same_level_current_mask_similarity: Number(currentSimilarity.toFixed(4)),
      closest_same_dimension_competitor_level: nearest?.level ?? null,
      closest_same_dimension_competitor_similarity: nearest ? Number(nearest.similarity.toFixed(4)) : null,
      note: levelNumber === 1
        ? '教程5×5完整矩形属于通用基础形，允许与竞品/旧版同形；不承载原创性判断。'
        : '仅参考造型家族和节奏；逐格掩码为新生成，未复制竞品或当前关卡。',
    },
    integration: {
      current_outer_dimensions_preserved: true,
      blocks_gates_and_mechanisms_changed: false,
      solver_status: 'not_run_until_shape_confirmation',
      next_step_after_approval: '按确认的掩码重新排布色块、出口与机制，再逐关运行求解器。',
    },
  });
}

const countBy = (selector) => Object.fromEntries(
  [...new Set(levels.map(selector))].map((key) => [key, levels.filter((level) => selector(level) === key).length]),
);
const chapterSummary = Array.from({ length: 10 }, (_, chapterIndex) => {
  const subset = levels.slice(chapterIndex * 10, chapterIndex * 10 + 10);
  return {
    levels: `Lv${chapterIndex * 10 + 1}–${chapterIndex * 10 + 10}`,
    regular: subset.filter((level) => level.shape.family_group === '规整盘面').length,
    single_irregular: subset.filter((level) => level.shape.family_group === '单区异形').length,
    multi_section: subset.filter((level) => level.shape.family_group === '多分区').length,
    average_shape_pressure: Number((subset.reduce((total, level) => total + level.shape.pressure, 0) / subset.length).toFixed(2)),
  };
});
const validationIssues = [];
if (levels.length !== 100 || usedSignatures.size !== 100) validationIssues.push('100关数量或轮廓唯一性不成立。');
for (const level of levels) {
  if (level.board.enclosed_void_cell_count !== 0) validationIssues.push(`${level.level_id} 存在封闭内孔。`);
  if (level.board.minimum_cell_degree < 2) validationIssues.push(`${level.level_id} 存在单格尖刺或附肢。`);
  if (!touchesAllOuterEdges(level.board.playable_mask)) validationIssues.push(`${level.level_id} 未接触全部四条外边界。`);
  if (level.board.component_count > 3) validationIssues.push(`${level.level_id} 分区超过3。`);
  const minimumComponentSize = level.shape.family_group === '多分区' ? 12 : 6;
  if (Math.min(...level.board.component_sizes) < minimumComponentSize) validationIssues.push(`${level.level_id} 存在过小分区。`);
  if (level.shape.family_group === '多分区') {
    if (level.board.footprint_ratio < 0.58 || level.board.footprint_ratio > 0.85) validationIssues.push(`${level.level_id} 多分区占地率越界。`);
    if (level.board.component_sizes.some((size) => size / level.board.playable_cell_count < 0.15)) validationIssues.push(`${level.level_id} 存在占比低于15%的分区。`);
  } else if (level.shape.family_group === '单区异形') {
    if (level.board.footprint_ratio < 0.62 || level.board.footprint_ratio > 0.94 || level.board.void_cell_count < 4) validationIssues.push(`${level.level_id} 单区异形占地率/缺格数越界。`);
  } else if (level.board.footprint_ratio < 0.52) validationIssues.push(`${level.level_id} 可用面积低于52%。`);
  if (level.level_number !== 1 && level.originality.exact_match_with_any_competitor) validationIssues.push(`${level.level_id} 与竞品精确同形。`);
  if (level.level_number !== 1 && level.shape.family_group !== '规整盘面' && level.originality.d4_exact_match_with_any_competitor) validationIssues.push(`${level.level_id} 与竞品存在旋转/镜像同形。`);
  if (level.level_number !== 1 && level.originality.exact_match_with_any_current_board) validationIssues.push(`${level.level_id} 与当前关卡精确同形。`);
}

const payload = {
  dataset: 'Block Out 原创 Lv1–100 棋盘造型确认稿 v2',
  version: '2026-09-08-proposal-v2',
  status: 'pending_user_confirmation',
  applied_to_game: false,
  scope: '只定义棋盘外形与可用格掩码，不修改色块、出口、机制、难度或关卡源码。',
  revision_notes: [
    '按用户反馈强化Lv2–7差异：上沿浅湾、四角切面、侧开槽、对角削角、宽肩胶囊、双侧收腰。',
    '全量禁止单格尖刺/附肢，所有可用格至少具有2个正交相邻可用格。',
    'Lv80/Lv90/Lv100分别使用横岛、三角双翼、环抱开口三种终局分区拓扑。',
  ],
  reference_strategy: {
    competitor_dataset: path.relative(projectRoot, competitorCatalogPath).replaceAll('\\', '/'),
    retained: [
      '前期以规整盘面为主，后段逐步增加单区异形和多分区。',
      '新机制教学位采用低几何干扰轮廓。',
      '高色块负载可以由规整盘面承载，复杂轮廓不与所有机制同步上升。',
    ],
    intentionally_changed: [
      '不复刻竞品逐关顺序或逐格掩码。',
      '将竞品“完整矩形”转译为完整/近矩形，利用轻削角保证100个轮廓唯一。',
      '不采用项目当前规则禁止的封闭内孔。',
    ],
  },
  constraints: {
    dimensions: '沿用当前每关外框 rows/cols，降低确认后接入成本。',
    mask_legend: { '#': '可用棋盘格', '.': '外部空白/分区间隔' },
    unique_masks: true,
    enclosed_void_cells: 0,
    minimum_cell_degree: '每个可用格至少有2个正交相邻可用格，禁止单格尖刺/附肢',
    outer_edge_contact: '上下左右四条外边界均至少有一个可用格',
    component_count: '1–3',
    minimum_component_size: '单区≥6格；多分区每区≥12格且不少于总可玩面积15%',
    footprint_ratio: '单区异形0.62–0.94；多分区0.58–0.85；全局下限0.52',
  },
  summary: {
    level_count: levels.length,
    unique_mask_count: usedSignatures.size,
    unique_non_regular_d4_mask_count: usedNonRegularD4Canonicals.size,
    shape_family_counts: countBy((level) => level.shape.family),
    shape_group_counts: countBy((level) => level.shape.family_group),
    component_count_distribution: countBy((level) => String(level.board.component_count)),
    chapter_progression: chapterSummary,
    mechanism_intro_relief_levels: [...featureIntroLevels].map(([level, mechanism]) => ({ level, mechanism })),
    exact_competitor_matches_excluding_tutorial: levels.filter((level) => level.level_number !== 1 && level.originality.exact_match_with_any_competitor).length,
    exact_current_board_matches_excluding_tutorial: levels.filter((level) => level.level_number !== 1 && level.originality.exact_match_with_any_current_board).length,
    validation_issue_count: validationIssues.length,
  },
  validation_issues: validationIssues,
  levels,
};

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const csvColumns = [
  'level_id', 'rows', 'cols', 'shape_family', 'shape_name', 'shape_group', 'shape_pressure',
  'component_count', 'playable_cell_count', 'footprint_ratio', 'milestone_role',
  'mechanism_intro_reserved_for', 'design_role', 'playable_mask', 'status',
];
const csvRows = levels.map((level) => [
  level.level_id,
  level.board.rows,
  level.board.cols,
  level.shape.family,
  level.shape.name,
  level.shape.family_group,
  level.shape.pressure,
  level.board.component_count,
  level.board.playable_cell_count,
  level.board.footprint_ratio,
  level.shape.milestone_role,
  level.shape.mechanism_intro_reserved_for,
  level.shape.design_role,
  level.board.playable_mask.join('/'),
  level.status,
].map(csvCell).join(','));
fs.writeFileSync(csvPath, `${csvColumns.join(',')}\n${csvRows.join('\n')}\n`, 'utf8');

const markdown = [
  '# Block Out 原创 Lv1–100 棋盘造型确认稿 v2',
  '',
  '> 状态：待确认。当前没有写入任何关卡源码，也没有修改色块、出口、机制或难度。',
  '',
  '## 设计原则',
  '',
  '- 参考竞品“前期规整、后期异形与分区增加”的节奏，但不复制逐格轮廓。',
  '- Lv2–7采用六种明确不同的低压轮廓，避免连续关卡只做轻微削角。',
  '- 竞品的完整矩形被转译为“完整/近矩形”：保留低几何干扰，同时用轻削角保证100关轮廓唯一。',
  '- 不使用封闭内孔；分区控制在1–3个；多分区的每个区域不少于12格且占比不低于15%。',
  '- 所有边臂和端部保持至少两格的结构支撑，不用单格尖刺制造差异。',
  '- 每个轮廓均接触外框上下左右四边，避免浪费边界及压缩出口候选位。',
  '- 单区异形占地率控制在62%–94%，多分区控制在58%–85%，避免过密或碎片化。',
  '- Lv6/7/8/35/50/70/91为当前机制教学位，轮廓主动降压。',
  '- 每5关保留一个节奏节点；如果该节点同时是机制教学位，则由机制承担峰值，棋盘保持简单。',
  '',
  '## 总体配额',
  '',
  '| 造型家族 | 数量 |',
  '|---|---:|',
  ...Object.entries(payload.summary.shape_family_counts).map(([family, count]) => `| ${family} | ${count} |`),
  '',
  '## 十关递进',
  '',
  '| 区间 | 规整盘面 | 单区异形 | 多分区 | 平均造型压力 |',
  '|---|---:|---:|---:|---:|',
  ...chapterSummary.map((chapter) => `| ${chapter.levels} | ${chapter.regular} | ${chapter.single_irregular} | ${chapter.multi_section} | ${chapter.average_shape_pressure} |`),
  '',
  '## 每关确认表',
  '',
  '| 关卡 | 外框 | 造型 | 压力 | 分区 | 可用格 | 占地率 | 节点/教学 | 设计角色 |',
  '|---:|---|---|---:|---:|---:|---:|---|---|',
  ...levels.map((level) => {
    const role = level.shape.mechanism_intro_reserved_for
      ? `${level.shape.mechanism_intro_reserved_for}教学`
      : level.shape.milestone_role ?? '—';
    return `| ${level.level_number} | ${level.board.rows}×${level.board.cols} | ${level.shape.family}/${level.shape.name} | ${level.shape.pressure} | ${level.board.component_count} | ${level.board.playable_cell_count} | ${(level.board.footprint_ratio * 100).toFixed(1)}% | ${role} | ${level.shape.design_role} |`;
  }),
  '',
  '## 确认后的接入顺序',
  '',
  '1. 将确认后的掩码作为100关棋盘外形基线。',
  '2. 按每关轮廓重新排布色块、出口和机制，不沿用被挖空位置。',
  '3. 逐关运行合法性校验和求解器，再计算难度曲线。',
  '',
].join('\n');
fs.writeFileSync(markdownPath, markdown, 'utf8');

console.log(JSON.stringify({
  outputs: [jsonPath, csvPath, markdownPath],
  summary: payload.summary,
  validationIssues,
}, null, 2));
