import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultKokoroVoiceURI,
  KOKORO_VOICES,
  narrationLang,
  phonemizeKokoroText,
  splitPhonemes,
} from "./kokoro.js";

test("Kokoro oferece vozes locais para português, espanhol e inglês", () => {
  assert.equal(defaultKokoroVoiceURI("pt"), "pf_dora");
  assert.equal(defaultKokoroVoiceURI("es"), "ef_dora");
  assert.equal(defaultKokoroVoiceURI("en"), "af_heart");
  assert.equal(narrationLang("pm_alex"), "pt-BR");
  assert.equal(narrationLang("ef_dora"), "es-ES");
  assert.equal(KOKORO_VOICES.some((voice) => voice.id === "pf_dora"), true);
});

test("divide fonemas longos sem cortar palavras", () => {
  const chunks = splitPhonemes("alpha beta gamma delta", 10);
  assert.deepEqual(chunks, ["alpha beta", "gamma", "delta"]);
  assert.equal(chunks.join(" "), "alpha beta gamma delta");
});

test("eSpeak local produz fonemas em português e espanhol", async () => {
  const portuguese = await phonemizeKokoroText("Olá, tudo bem?", "pt-br");
  const spanish = await phonemizeKokoroText("Hola, ¿cómo estás?", "es");
  assert.match(portuguese, /olˈa/);
  assert.match(spanish, /kˈomo/);
});
