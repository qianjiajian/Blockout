import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { build } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
// Explicit configuration: never overwrite dist or dist-wechat.
await build({ configFile: resolve(root, "vite.google-play.config.ts") });
