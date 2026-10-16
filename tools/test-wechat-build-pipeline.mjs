import { execFile } from "node:child_process";
import { appendFile, readFile, rm, stat, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { wechatBuildManifestPath } from "../scripts/wechat-build-integrity.mjs";

const run = promisify(execFile);
const projectRoot = resolve(import.meta.dirname, "..");
const outputRelative = ".codex-temp/wechat-pipeline-test";
const output = resolve(projectRoot, outputRelative);
const manifestPath = wechatBuildManifestPath(output);
const environment = { ...process.env, WECHAT_OUTPUT_DIR: outputRelative };

const invoke = (script) => run(process.execPath, [script], {
  cwd: projectRoot,
  env: environment,
  windowsHide: true,
});

async function expectVerifyFailure(expectedMessage) {
  try {
    await invoke("tools/verify-wechat-project.mjs");
  } catch (error) {
    const outputText = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
    if (outputText.includes(expectedMessage)) return;
    throw new Error(`Verifier failed for the wrong reason:\n${outputText}`);
  }
  throw new Error(`Verifier unexpectedly passed; expected ${JSON.stringify(expectedMessage)}`);
}

await rm(output, { recursive: true, force: true });
await rm(manifestPath, { force: true });
try {
  await invoke("scripts/build-wechat.mjs");
  await stat(resolve(output, "project.private.config.json"));
  await invoke("tools/verify-wechat-project.mjs");

  // The DevTools-private display name is intentionally independent from the
  // release identity. Keep this probe isolated in .codex-temp and restore the
  // generated output with a clean rebuild before the integrity probes below.
  const privateConfigPath = resolve(output, "project.private.config.json");
  const privateConfig = JSON.parse(await readFile(privateConfigPath, "utf8"));
  privateConfig.projectname = "Local DevTools Display Name";
  await writeFile(privateConfigPath, `${JSON.stringify(privateConfig, null, 2)}\n`);
  await invoke("tools/verify-wechat-project.mjs");

  privateConfig.projectname = "   ";
  await writeFile(privateConfigPath, `${JSON.stringify(privateConfig, null, 2)}\n`);
  await expectVerifyFailure("project.private.config.json must contain a non-empty project name");

  privateConfig.projectname = "Local DevTools Display Name";
  await writeFile(privateConfigPath, `${JSON.stringify(privateConfig, null, 2)}\n`);
  await invoke("tools/verify-wechat-project.mjs");

  const releaseConfigPath = resolve(output, "project.config.json");
  const releaseConfig = JSON.parse(await readFile(releaseConfigPath, "utf8"));
  releaseConfig.projectname = "wrong-release-name";
  await writeFile(releaseConfigPath, `${JSON.stringify(releaseConfig, null, 2)}\n`);
  await expectVerifyFailure(`${outputRelative}/project.config.json: projectname`);

  await invoke("scripts/build-wechat.mjs");
  await invoke("tools/verify-wechat-project.mjs");

  await appendFile(resolve(output, "game.js"), "\n// tamper probe\n");
  await expectVerifyFailure("was changed after build");

  await invoke("scripts/build-wechat.mjs");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.sourceFingerprint = "0".repeat(64);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await expectVerifyFailure("is stale");

  console.log("WeChat clean-build, private-config bootstrap, output-integrity, and stale-source gates passed.");
} finally {
  await rm(output, { recursive: true, force: true });
  await rm(manifestPath, { force: true });
}
