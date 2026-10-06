import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, "vendor", "tts");
await mkdir(target, { recursive: true });

for (const [source, destination] of [
  ["node_modules/kokoro-js/dist/kokoro.web.js", "kokoro.web.js"],
  ["node_modules/kokoro-js/LICENSE", "kokoro-LICENSE"],
  ["node_modules/espeak-ng/dist/espeak-ng.js", "espeak-ng.js"],
  ["node_modules/espeak-ng/dist/espeak-ng.wasm", "espeak-ng.wasm"],
  ["node_modules/espeak-ng/LICENSE", "espeak-ng-LICENSE"],
]) {
  await cp(join(root, source), join(target, destination));
}

console.log("Runtime local do Kokoro preparado em vendor/tts.");
