import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase } from "./database.js";

function mockIdb(t) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "indexedDB", descriptor);
    else delete globalThis.indexedDB;
  });
  const requests = [];
  const transactions = [];
  const db = {
    closed: 0,
    close() { this.closed++; },
    transaction(stores, mode) {
      const tx = {
        stores, mode, error: null,
        abort() { this.aborted = true; queueMicrotask(() => this.onabort?.()); },
      };
      transactions.push(tx);
      queueMicrotask(() => { if (!tx.aborted) tx.oncomplete?.(); });
      return tx;
    },
  };
  globalThis.indexedDB = { open() { const req = {}; requests.push(req); return req; } };
  return { requests, transactions, db };
}

test("operações concorrentes compartilham conexão e retornam resultados após commit", async (t) => {
  const { requests, transactions, db } = mockIdb(t);
  const database = createDatabase("projects", 3, () => {});
  const first = database.run("projects", "readonly", () => ({ result: "first" }));
  const second = database.run(["projects", "history"], "readwrite", () => ({ result: "second" }));
  assert.equal(requests.length, 1);
  requests[0].result = db;
  requests[0].onsuccess();
  assert.deepEqual(await Promise.all([first, second]), ["first", "second"]);
  assert.equal(transactions.length, 2);
  assert.equal(db.closed, 0);
  db.onversionchange();
  assert.equal(db.closed, 1);
  const next = database.run("projects", "readonly", () => ({ result: "next" }));
  assert.equal(requests.length, 2);
  requests[1].result = db;
  requests[1].onsuccess();
  assert.equal(await next, "next");
});

test("falha ao abrir permite nova tentativa; callback inválido aborta a transação", async (t) => {
  const { requests, transactions, db } = mockIdb(t);
  const database = createDatabase("projects", 3, () => {});
  const first = database.run("projects", "readonly", () => {});
  const failed = assert.rejects(first, /open failed/);
  requests[0].error = new Error("open failed");
  requests[0].onerror();
  await failed;
  const next = database.run("projects", "readwrite", () => { throw new Error("bad write"); });
  requests[1].result = db;
  requests[1].onsuccess();
  await assert.rejects(next, /bad write/);
  assert.equal(transactions[0].aborted, true);
});
