import assert from "node:assert/strict";
import test from "node:test";
import { bindImage } from "./store.js";

test("editar enquanto a imagem carrega mantém uma única atribuição de src", () => {
  let src = null;
  let assignments = 0;
  const img = {
    hidden: true, complete: false, naturalWidth: 0,
    classList: { add() {}, remove() {} },
    getAttribute: () => src,
    removeAttribute: () => { src = null; },
    set src(value) { src = value; assignments++; },
  };
  const first = [];
  const latest = [];
  bindImage(img, "screen.png", (ok) => first.push(ok));
  bindImage(img, "screen.png", (ok) => latest.push(ok));
  assert.equal(assignments, 1);
  img.complete = true;
  img.naturalWidth = 100;
  img.onload();
  assert.deepEqual(first, []);
  assert.deepEqual(latest, [true]);
  assert.equal(img.hidden, false);
  bindImage(img, "screen.png", (ok) => latest.push(ok));
  assert.equal(assignments, 1);
  assert.deepEqual(latest, [true, true]);
  bindImage(img, "another.png");
  assert.equal(assignments, 2);
});
