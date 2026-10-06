import { getLocale } from "./i18n.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

export const KOKORO_VOICES = [
  { id: "pf_dora", language: "pt-BR", phonemizerLanguage: "pt-br", labelKey: "kokoro.voice.ptDora" },
  { id: "pm_alex", language: "pt-BR", phonemizerLanguage: "pt-br", labelKey: "kokoro.voice.ptAlex" },
  { id: "pm_santa", language: "pt-BR", phonemizerLanguage: "pt-br", labelKey: "kokoro.voice.ptSanta" },
  { id: "ef_dora", language: "es-ES", phonemizerLanguage: "es", labelKey: "kokoro.voice.esDora" },
  { id: "em_alex", language: "es-ES", phonemizerLanguage: "es", labelKey: "kokoro.voice.esAlex" },
  { id: "em_santa", language: "es-ES", phonemizerLanguage: "es", labelKey: "kokoro.voice.esSanta" },
  { id: "af_heart", language: "en-US", phonemizerLanguage: "en-us", labelKey: "kokoro.voice.enHeart" },
  { id: "af_bella", language: "en-US", phonemizerLanguage: "en-us", labelKey: "kokoro.voice.enBella" },
  { id: "am_michael", language: "en-US", phonemizerLanguage: "en-us", labelKey: "kokoro.voice.enMichael" },
  { id: "bf_emma", language: "en-GB", phonemizerLanguage: "en-gb", labelKey: "kokoro.voice.enEmma" },
  { id: "bm_george", language: "en-GB", phonemizerLanguage: "en-gb", labelKey: "kokoro.voice.enGeorge" },
];

let ttsPromise = null;

export function defaultKokoroVoiceURI(locale = getLocale()) {
  if (locale === "es") return "ef_dora";
  if (locale === "en") return "af_heart";
  return "pf_dora";
}

export function kokoroVoice(voiceURI) {
  return KOKORO_VOICES.find((voice) => voice.id === voiceURI) || KOKORO_VOICES[0];
}

export function narrationLang(voiceURI) {
  return kokoroVoice(voiceURI).language;
}

export function splitPhonemes(phonemes, maxLength = 220) {
  const words = String(phonemes || "").trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  let chunk = "";
  for (const word of words) {
    const next = chunk ? `${chunk} ${word}` : word;
    if (chunk && next.length > maxLength) {
      chunks.push(chunk);
      chunk = word;
    } else {
      chunk = next;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

async function loadKokoro(onProgress) {
  if (!ttsPromise) {
    ttsPromise = (async () => {
      onProgress?.({ status: "loading-library" });
      const moduleUrl = new URL("../vendor/tts/kokoro.web.js", import.meta.url);
      const { KokoroTTS } = await import(moduleUrl.href);
      onProgress?.({ status: "downloading-model" });
      return KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (progress) => onProgress?.({ ...progress, status: "downloading-model" }),
      });
    })().catch((error) => {
      ttsPromise = null;
      throw error;
    });
  }
  return ttsPromise;
}

export async function phonemizeKokoroText(text, language) {
  const moduleUrl = new URL("../vendor/tts/espeak-ng.js", import.meta.url);
  const { default: ESpeakNg } = await import(moduleUrl.href);
  const safeText = String(text || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[¡¿]/g, "")
    .trim();
  const engine = await ESpeakNg({
    arguments: [
      "-v", language,
      "--ipa=3",
      "--phonout", "kokoro-phonemes.txt",
      "-q",
      "-f", "kokoro-input.txt",
    ],
    preRun: [(module) => module.FS.writeFile("kokoro-input.txt", safeText)],
  });
  return engine.FS.readFile("kokoro-phonemes.txt", { encoding: "utf8" })
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Não foi possível ler o áudio gerado."));
    reader.readAsDataURL(blob);
  });
}

/** Gera WAV localmente com Kokoro e vozes PT-BR, espanhol e inglês. */
export async function synthesizeKokoro({ text, voiceURI, rate = 1, onProgress } = {}) {
  const transcript = String(text || "").trim();
  if (!transcript) throw new Error("Escreva o texto da narração para gerar o áudio.");

  const voice = kokoroVoice(voiceURI);
  const tts = await loadKokoro(onProgress);
  onProgress?.({ status: "phonemizing" });
  const phonemes = await phonemizeKokoroText(transcript, voice.phonemizerLanguage);
  const parts = splitPhonemes(phonemes);
  if (!parts.length) throw new Error("O texto não produziu fonemas para a voz selecionada.");

  const clips = [];
  const speed = Math.min(1.4, Math.max(0.7, Number(rate) || 1));
  for (let index = 0; index < parts.length; index++) {
    onProgress?.({ status: "generating", current: index + 1, total: parts.length });
    const { input_ids } = tts.tokenizer(parts[index], { truncation: true });
    const audio = await tts.generate_from_ids(input_ids, { voice: voice.id, speed });
    clips.push(await blobToDataUrl(audio.toBlob()));
  }
  onProgress?.({ status: "ready" });
  return clips;
}

export const KOKORO_MODEL_ID = MODEL_ID;
export const KOKORO_MODEL_DOWNLOAD_MB = 95;
