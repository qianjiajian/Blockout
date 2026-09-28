import "./boardEditor.css";
import { BOARD_SHAPE_FAMILY_BY_LEVEL } from "../core/boardShapes";
import { LEVELS, getLevelStrict } from "../core/levels";
import type { LevelSpec } from "../core/types";
import {
  analyzeBoardShape,
  buildCellConstraints,
  cellKey,
  normalizeRows,
  pointsToRows,
  type BoardShapeAnalysis,
  type CellConstraint,
} from "./boardEditorModel";
import type { BoardEditorSolveResult } from "./boardEditorWorker";

type PaintTool = "paint" | "erase";

const root = document.querySelector<HTMLDivElement>("#board-editor");
if (!root) throw new Error("Missing #board-editor root");

root.innerHTML = `
  <div class="editor-shell">
    <header class="editor-header">
      <div class="editor-title">
        <h1>棋盘造型编辑器</h1>
        <p>拖动小格拼接真实棋盘；黄色框是出口、方块或卷帘必需格。正式关卡不使用棋盘内部固定障碍。</p>
      </div>
      <div id="save-state" class="save-state">正在读取项目…</div>
    </header>
    <main class="editor-layout">
      <section class="panel workspace-panel">
        <div class="toolbar">
          <label class="field">选择关卡
            <select id="level-select" aria-label="选择关卡"></select>
          </label>
          <button class="tool-button active" data-tool="paint" title="快捷键 B">＋ 铺地</button>
          <button class="tool-button" data-tool="erase" title="快捷键 E；鼠标右键也可挖空">－ 挖空</button>
          <button class="tool-button" data-action="undo" title="Ctrl+Z">撤销</button>
          <button class="tool-button" data-action="redo" title="Ctrl+Y">重做</button>
          <button class="tool-button" data-action="fill">铺满</button>
          <button class="tool-button" data-action="minimal">仅保留必需格</button>
          <button class="tool-button" data-action="restore">恢复项目版</button>
        </div>
        <div class="board-stage">
          <div id="board-grid" class="board-grid" role="grid" aria-label="棋盘造型编辑网格"></div>
        </div>
        <div class="legend">
          <span class="floor">已铺棋盘</span>
          <span class="required">必需格，不能挖空</span>
          <span>所有已铺棋盘格均可移动；挖空区必须与棋盘外沿连通</span>
          <span>左键拖动使用当前工具，右键拖动直接挖空</span>
        </div>
      </section>
      <aside class="panel side-panel">
        <h2 id="level-heading">关卡信息</h2>
        <div id="stats-grid" class="stats-grid"></div>
        <ul id="message-list" class="message-list"></ul>
        <div id="solve-status" class="solve-status">先完成轮廓，再执行可解性验证。复杂关卡最长约需 30 秒。</div>
        <div class="button-stack">
          <div class="button-row">
            <button id="validate-button" class="action-button secondary">验证可解性</button>
            <button id="save-button" class="action-button primary">验证并保存到项目</button>
          </div>
          <div class="button-row">
            <button class="action-button" data-action="copy">复制 JSON</button>
            <button class="action-button" data-action="download">下载 JSON</button>
          </div>
          <div class="button-row">
            <button class="action-button" data-action="apply-code">应用下方文本</button>
            <button class="action-button" data-action="import">导入 JSON</button>
          </div>
        </div>
        <textarea id="shape-code" class="shape-code" spellcheck="false" aria-label="棋盘轮廓 JSON"></textarea>
        <p class="hint">“保存到项目”只在 <code>pnpm board:editor</code> 启动的本地开发服务中可用。保存前会运行正式 A* 求解器，并自动同步该关的最少拖拽数；不通过不会写文件。</p>
      </aside>
    </main>
  </div>
  <input id="import-file" type="file" accept="application/json,.json" hidden />
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
`;

const requiredElement = <T extends Element>(selector: string): T => {
  const element = root.querySelector<T>(selector) ?? document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing editor element ${selector}`);
  return element;
};

const levelSelect = requiredElement<HTMLSelectElement>("#level-select");
const grid = requiredElement<HTMLDivElement>("#board-grid");
const statsGrid = requiredElement<HTMLDivElement>("#stats-grid");
const messageList = requiredElement<HTMLUListElement>("#message-list");
const levelHeading = requiredElement<HTMLHeadingElement>("#level-heading");
const saveState = requiredElement<HTMLDivElement>("#save-state");
const solveStatus = requiredElement<HTMLDivElement>("#solve-status");
const shapeCode = requiredElement<HTMLTextAreaElement>("#shape-code");
const validateButton = requiredElement<HTMLButtonElement>("#validate-button");
const saveButton = requiredElement<HTMLButtonElement>("#save-button");
const importFile = requiredElement<HTMLInputElement>("#import-file");
const toast = requiredElement<HTMLDivElement>("#toast");

levelSelect.innerHTML = LEVELS.map((level) => (
  `<option value="${level.id}">第 ${level.id} 关 · ${level.name} · ${level.width}×${level.height}</option>`
)).join("");

let levelId = Math.max(1, Math.min(LEVELS.length, Number(new URLSearchParams(location.search).get("level")) || 1));
let level: LevelSpec = getLevelStrict(levelId);
let sourceRows: string[] = [];
let rows: string[] = [];
let history: string[][] = [];
let historyIndex = 0;
let activeTool: PaintTool = "paint";
let drawing = false;
let strokeChanged = false;
let strokeValue = true;
let analysis: BoardShapeAnalysis;
let solveWorker: Worker | undefined;
let solveBusy = false;
let pendingSave = false;
let apiAvailable = false;
let lastValidatedRevision = "";
let toastTimer = 0;

const cloneRows = (value: readonly string[]): string[] => [...value];
const revisionOf = (value = rows): string => `${levelId}:${value.join("/")}`;
const draftKey = (): string => `block-out-board-editor-draft-v1:${levelId}`;

const showToast = (message: string): void => {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
};

const parseRowsPayload = (value: unknown): string[] => {
  const candidate = Array.isArray(value) ? value
    : value && typeof value === "object" && Array.isArray((value as { rows?: unknown }).rows)
      ? (value as { rows: unknown[] }).rows
      : undefined;
  if (!candidate || !candidate.every((row) => typeof row === "string")) throw new Error("JSON 中必须包含字符串数组 rows");
  if (candidate.length !== level.height || candidate.some((row) => row.length !== level.width || /[^#.]/.test(row))) {
    throw new Error(`当前关卡要求 ${level.width}×${level.height}，且只能使用 # 和 .`);
  }
  return candidate as string[];
};

const exportPayload = (): Record<string, unknown> => ({
  format: "block-out-board-shape/v1",
  levelId,
  levelName: level.name,
  width: level.width,
  height: level.height,
  family: BOARD_SHAPE_FAMILY_BY_LEVEL[levelId],
  rows: cloneRows(rows),
});

const loadLevel = (nextId: number): void => {
  levelId = nextId;
  level = getLevelStrict(levelId);
  levelSelect.value = String(levelId);
  sourceRows = pointsToRows(level.playable ?? [], level.width, level.height);
  let draft: string[] | undefined;
  try {
    const stored = localStorage.getItem(draftKey());
    if (stored) draft = parseRowsPayload(JSON.parse(stored));
  } catch {
    localStorage.removeItem(draftKey());
  }
  rows = cloneRows(draft ?? sourceRows);
  history = [cloneRows(rows)];
  historyIndex = 0;
  lastValidatedRevision = "";
  solveStatus.className = "solve-status";
  solveStatus.textContent = draft ? "已恢复本机草稿；保存前请重新验证可解性。" : "先完成轮廓，再执行可解性验证。复杂关卡最长约需 30 秒。";
  render();
};

const setRows = (nextRows: readonly string[], pushHistory = true): void => {
  const normalized = normalizeRows(nextRows, level.width, level.height);
  if (normalized.join("/") === rows.join("/")) return;
  rows = normalized;
  lastValidatedRevision = "";
  if (pushHistory) {
    history = history.slice(0, historyIndex + 1);
    history.push(cloneRows(rows));
    historyIndex = history.length - 1;
  }
  localStorage.setItem(draftKey(), JSON.stringify(exportPayload()));
  render();
};

const paintCell = (x: number, y: number, active: boolean): void => {
  const constraint = buildCellConstraints(level).get(cellKey(x, y));
  if ((active && constraint?.blocked) || (!active && constraint?.required)) return;
  const row = rows[y];
  const next = active ? "#" : ".";
  if (row[x] === next) return;
  rows[y] = `${row.slice(0, x)}${next}${row.slice(x + 1)}`;
  strokeChanged = true;
  lastValidatedRevision = "";
  render();
};

const markerFor = (constraint: CellConstraint): string => {
  if (constraint.blocked) return "×";
  if (constraint.gateSides.length) {
    return [...new Set(constraint.gateSides.map((side) => ({ top: "↑", right: "→", bottom: "↓", left: "←" })[side] ?? "门"))].join("");
  }
  if (constraint.tags.some((tag) => tag.startsWith("卷帘"))) return "帘";
  if (constraint.tags.some((tag) => tag.includes("方块"))) return "块";
  return "";
};

const render = (): void => {
  analysis = analyzeBoardShape(level, rows);
  const constraints = buildCellConstraints(level);
  const dirty = rows.join("/") !== sourceRows.join("/");
  saveState.className = `save-state ${dirty ? "dirty" : "saved"}`;
  saveState.textContent = dirty ? "● 有未保存修改" : "✓ 与项目文件一致";
  levelHeading.textContent = `第 ${level.id} 关 · ${level.name}`;

  grid.style.setProperty("--columns", String(level.width));
  grid.style.setProperty("--rows", String(level.height));
  const isEditorFloor = (x: number, y: number): boolean => rows[y]?.[x] === "#" && !constraints.get(cellKey(x, y))?.blocked;
  grid.innerHTML = rows.flatMap((row, y) => [...row].map((value, x) => {
    const constraint = constraints.get(cellKey(x, y));
    const classes = ["board-cell"];
    if (value === "#") classes.push("active");
    if (constraint?.required) classes.push("required");
    if (constraint?.required && value !== "#") classes.push("missing-required");
    if (constraint?.blocked) classes.push("blocked");
    const title = constraint?.tags.length ? `${x},${y} · ${constraint.tags.join(" / ")}` : `${x},${y}`;
    const marker = constraint ? markerFor(constraint) : "";
    const rim = value === "#" && !constraint?.blocked ? [
      !isEditorFloor(x, y - 1) ? '<span class="cell-rim top" aria-hidden="true"></span>' : "",
      !isEditorFloor(x + 1, y) ? '<span class="cell-rim right" aria-hidden="true"></span>' : "",
      !isEditorFloor(x, y + 1) ? '<span class="cell-rim bottom" aria-hidden="true"></span>' : "",
      !isEditorFloor(x - 1, y) ? '<span class="cell-rim left" aria-hidden="true"></span>' : "",
      !isEditorFloor(x - 1, y) && !isEditorFloor(x, y - 1) && !isEditorFloor(x - 1, y - 1) ? '<span class="cell-corner top-left" aria-hidden="true"></span>' : "",
      !isEditorFloor(x + 1, y) && !isEditorFloor(x, y - 1) && !isEditorFloor(x + 1, y - 1) ? '<span class="cell-corner top-right" aria-hidden="true"></span>' : "",
      !isEditorFloor(x + 1, y) && !isEditorFloor(x, y + 1) && !isEditorFloor(x + 1, y + 1) ? '<span class="cell-corner bottom-right" aria-hidden="true"></span>' : "",
      !isEditorFloor(x - 1, y) && !isEditorFloor(x, y + 1) && !isEditorFloor(x - 1, y + 1) ? '<span class="cell-corner bottom-left" aria-hidden="true"></span>' : "",
      isEditorFloor(x, y - 1) && isEditorFloor(x + 1, y) && !isEditorFloor(x + 1, y - 1) ? '<span class="cell-inner-corner missing-ne" aria-hidden="true"></span>' : "",
      isEditorFloor(x + 1, y) && isEditorFloor(x, y + 1) && !isEditorFloor(x + 1, y + 1) ? '<span class="cell-inner-corner missing-se" aria-hidden="true"></span>' : "",
      isEditorFloor(x - 1, y) && isEditorFloor(x, y + 1) && !isEditorFloor(x - 1, y + 1) ? '<span class="cell-inner-corner missing-sw" aria-hidden="true"></span>' : "",
      isEditorFloor(x, y - 1) && isEditorFloor(x - 1, y) && !isEditorFloor(x - 1, y - 1) ? '<span class="cell-inner-corner missing-nw" aria-hidden="true"></span>' : "",
    ].join("") : "";
    return `<button type="button" role="gridcell" class="${classes.join(" ")}" data-x="${x}" data-y="${y}" aria-label="${title}" title="${title}">${rim}<span class="cell-marker">${marker}</span><span class="cell-coord">${x},${y}</span></button>`;
  })).join("");

  statsGrid.innerHTML = [
    ["棋盘格", analysis.stats.active],
    ["虚空格", analysis.stats.voids],
    ["内部死格", analysis.stats.enclosedVoids],
    ["独立分区", analysis.stats.components],
    ["外轮廓边", analysis.stats.perimeter],
    ["覆盖率", `${Math.round(analysis.stats.coverage * 100)}%`],
    ["关卡尺寸", `${level.width}×${level.height}`],
  ].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join("");

  const messages = [
    ...analysis.errors.map((message) => ({ kind: "error", message })),
    ...analysis.warnings.map((message) => ({ kind: "warning", message })),
  ];
  if (!messages.length) messages.push({ kind: "ok", message: "结构前置校验通过，可以运行正式求解器。" });
  messageList.innerHTML = messages.map(({ kind, message }) => `<li class="${kind}">${message}</li>`).join("");

  if (document.activeElement !== shapeCode) shapeCode.value = JSON.stringify(exportPayload(), null, 2);
  validateButton.disabled = solveBusy || analysis.errors.length > 0;
  saveButton.disabled = solveBusy || analysis.errors.length > 0 || !apiAvailable;
  saveButton.title = apiAvailable ? "通过正式求解后写回 src/core/boardShapes.ts" : "请使用 pnpm board:editor 启动本地编辑服务";
  root.querySelector<HTMLButtonElement>('[data-action="undo"]')!.disabled = historyIndex <= 0;
  root.querySelector<HTMLButtonElement>('[data-action="redo"]')!.disabled = historyIndex >= history.length - 1;
  root.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((button) => button.classList.toggle("active", button.dataset.tool === activeTool));
};

const runSolver = (saveAfter: boolean): void => {
  if (analysis.errors.length || solveBusy) return;
  solveWorker ??= new Worker(new URL("./boardEditorWorker.ts", import.meta.url), { type: "module" });
  solveBusy = true;
  pendingSave = saveAfter;
  solveStatus.className = "solve-status busy";
  solveStatus.textContent = `正在用正式 A* 求解第 ${levelId} 关，请勿关闭页面…`;
  render();
  solveWorker.onmessage = async (event: MessageEvent<BoardEditorSolveResult>): Promise<void> => {
    const result = event.data;
    solveBusy = false;
    if (result.revision !== revisionOf()) {
      solveStatus.className = "solve-status failure";
      solveStatus.textContent = "验证期间轮廓发生变化，旧结果已丢弃，请重新验证。";
      render();
      return;
    }
    lastValidatedRevision = result.accepted ? result.revision : "";
    if (!result.accepted) {
      solveStatus.className = "solve-status failure";
      solveStatus.textContent = result.errors.join("；") || "当前轮廓不可解。";
      render();
      return;
    }
    solveStatus.className = "solve-status success";
    solveStatus.textContent = `可解：最少 ${result.minimumDrags} 拖，必要腾挪 ${result.repositionOverhead}，网格步 ${result.gridSteps}，搜索 ${result.exploredStates} 状态。`;
    if (pendingSave) await saveToProject(result);
    render();
  };
  solveWorker.postMessage({ levelId, rows: cloneRows(rows), revision: revisionOf() });
};

const saveToProject = async (result: BoardEditorSolveResult): Promise<void> => {
  if (!apiAvailable || lastValidatedRevision !== revisionOf()) return;
  try {
    const response = await fetch("/__board-editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelId, width: level.width, height: level.height, rows, minimumDrags: result.minimumDrags }),
    });
    const body = await response.json() as { ok?: boolean; backup?: string; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? `保存失败 ${response.status}`);
    sourceRows = cloneRows(rows);
    localStorage.removeItem(draftKey());
    saveState.className = "save-state saved";
    saveState.textContent = "✓ 已写入项目";
    solveStatus.textContent += ` 已保存；备份：${body.backup ?? "已创建"}`;
    showToast("棋盘轮廓与最少拖拽数已写入项目");
  } catch (error) {
    solveStatus.className = "solve-status failure";
    solveStatus.textContent = error instanceof Error ? error.message : String(error);
  }
};

const cellFromEvent = (event: Event): HTMLButtonElement | undefined => {
  const target = event.target as Element | null;
  return target?.closest<HTMLButtonElement>(".board-cell") ?? undefined;
};

grid.addEventListener("contextmenu", (event) => event.preventDefault());
grid.addEventListener("pointerdown", (event) => {
  const cell = cellFromEvent(event);
  if (!cell) return;
  event.preventDefault();
  drawing = true;
  strokeChanged = false;
  strokeValue = event.button === 2 ? false : activeTool === "paint";
  paintCell(Number(cell.dataset.x), Number(cell.dataset.y), strokeValue);
});
grid.addEventListener("pointerover", (event) => {
  if (!drawing) return;
  const cell = cellFromEvent(event);
  if (cell) paintCell(Number(cell.dataset.x), Number(cell.dataset.y), strokeValue);
});
window.addEventListener("pointerup", () => {
  if (!drawing) return;
  drawing = false;
  if (!strokeChanged) return;
  history = history.slice(0, historyIndex + 1);
  history.push(cloneRows(rows));
  historyIndex = history.length - 1;
  localStorage.setItem(draftKey(), JSON.stringify(exportPayload()));
  render();
});

root.addEventListener("click", async (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>("button");
  if (!button || button.classList.contains("board-cell")) return;
  if (button.dataset.tool === "paint" || button.dataset.tool === "erase") {
    activeTool = button.dataset.tool;
    render();
    return;
  }
  const action = button.dataset.action;
  if (action === "undo" && historyIndex > 0) {
    historyIndex -= 1;
    rows = cloneRows(history[historyIndex]);
    localStorage.setItem(draftKey(), JSON.stringify(exportPayload()));
    lastValidatedRevision = "";
    render();
  } else if (action === "redo" && historyIndex < history.length - 1) {
    historyIndex += 1;
    rows = cloneRows(history[historyIndex]);
    localStorage.setItem(draftKey(), JSON.stringify(exportPayload()));
    lastValidatedRevision = "";
    render();
  } else if (action === "fill") {
    const constraints = buildCellConstraints(level);
    setRows(Array.from({ length: level.height }, (_, y) => Array.from({ length: level.width }, (_, x) => constraints.get(cellKey(x, y))?.blocked ? "." : "#").join("")));
  } else if (action === "minimal") {
    const constraints = buildCellConstraints(level);
    setRows(Array.from({ length: level.height }, (_, y) => Array.from({ length: level.width }, (_, x) => constraints.get(cellKey(x, y))?.required ? "#" : ".").join("")));
  } else if (action === "restore") {
    setRows(sourceRows);
    localStorage.removeItem(draftKey());
  } else if (action === "copy") {
    await navigator.clipboard.writeText(JSON.stringify(exportPayload(), null, 2));
    showToast("已复制棋盘 JSON");
  } else if (action === "download") {
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `block-out-level-${String(levelId).padStart(3, "0")}-board.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  } else if (action === "apply-code") {
    try {
      setRows(parseRowsPayload(JSON.parse(shapeCode.value)));
      showToast("文本轮廓已应用，尚未保存");
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  } else if (action === "import") {
    importFile.click();
  }
});

levelSelect.addEventListener("change", () => loadLevel(Number(levelSelect.value)));
validateButton.addEventListener("click", () => runSolver(false));
saveButton.addEventListener("click", () => runSolver(true));
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  try {
    setRows(parseRowsPayload(JSON.parse(await file.text())));
    showToast("JSON 已导入，尚未保存");
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error));
  } finally {
    importFile.value = "";
  }
});

window.addEventListener("keydown", (event) => {
  const editingText = event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement;
  if (!editingText && event.key.toLowerCase() === "b") { activeTool = "paint"; render(); }
  if (!editingText && event.key.toLowerCase() === "e") { activeTool = "erase"; render(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    root.querySelector<HTMLButtonElement>(`[data-action="${event.shiftKey ? "redo" : "undo"}"]`)?.click();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    root.querySelector<HTMLButtonElement>('[data-action="redo"]')?.click();
  }
});

const detectApi = async (): Promise<void> => {
  try {
    const response = await fetch("/__board-editor/status", { cache: "no-store" });
    apiAvailable = response.ok && (await response.json() as { ok?: boolean }).ok === true;
  } catch {
    apiAvailable = false;
  }
  render();
};

loadLevel(levelId);
void detectApi();
