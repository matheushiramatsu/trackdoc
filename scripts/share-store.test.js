import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../api/lib/share-store.cjs", import.meta.url), "utf8");

function loadStore(meta, tourUrl = "https://store.example/tour.json") {
  const calls = [];
  const blob = {
    async get(path) {
      calls.push(["get", path]);
      return meta ? { stream: new Response(JSON.stringify(meta)).body } : null;
    },
    async head(path) { calls.push(["head", path]); return { url: tourUrl }; },
    async del(paths) { calls.push(["del", paths]); },
  };
  const context = {
    module: { exports: {} }, Response, console, process,
    require: (name) => name === "@vercel/blob" ? blob : require("../api/lib/share-crypto.cjs"),
  };
  vm.runInNewContext(source, context);
  return { store: context.module.exports, calls };
}

test("preview reutiliza meta validado sem consultar head ou ler meta novamente", async () => {
  const { store, calls } = loadStore({ createdAt: Date.now(), url: "https://store.example/published.json" });
  const gate = await store.releaseShareIfExpired("abcdefghijk");
  assert.equal(await store.resolveTourUrl("abcdefghijk", gate.meta), "https://store.example/published.json");
  assert.deepEqual(calls.map(([method]) => method), ["get"]);
});

test("meta sem URL usa head e não repete a leitura do meta", async () => {
  const { store, calls } = loadStore(null);
  const gate = await store.releaseShareIfExpired("abcdefghijk");
  assert.equal(await store.resolveTourUrl("abcdefghijk", gate.meta), "https://store.example/tour.json");
  assert.deepEqual(calls.map(([method]) => method), ["get", "head"]);
});

test("revogação envia os dois pathnames diretamente ao SDK", async () => {
  const { store, calls } = loadStore(null);
  await store.revokeShare("abcdefghijk");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "del");
  assert.deepEqual(Array.from(calls[0][1]), [store.tourPathname("abcdefghijk"), store.metaPathname("abcdefghijk")]);
});
