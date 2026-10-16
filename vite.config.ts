import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { webRuntimeLevelProjectionPlugin } from "./tools/web-runtime-level-projection.mjs";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const boardShapesPath = resolve(projectRoot, "src/core/boardShapes.ts");
const backupDirectory = resolve(projectRoot, "tools/board-editor-backups");
const maximumPayloadBytes = 64 * 1024;

const isLoopbackRequest = (request: import("node:http").IncomingMessage): boolean => {
  const address = request.socket.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
};

const sendJson = (response: import("node:http").ServerResponse, status: number, body: unknown): void => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
};

const readRequestBody = async (request: import("node:http").IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maximumPayloadBytes) throw new Error("保存数据超过 64 KB 限制");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const boardEditorSavePlugin = (): Plugin => ({
  name: "block-out-board-editor-save",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if ((pathname === "/__board-editor/status" || pathname === "/__board-editor/save") && !isLoopbackRequest(request)) {
        sendJson(response, 403, { ok: false, error: "棋盘编辑器只允许本机访问" });
        return;
      }
      if (pathname === "/__board-editor/status" && request.method === "GET") {
        sendJson(response, 200, { ok: true });
        return;
      }
      if (pathname !== "/__board-editor/save" || request.method !== "POST") {
        next();
        return;
      }

      try {
        const payload = JSON.parse(await readRequestBody(request)) as {
          levelId?: unknown;
          rows?: unknown;
          width?: unknown;
          height?: unknown;
          minimumDrags?: unknown;
          dryRun?: unknown;
        };
        const levelId = Number(payload.levelId);
        const expectedWidth = Number(payload.width);
        const expectedHeight = Number(payload.height);
        const minimumDrags = Number(payload.minimumDrags);
        if (!Number.isInteger(levelId) || levelId < 1 || levelId > 100) throw new Error("levelId 必须是 1–100 的整数");
        if (!Number.isInteger(minimumDrags) || minimumDrags < 1 || minimumDrags > 100) throw new Error("minimumDrags 必须是 1–100 的整数");
        if (!Number.isInteger(expectedWidth) || expectedWidth < 1 || expectedWidth > 32
          || !Number.isInteger(expectedHeight) || expectedHeight < 1 || expectedHeight > 32) {
          throw new Error("width/height 必须是 1–32 的整数");
        }
        if (!Array.isArray(payload.rows) || !payload.rows.every((row) => typeof row === "string")) {
          throw new Error("rows 必须是字符串数组");
        }
        const rows = payload.rows as string[];
        if (!rows.length || rows.some((row) => /[^#.]/.test(row))) throw new Error("rows 只能包含 # 和 .，且不能为空");

        const source = await readFile(boardShapesPath, "utf8");
        const rowPattern = new RegExp(`^(\\s{2}${levelId}: )(\\[[^\\r\\n]*\\])(,)$`, "m");
        const rowMatch = source.match(rowPattern);
        if (!rowMatch) throw new Error(`项目文件中找不到第 ${levelId} 关轮廓`);
        if (rows.length !== expectedHeight || rows.some((row) => row.length !== expectedWidth)) {
          throw new Error(`第 ${levelId} 关轮廓必须保持 ${expectedWidth}×${expectedHeight}`);
        }
        if (!rows.some((row) => row.includes("#"))) throw new Error("棋盘不能完全为空");

        const parPattern = /export const BOARD_PAR_OVERRIDES: Record<number, number> = (\{[\s\S]*?\});/;
        const parMatch = source.match(parPattern);
        if (!parMatch) throw new Error("项目文件中找不到 BOARD_PAR_OVERRIDES");
        const parOverrides = JSON.parse(parMatch[1]) as Record<string, number>;
        parOverrides[String(levelId)] = minimumDrags;

        const nextRowsLiteral = JSON.stringify(rows);
        const nextParLiteral = JSON.stringify(parOverrides, null, 2);
        const updated = source
          .replace(rowPattern, `$1${nextRowsLiteral}$3`)
          .replace(parPattern, `export const BOARD_PAR_OVERRIDES: Record<number, number> = ${nextParLiteral};`);
        if (updated === source) throw new Error("轮廓与最少拖动数均未发生变化");

        if (payload.dryRun === true) {
          sendJson(response, 200, { ok: true, dryRun: true });
          return;
        }

        await mkdir(backupDirectory, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupName = `boardShapes-before-level-${String(levelId).padStart(3, "0")}-${stamp}.ts`;
        await writeFile(resolve(backupDirectory, backupName), source, "utf8");
        await writeFile(boardShapesPath, updated, "utf8");
        sendJson(response, 200, { ok: true, backup: `tools/board-editor-backups/${backupName}` });
      } catch (error) {
        sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  },
});

export default defineConfig({
  base: "./",
  plugins: [boardEditorSavePlugin(), webRuntimeLevelProjectionPlugin()],
  worker: { plugins: () => [webRuntimeLevelProjectionPlugin()] },
  test: {
    // The 100-level validation search is intentionally memory-bound. Running
    // chapter files sequentially in one worker thread keeps CI and WeChat
    // release checks stable. Threads also avoid the 60-second process-RPC
    // acknowledgement timeout hit by the exact Lv5/Lv7 searches on Windows.
    pool: "threads",
    minWorkers: 1,
    maxWorkers: 1,
    fileParallelism: false,
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      input: {
        game: resolve(projectRoot, "index.html"),
        boardEditor: resolve(projectRoot, "board-editor.html"),
      },
    },
  },
});
