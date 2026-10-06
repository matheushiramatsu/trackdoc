import assert from "node:assert/strict";
import test from "node:test";
import { exportVideo } from "./exportPack.js";
import { t } from "./i18n.js";

test("exportação carrega cada screenshot uma vez e ignora imagens de slides", async (testContext) => {
  const keys = ["Image", "MediaRecorder", "VideoEncoder", "VideoFrame"];
  const saved = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  testContext.after(() => {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const loaded = [];
  globalThis.Image = class {
    set src(value) { loaded.push(value); queueMicrotask(() => this.onload()); }
  };
  for (const key of keys.slice(1)) globalThis[key] = undefined;
  const demo = {
    customImages: { same: { dataUrl: "screenshot.png" } },
    steps: [
      { type: "screen", image: "screenshot.png" },
      { type: "screen", image: "custom:same" },
      { type: "slide", image: "unused.png" },
      { type: "screen", image: "other.png" },
    ],
    narration: { enabled: false },
  };
  // A preparação real acontece antes da detecção de encoder no ambiente Node.
  await assert.rejects(exportVideo(demo), { message: t("err.noVideoSupport") });
  assert.deepEqual(loaded, ["screenshot.png", "other.png"]);
});
