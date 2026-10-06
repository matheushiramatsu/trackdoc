import assert from "node:assert/strict";
import test from "node:test";
import { sizeSlideLikeImage } from "./slideLayout.js";

test("slides compartilham a consulta da imagem e ignoram layouts antigos", async (t) => {
  const probes = [];
  const saved = Object.fromEntries(["Image", "window", "getComputedStyle"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  globalThis.Image = class {
    constructor() { probes.push(this); }
  };
  globalThis.window = { innerHeight: 960 };
  globalThis.getComputedStyle = () => ({ paddingLeft: "0", paddingRight: "0" });
  const slide = { type: "slide" };
  const demo = { steps: [{ type: "screen", image: "shared.png" }, slide] };
  const target = { style: {} };
  const stage = { clientWidth: 1000 };
  sizeSlideLikeImage(target, stage, demo, slide, (_, ref) => ref);
  sizeSlideLikeImage(target, stage, demo, slide, (_, ref) => ref);
  assert.equal(probes.length, 1);
  // Um resize durante o carregamento deve prevalecer sobre o layout anterior.
  stage.clientWidth = 500;
  sizeSlideLikeImage(target, stage, demo, slide, (_, ref) => ref);
  Object.assign(probes[0], { naturalWidth: 1000, naturalHeight: 500 });
  probes[0].onload();
  await Promise.resolve();
  assert.deepEqual(target.style, { width: "500px", height: "250px" });
  const second = { style: {} };
  sizeSlideLikeImage(second, stage, demo, slide, (_, ref) => ref);
  await Promise.resolve();
  assert.equal(probes.length, 1);
  assert.deepEqual(second.style, { width: "500px", height: "250px" });
  demo.steps[0].image = "old.png";
  sizeSlideLikeImage(target, stage, demo, slide, (_, ref) => ref);
  sizeSlideLikeImage(target, stage, { steps: [slide] }, slide, (_, ref) => ref);
  const fallback = { ...target.style };
  Object.assign(probes[1], { naturalWidth: 1000, naturalHeight: 1000 });
  probes[1].onload();
  await Promise.resolve();
  assert.deepEqual(target.style, fallback);
  demo.steps[0].image = "temporarily-unavailable.png";
  sizeSlideLikeImage(target, stage, demo, slide, (_, ref) => ref);
  probes[2].onerror();
  await Promise.resolve();
  sizeSlideLikeImage(target, stage, demo, slide, (_, ref) => ref);
  assert.equal(probes.length, 4, "uma falha de carregamento deve permitir nova tentativa");
});
