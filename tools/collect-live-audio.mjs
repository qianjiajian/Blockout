// Loopback-only, opt-in audio diagnostics. Never reads browser/player storage.
import { createServer } from "node:http";
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("playtest-results", "audio-live-20261007");
await mkdir(output, { recursive: true });
let sequence = 0;
let pending = Promise.resolve();
const origins = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);
const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !origins.has(origin)) { response.writeHead(403).end(); return; }
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  if (request.method === "GET" && request.url === "/health") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ status: "ready", received: sequence })); return;
  }
  if (request.method !== "POST" || request.url !== "/audio") { response.writeHead(404).end(); return; }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 256 * 1024) { response.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const record = { sequence: ++sequence, receivedAt: new Date().toISOString(), audio: payload };
    const json = JSON.stringify(record);
    pending = pending.then(async () => {
      await appendFile(resolve(output, "events.jsonl"), json + "\n", "utf8");
      await writeFile(resolve(output, "latest.json"), JSON.stringify(record, null, 2), "utf8");
    });
    await pending;
    response.writeHead(204).end();
  } catch {
    response.writeHead(400).end();
  }
});
server.listen(5199, "127.0.0.1", () => console.log(`Audio diagnostics: http://127.0.0.1:5199/health -> ${output}`));
