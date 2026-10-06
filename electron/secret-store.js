/**
 * Segredos do app desktop ficam cifrados num arquivo próprio, fora dos projetos exportados.
 */

const fs = require("fs");
const path = require("path");

function createKeyStore({ directory, encrypt, decrypt, fsImpl = fs, fileName = "secret.bin" }) {
  const file = path.join(directory, fileName);

  function exists() {
    return fsImpl.existsSync(file);
  }

  return {
    file,
    configured() {
      return exists();
    },
    save(apiKey) {
      fsImpl.mkdirSync(directory, { recursive: true });
      fsImpl.writeFileSync(file, encrypt(String(apiKey)));
    },
    /** Persiste um payload JSON cifrado (LLM: provider, baseUrl, model, apiKey). */
    savePayload(payload) {
      fsImpl.mkdirSync(directory, { recursive: true });
      fsImpl.writeFileSync(file, encrypt(JSON.stringify(payload)));
    },
    read() {
      if (!exists()) return "";
      return String(decrypt(fsImpl.readFileSync(file)) || "");
    },
    readPayload() {
      const raw = this.read();
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    clear() {
      if (exists()) fsImpl.unlinkSync(file);
    },
  };
}

module.exports = { createKeyStore };
