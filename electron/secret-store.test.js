const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createKeyStore } = require("./secret-store.js");

test("configurações confidenciais ficam cifradas e podem ser apagadas", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "trackdoc-secrets-"));
  const store = createKeyStore({
    directory,
    fileName: "llm-settings.bin",
    encrypt: (value) => Buffer.from(String(value).split("").reverse().join("")),
    decrypt: (buf) => Buffer.from(buf).toString("utf8").split("").reverse().join(""),
  });
  const payload = {
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "deepseek/deepseek-v4.1-flash",
    apiKey: "sk-or-v1-secretkey123456",
  };

  store.savePayload(payload);
  assert.equal(fs.readFileSync(store.file, "utf8").includes(payload.apiKey), false);
  assert.deepEqual(store.readPayload(), payload);
  store.clear();
  assert.equal(store.configured(), false);
  fs.rmSync(directory, { recursive: true, force: true });
});
