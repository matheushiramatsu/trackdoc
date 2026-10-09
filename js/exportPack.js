import {
  encodeAssetPath,
  resolveImageSrc,
  ensureClickPoint,
  slugifyFilename,
} from "./store.js";
import {
  holdMs as resolveHoldMs,
  ensurePlayback,
  ensureNarration,
  playableNarrationClips,
  normalizeCaptionPlaybackRate,
  BG_VOLUME,
  BG_DUCK_VOLUME,
} from "./playback.js";
import { t, getLocale, HTML_LANG, standaloneMessages } from "./i18n.js";

const DRIVER_JS = "vendor/driver/driver.js.iife.js";
const DRIVER_CSS = "vendor/driver/driver.css";
const DRIVER_NOTICE = `/*!
 * Includes driver.js 1.3.6 — MIT License
 * Copyright (c) Kamran Ahmed
 * https://github.com/kamranahmedse/driver.js
 */`;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapePdfHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '\"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function pdfColor(value, fallback) {
  return /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(String(value || "")) ? value : fallback;
}

function pdfPercent(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}

/** Abre o diálogo de impressão com o guia já formatado para salvar como PDF. */
export function exportPdf(demo) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error(t("toast.pdfFail"));

  const theme = demo?.theme || {};
  const accent = pdfColor(theme.accent, "#2f6bff");
  const ink = pdfColor(theme.title, "#0a0a0f");
  const muted = pdfColor(theme.text, "#4a4a55");
  const surface = pdfColor(theme.popoverBg, "#ffffff");
  const steps = Array.isArray(demo?.steps) ? demo.steps : [];
  const fontUrl = new URL("vendor/fonts/geist-latin-wght-normal.woff2", document.baseURI).href;
  const fontExtUrl = new URL("vendor/fonts/geist-latin-ext-wght-normal.woff2", document.baseURI).href;
  const stepHtml = steps.map((step, index) => {
    const title = step?.popover?.title || step?.label || `${t("export.stepTitle")} ${index + 1}`;
    const description = step?.popover?.description || "";
    const src = step?.type === "slide" ? "" : resolveImageSrc(demo, step?.image);
    let image = "";
    if (src) {
      const clickPoint = step?.simulateClick === false ? null : ensureClickPoint(step);
      const clickMarker = clickPoint
        ? `<svg class="cursor-marker" style="left:${pdfPercent(clickPoint.x, 47)}%;top:${pdfPercent(clickPoint.y, 44)}%" viewBox="0 0 24 30" aria-hidden="true"><path d="M2 2v23l6.3-6.1 4.1 9 4-1.8-4.2-8.8H21L2 2Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M2 2v23l6.3-6.1 4.1 9 4-1.8-4.2-8.8H21L2 2Z" fill="#fff" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/></svg>`
        : "";
      image = `<div class="screen-frame"><img class="step-image" src="${escapePdfHtml(new URL(src, document.baseURI).href)}" alt="${escapePdfHtml(title)}">${clickMarker}</div>`;
    }
    return `<article class="step"><div class="step-heading"><span class="step-number">${String(index + 1).padStart(2, "0")}</span><h2>${escapePdfHtml(title)}</h2></div>${image}${description ? `<p>${escapePdfHtml(description).replace(/\n/g, "<br>")}</p>` : ""}</article>`;
  }).join("");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="${escapePdfHtml(HTML_LANG)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapePdfHtml(demo?.name || t("export.pdfTitle"))}</title><style>
    @font-face{font-family:Geist;font-style:normal;font-weight:100 900;src:url("${fontExtUrl}") format("woff2");font-display:swap;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
    @font-face{font-family:Geist;font-style:normal;font-weight:100 900;src:url("${fontUrl}") format("woff2");font-display:swap;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
    :root{font-family:Geist,Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:${ink};background:${surface};font-synthesis:none}
    *{box-sizing:border-box}body{max-width:850px;margin:0 auto;padding:52px 48px;color:${ink};font-size:11pt;line-height:1.55}
    header{border-bottom:3px solid ${accent};padding-bottom:22px;margin-bottom:30px}header p{margin:0 0 8px;color:${accent};font-size:9pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    h1{font-size:27pt;line-height:1.15;letter-spacing:-.04em;margin:0 0 8px}header small{color:${muted};font-size:10pt}
    .step{break-inside:avoid;margin:0 0 30px;padding:0 0 24px;border-bottom:1px solid #dcdcd6}.step-heading{display:flex;align-items:baseline;gap:12px;margin-bottom:12px}
    .step-number{color:${accent};font-size:10pt;font-weight:700;font-variant-numeric:tabular-nums}.step h2{font-size:16pt;line-height:1.25;margin:0;letter-spacing:-.02em}
    .step p{color:${muted};margin:12px 0 0;white-space:normal}.screen-frame{position:relative;display:table;width:fit-content;max-width:100%;margin:0 auto;line-height:0}.step-image{display:block;width:auto;max-width:100%;max-height:8.2in;height:auto;border:1px solid #dcdcd6;border-radius:6px;background:#fff}
    .cursor-marker{position:absolute;width:14px;height:18px;overflow:visible;pointer-events:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
    @page{size:A4;margin:16mm 15mm} @media print{body{max-width:none;padding:0;background:${surface};-webkit-print-color-adjust:exact;print-color-adjust:exact}header{break-after:avoid}.step{break-inside:avoid}}
  </style></head><body><header><p>${escapePdfHtml(t("export.pdfTitle"))}</p><h1>${escapePdfHtml(demo?.name || t("export.pdfTitle"))}</h1><small>${escapePdfHtml(t("export.pdfStepCount", { n: steps.length }))}</small></header>${stepHtml}</body></html>`);
  printWindow.document.close();

  const startPrint = async () => {
    await Promise.all(Array.from(printWindow.document.images, (image) => image.decode().catch(() => {})));
    await printWindow.document.fonts?.ready;
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.readyState === "complete") startPrint();
  else printWindow.addEventListener("load", startPrint, { once: true });
  printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(t("err.loadFail", { url }));
  return res.text();
}

async function fetchTextSoft(url) {
  try {
    return await fetchText(url);
  } catch {
    return "";
  }
}

/**
 * Copia o demo com screenshots em data URL (arquivo HTML único).
 */
export async function embedImagesInDemo(demo, onProgress) {
  const next = structuredClone(demo);
  if (!next.customImages) next.customImages = {};

  const refs = [
    ...new Set(
      (next.steps || [])
        .map((s) => s.image)
        .filter((ref) => ref && !ref.startsWith("data:"))
    ),
  ];

  const cache = new Map();
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    onProgress?.(t("export.packImage", { i: i + 1, n: refs.length }));
    if (ref.startsWith("custom:")) {
      const id = ref.slice(7);
      cache.set(ref, next.customImages[id]?.dataUrl || "");
      continue;
    }
    const src = encodeAssetPath(ref);
    const res = await fetch(src);
    if (!res.ok) {
      cache.set(ref, "");
      continue;
    }
    const blob = await res.blob();
    cache.set(ref, await blobToDataUrl(blob));
  }

  for (const step of next.steps) {
    if (step.image && cache.has(step.image)) {
      step.image = cache.get(step.image);
    }
  }
  next.customImages = {};
  return next;
}

function standaloneHtmlShell({ css, driverJs, playerJs, demoJson, appearance, projectName }) {
  const mode = appearance === "social" ? "social" : "documento";
  const themeColor = mode === "social" ? "#191919" : "#1732FF";
  return `<!DOCTYPE html>
<html lang="${HTML_LANG[getLocale()] || "en"}" data-appearance="${mode}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="${themeColor}" />
  <title>${escapePdfHtml(projectName || "TrackDoc")}</title>
  <style>
${css}
  </style>
</head>
<body class="standalone">
  <header class="topbar">
    <div class="topbar-brand">
      <span class="topbar-title">${escapePdfHtml(projectName || "")}</span>
    </div>
  </header>
  <main id="view-player" class="view view-player">
    <div class="player-toolbar">
      <button type="button" class="btn btn-ghost" id="btn-play">${t("player.browse")}</button>
      <button type="button" class="btn btn-primary" id="btn-watch">${t("player.watch")}</button>
      <button type="button" class="btn btn-ghost" id="btn-restart">${t("player.restart")}</button>
      <button type="button" class="btn btn-ghost" id="btn-stop">${t("player.stop")}</button>
      <label class="checkbox player-autoplay">
        <input type="checkbox" id="chk-autoplay" checked />
        ${t("player.autoplay")}
      </label>
      <label class="player-autoplay">${t("player.startAt")}
        <select id="start-step"></select>
      </label>
      <span class="player-progress" id="player-progress">${t("player.ready")}</span>
    </div>
    <div class="player-stage" id="player-stage">
      <div class="player-frame" id="player-frame">
        <img id="player-image" alt="Demo" hidden />
        <div class="image-missing" id="player-missing" hidden>${t("player.missing")}</div>
        <div class="slide-card player-slide" id="player-slide" hidden>
          <button type="button" class="slide-card-close" id="player-slide-close" aria-label="${t("canvas.close")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <p class="slide-kicker" id="player-slide-kicker"></p>
          <h2 id="player-slide-title"></h2>
          <p id="player-slide-body"></p>
          <button type="button" class="slide-card-play" id="player-slide-play" aria-label="${t("canvas.play")}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="player-hotspot" id="player-hotspot"></div>
        <div class="player-click-point" id="player-click-point" hidden></div>
        <div class="click-fx" id="click-fx" hidden aria-hidden="true">
          <span class="click-fx-ring"></span>
          <span class="click-fx-ring click-fx-ring-2"></span>
          <span class="click-fx-burst"></span>
        </div>
        <div class="sim-cursor" id="sim-cursor" hidden></div>
        <div class="caption-bar" id="player-caption" hidden></div>
      </div>
    </div>
  </main>
  <div class="toast" id="toast" hidden></div>
  <script>window.INTERACTIVE_DEMO = ${demoJson};</script>
  <script>window.__GF_I18N = ${JSON.stringify(standaloneMessages())};</script>
  <script>${DRIVER_NOTICE}
${driverJs}</script>
  <script>${playerJs}</script>
</body>
</html>
`;
}

export async function exportStandaloneHtml(demo, { onProgress } = {}) {
  onProgress?.(t("export.readStyles"));
  const [themeCss, appCss, driverCss, driverJs, playerJs] = await Promise.all([
    fetchText("css/theme.css"),
    fetchText("css/app.css"),
    fetchTextSoft(DRIVER_CSS),
    fetchTextSoft(DRIVER_JS),
    fetchText("js/standalonePlayer.js"),
  ]);

  if (!driverJs) {
    throw new Error(t("err.driverMissing"));
  }

  const embedded = await embedImagesInDemo(demo, onProgress);
  const demoJson = JSON.stringify(embedded).replace(/</g, "\\u003c");
  const appearance =
    embedded?.theme?.appearance ||
    (embedded?.theme?.presetId === "social" ? "social" : "documento");
  const extra = `
body.standalone .view-player { height: calc(100% - 56px); display: flex; }
body.standalone .topbar-title { font-size: 0.78rem; }
`;
  const css = [driverCss, themeCss, appCss, extra].filter(Boolean).join("\n");
  const html = standaloneHtmlShell({
    css,
    driverJs,
    playerJs,
    demoJson,
    appearance,
    projectName: demo?.name,
  });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, `${slugifyFilename(demo?.name, "demo")}.html`);
  return blob.size;
}

function pickRecorderMime() {
  const candidates = [
    "video/mp4;codecs=avc1.42001f",
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function sceneTiming(step, demo) {
  ensurePlayback(demo);
  const read = resolveHoldMs(step, demo);
  const hasClick = step.type !== "slide" && step.simulateClick !== false;
  const cursorStart = hasClick ? read : 0;
  const cursorEnd = hasClick ? cursorStart + 550 : 0;
  const clickEnd = hasClick ? cursorEnd + 400 : 0;
  const holdEnd = hasClick ? clickEnd : read;
  return { cursorStart, cursorEnd, clickEnd, holdEnd };
}

function exportStepFrames(step, demo, fps) {
  const timing = sceneTiming(step, demo);
  const frameMs = 1000 / fps;
  let frames = 0;
  for (let t = 0; t <= timing.holdEnd; t += frameMs) frames += 1;
  return { timing, frames, seconds: frames / fps };
}

function waitMs(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException(t("export.cancelled"), "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

async function loadDemoImages(demo, onProgress) {
  const steps = demo.steps || [];
  onProgress?.(t("export.loadScreens"));
  const images = [];
  const cache = new Map();
  for (let i = 0; i < steps.length; i++) {
    const src = steps[i].type === "slide" ? "" : resolveImageSrc(demo, steps[i].image);
    if (!cache.has(src)) cache.set(src, loadImage(src));
    images.push(await cache.get(src));
  }
  return images;
}

async function decodeExportClip(ctx, url, cache) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(t("err.audioRead"));
  const raw = await res.arrayBuffer();
  const audio = await ctx.decodeAudioData(raw);
  cache.set(url, audio);
  return audio;
}

/**
 * Monta a trilha do vídeo: narração de cada passo no início do passo e fundo em loop.
 * @returns {Promise<AudioBuffer|null>}
 */
async function renderExportAudio(demo) {
  ensurePlayback(demo);
  ensureNarration(demo);
  const steps = demo.steps || [];
  const speak = demo.narration.enabled !== false;
  const sampleRate = 48000;
  let cursor = 0;
  const placements = [];
  for (const step of steps) {
    const span = exportStepFrames(step, demo, 30);
    placements.push({
      start: cursor,
      clips: speak ? playableNarrationClips(step, demo) : [],
      rate: normalizeCaptionPlaybackRate(step?.narrationAudio?.playbackRate),
    });
    cursor += span.seconds;
  }
  const duration = cursor + 0.6;
  const bgUrl = demo.narration.background?.dataUrl || "";
  if (!bgUrl && placements.every((place) => !place.clips.length)) return null;
  if (typeof OfflineAudioContext === "undefined") return null;

  const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const cache = new Map();
  const windows = [];

  for (const place of placements) {
    let at = place.start;
    for (const url of place.clips) {
      const buffer = await decodeExportClip(ctx, url, cache);
      const span = buffer.duration / place.rate;
      windows.push([at, at + span]);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = place.rate;
      src.connect(ctx.destination);
      src.start(at);
      at += span;
    }
  }

  if (bgUrl) {
    const buffer = await decodeExportClip(ctx, bgUrl, cache);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(BG_VOLUME, 0);
    for (const [from, to] of windows) {
      gain.gain.setValueAtTime(BG_DUCK_VOLUME, from);
      gain.gain.setValueAtTime(BG_VOLUME, to);
    }
    gain.connect(ctx.destination);
    let at = 0;
    while (at < duration - 0.01) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gain);
      src.start(at);
      at += buffer.duration;
    }
  }

  return ctx.startRendering();
}

async function canEncodeAac(audioBuffer) {
  if (typeof AudioEncoder === "undefined" || !audioBuffer) return false;
  try {
    const { supported } = await AudioEncoder.isConfigSupported({
      codec: "mp4a.40.2",
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      bitrate: 128_000,
    });
    return Boolean(supported);
  } catch {
    return false;
  }
}

async function encodeAacTrack(muxer, audioBuffer, signal) {
  let encodeError = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (err) => {
      encodeError = err;
    },
  });
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  encoder.configure({
    codec: "mp4a.40.2",
    sampleRate,
    numberOfChannels: channels,
    bitrate: 128_000,
  });

  const frameCount = 1024;
  const planes = [];
  for (let channel = 0; channel < channels; channel += 1) {
    planes.push(audioBuffer.getChannelData(channel));
  }
  for (let offset = 0; offset < audioBuffer.length; offset += frameCount) {
    if (signal?.aborted) throw new DOMException(t("export.cancelled"), "AbortError");
    if (encodeError) throw encodeError;
    const planar = new Float32Array(channels * frameCount);
    const available = Math.min(frameCount, audioBuffer.length - offset);
    for (let channel = 0; channel < channels; channel += 1) {
      planar.set(planes[channel].subarray(offset, offset + available), channel * frameCount);
    }
    const data = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: frameCount,
      numberOfChannels: channels,
      timestamp: Math.round((offset / sampleRate) * 1_000_000),
      data: planar,
    });
    encoder.encode(data);
    data.close();
    while (encoder.encodeQueueSize > 8) {
      await waitMs(8, signal);
      if (encodeError) throw encodeError;
    }
  }
  await encoder.flush();
  encoder.close();
  if (encodeError) throw encodeError;
}

async function canUseWebCodecsMp4(width, height) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return false;
  const codecs = ["avc1.4d0028", "avc1.640028", "avc1.420028", "avc1.42001f"];
  for (const codec of codecs) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 8_000_000,
        framerate: 30,
      });
      if (supported) return codec;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function exportVideoWebCodecs(demo, { onProgress, canvas, signal, images, codec, audioBuffer }) {
  const { Muxer, ArrayBufferTarget } = await import("../vendor/mp4-muxer/mp4-muxer.mjs");
  const steps = demo.steps || [];
  const W = 1920;
  const H = 1080;
  const fps = 30;
  const frameUs = Math.round(1_000_000 / fps);
  const cvs = canvas || document.createElement("canvas");
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext("2d", { willReadFrequently: true });

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: W, height: H },
    audio: audioBuffer
      ? {
          codec: "aac",
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
        }
      : undefined,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  let encodeError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encodeError = err;
    },
  });
  encoder.configure({
    codec: codec || "avc1.4d0028",
    width: W,
    height: H,
    bitrate: 8_000_000,
    framerate: fps,
  });

  let frameIndex = 0;
  const theme = demo.theme || {};

  async function encodeCanvasFrame(keyFrame) {
    if (signal?.aborted) throw new DOMException(t("export.cancelled"), "AbortError");
    if (encodeError) throw encodeError;
    while (encoder.encodeQueueSize > 8) {
      await waitMs(8, signal);
      if (encodeError) throw encodeError;
    }
    const frame = new VideoFrame(cvs, {
      timestamp: frameIndex * frameUs,
      duration: frameUs,
    });
    encoder.encode(frame, { keyFrame: Boolean(keyFrame) });
    frame.close();
    frameIndex += 1;
  }

  for (let i = 0; i < steps.length; i++) {
    if (signal?.aborted) throw new DOMException(t("export.cancelled"), "AbortError");
    const step = steps[i];
    const span = exportStepFrames(step, demo, fps);
    const timing = span.timing;
    onProgress?.(t("export.encodeStep", { i: i + 1, n: steps.length }));
    for (let frame = 0; frame < span.frames; frame += 1) {
      // why: não chamar de `t` — sombreia a i18n e quebra renderFrame (t is not a function)
      const at = frame * (1000 / fps);
      const scene = {
        step,
        index: i,
        total: steps.length,
        img: images[i],
        at,
        ...timing,
      };
      renderFrame(ctx, scene, theme);
      await encodeCanvasFrame(frameIndex % fps === 0);
    }
  }

  // cauda curta no último frame
  for (let i = 0; i < Math.round(fps * 0.6); i++) {
    await encodeCanvasFrame(false);
  }

  await encoder.flush();
  encoder.close();
  if (encodeError) throw encodeError;
  if (audioBuffer) {
    onProgress?.(t("export.encodeNarration"));
    await encodeAacTrack(muxer, audioBuffer, signal);
  }
  muxer.finalize();

  const blob = new Blob([target.buffer], { type: "video/mp4" });
  if (!blob.size) throw new Error(t("err.emptyRecording"));
  downloadBlob(blob, `${slugifyFilename(demo?.name, "demo")}.mp4`);
  return { size: blob.size, ext: "mp4" };
}

async function exportVideoMediaRecorder(demo, { onProgress, canvas, signal, images, audioBuffer }) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error(t("err.noVideoSupport"));
  }
  const mime = pickRecorderMime();
  if (!mime) {
    throw new Error(t("err.noVideoFormat"));
  }

  const steps = demo.steps || [];
  const W = 1920;
  const H = 1080;
  const cvs = canvas || document.createElement("canvas");
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext("2d");

  let audioCtx = null;
  let audioSource = null;
  const videoStream = cvs.captureStream(30);
  let stream = videoStream;
  if (audioBuffer && typeof AudioContext !== "undefined") {
    audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();
    audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(dest);
    stream = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  }
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 8_000_000,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  let scene = {
    step: steps[0],
    index: 0,
    total: steps.length,
    img: images[0],
    at: 0,
    cursorEnd: 1,
    clickEnd: 1,
    holdEnd: 1,
  };
  let looping = true;

  function loop() {
    if (!looping) return;
    renderFrame(ctx, scene, demo.theme || {});
    requestAnimationFrame(loop);
  }
  loop();
  audioSource?.start();
  recorder.start(200);

  try {
    for (let i = 0; i < steps.length; i++) {
      if (signal?.aborted) throw new DOMException(t("export.cancelled"), "AbortError");
      const step = steps[i];
      const span = exportStepFrames(step, demo, 30);
      const timing = span.timing;
      scene = {
        step,
        index: i,
        total: steps.length,
        img: images[i],
        at: 0,
        ...timing,
      };
      onProgress?.(t("export.recordStep", { i: i + 1, n: steps.length }));
      const t0 = performance.now();
      while (performance.now() - t0 < span.seconds * 1000) {
        if (signal?.aborted) throw new DOMException(t("export.cancelled"), "AbortError");
        scene.at = performance.now() - t0;
        await waitMs(16, signal);
      }
      scene.at = timing.holdEnd;
    }
    await waitMs(600, signal);
  } finally {
    looping = false;
    if (recorder.state !== "inactive") recorder.stop();
    audioCtx?.close();
  }

  await stopped;
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mime.split(";")[0] });
  if (!blob.size) throw new Error(t("err.emptyRecording"));
  downloadBlob(blob, `${slugifyFilename(demo?.name, "demo")}.${ext}`);
  return { size: blob.size, ext };
}

export async function exportVideo(demo, { onProgress, canvas, signal } = {}) {
  const steps = demo.steps || [];
  if (!steps.length) throw new Error(t("err.noStepsRecord"));

  const images = await loadDemoImages(demo, onProgress);
  onProgress?.(t("export.prepNarration"));
  const audioBuffer = await renderExportAudio(demo);
  const W = 1920;
  const H = 1080;

  const codec = await canUseWebCodecsMp4(W, H);
  const aac = await canEncodeAac(audioBuffer);
  if (codec && (!audioBuffer || aac)) {
    try {
      onProgress?.(t("export.encodeMp4"));
      return await exportVideoWebCodecs(demo, { onProgress, canvas, signal, images, codec, audioBuffer });
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      console.warn("WebCodecs MP4 falhou, tentando MediaRecorder", err);
      onProgress?.(t("export.mp4Fallback"));
    }
  }

  return exportVideoMediaRecorder(demo, { onProgress, canvas, signal, images, audioBuffer });
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function containRect(imgW, imgH, boxX, boxY, boxW, boxH) {
  if (!imgW || !imgH) return { x: boxX, y: boxY, w: boxW, h: boxH };
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

function addRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  addRoundRect(ctx, x, y, w, h, r);
}

function drawCursor(ctx, x, y, pressed) {
  ctx.save();
  ctx.translate(x, y);
  if (pressed) ctx.scale(0.86, 0.86);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(6, 18);
  ctx.lineTo(10, 12);
  ctx.lineTo(18, 14);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.4;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hexRgb(hex) {
  const h = String(hex || "#1732FF").replace("#", "");
  if (h.length !== 6) return { r: 23, g: 50, b: 255 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function measurePopover(ctx, step, maxW) {
  ctx.font = "400 14px Segoe UI, Helvetica Neue, Arial, sans-serif";
  const lines = wrapText(ctx, step.popover?.description || "", maxW - 36).slice(0, 8);
  const h = 22 + 28 + 10 + lines.length * 20 + 56;
  return { w: maxW, h: Math.max(140, h), lines };
}

function layoutPopover(hs, side, align, pw, ph, bounds, gap = 16) {
  const cx = hs.x + hs.w / 2;
  const cy = hs.y + hs.h / 2;
  let x;
  let y;
  if (side === "right") {
    x = hs.x + hs.w + gap;
    y = align === "start" ? hs.y : align === "end" ? hs.y + hs.h - ph : cy - ph / 2;
  } else if (side === "left") {
    x = hs.x - gap - pw;
    y = align === "start" ? hs.y : align === "end" ? hs.y + hs.h - ph : cy - ph / 2;
  } else if (side === "top") {
    y = hs.y - gap - ph;
    x = align === "start" ? hs.x : align === "end" ? hs.x + hs.w - pw : cx - pw / 2;
  } else {
    y = hs.y + hs.h + gap;
    x = align === "start" ? hs.x : align === "end" ? hs.x + hs.w - pw : cx - pw / 2;
  }

  const minX = bounds.x + 10;
  const minY = bounds.y + 10;
  const maxX = bounds.x + bounds.w - pw - 10;
  const maxY = bounds.y + bounds.h - ph - 10;
  if (x > maxX && side === "right") {
    x = hs.x - gap - pw;
    side = "left";
  } else if (x < minX && side === "left") {
    x = hs.x + hs.w + gap;
    side = "right";
  }
  if (y > maxY && side === "bottom") {
    y = hs.y - gap - ph;
    side = "top";
  } else if (y < minY && side === "top") {
    y = hs.y + hs.h + gap;
    side = "bottom";
  }
  x = Math.max(minX, Math.min(x, maxX));
  y = Math.max(minY, Math.min(y, maxY));
  return { x, y, side };
}

function drawPopoverArrow(ctx, box, side, bg, hs) {
  const size = 10;
  ctx.fillStyle = bg;
  ctx.beginPath();
  if (side === "bottom") {
    const ax = Math.max(box.x + 22, Math.min(hs.x + hs.w / 2, box.x + box.w - 22));
    ctx.moveTo(ax - size, box.y + 1);
    ctx.lineTo(ax, box.y - size);
    ctx.lineTo(ax + size, box.y + 1);
  } else if (side === "top") {
    const ax = Math.max(box.x + 22, Math.min(hs.x + hs.w / 2, box.x + box.w - 22));
    ctx.moveTo(ax - size, box.y + box.h - 1);
    ctx.lineTo(ax, box.y + box.h + size);
    ctx.lineTo(ax + size, box.y + box.h - 1);
  } else if (side === "right") {
    const ay = Math.max(box.y + 22, Math.min(hs.y + hs.h / 2, box.y + box.h - 22));
    ctx.moveTo(box.x + 1, ay - size);
    ctx.lineTo(box.x - size, ay);
    ctx.lineTo(box.x + 1, ay + size);
  } else {
    const ay = Math.max(box.y + 22, Math.min(hs.y + hs.h / 2, box.y + box.h - 22));
    ctx.moveTo(box.x + box.w - 1, ay - size);
    ctx.lineTo(box.x + box.w + size, ay);
    ctx.lineTo(box.x + box.w - 1, ay + size);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPopover(ctx, theme, step, index, total, hs, bounds) {
  const bg = theme.popoverBg || "#ffffff";
  const titleC = theme.title || "#1a1a1a";
  const textC = theme.text || "#3d3d3d";
  const muted = "#6b7280";
  const sidePref = step.popover?.side || "bottom";
  const align = step.popover?.align || "center";
  const measured = measurePopover(ctx, step, 360);
  const pos = layoutPopover(hs, sidePref, align, measured.w, measured.h, bounds);
  const box = { x: pos.x, y: pos.y, w: measured.w, h: measured.h };

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, box.x, box.y, box.w, box.h, 10);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, box.x, box.y, box.w, box.h, 10);
  ctx.fillStyle = bg;
  ctx.fill();
  drawPopoverArrow(ctx, box, pos.side, bg, hs);

  const title = step.popover?.title || step.label || "";
  ctx.fillStyle = titleC;
  ctx.font = "700 16px Segoe UI, Helvetica Neue, Arial, sans-serif";
  ctx.fillText(title, box.x + 18, box.y + 32);

  ctx.fillStyle = textC;
  ctx.font = "400 14px Segoe UI, Helvetica Neue, Arial, sans-serif";
  measured.lines.forEach((line, i) => {
    ctx.fillText(line, box.x + 18, box.y + 58 + i * 20);
  });

  const fy = box.y + box.h - 40;
  ctx.strokeStyle = muted;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(box.x + 32, fy + 8);
  ctx.lineTo(box.x + 20, fy + 8);
  ctx.moveTo(box.x + 26, fy + 2);
  ctx.lineTo(box.x + 20, fy + 8);
  ctx.lineTo(box.x + 26, fy + 14);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = "500 13px Segoe UI, Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(t("player.of", { current: index + 1, total }), box.x + box.w / 2, fy + 12);
  ctx.textAlign = "left";

  const btnLabel = index >= total - 1 ? t("player.done") : t("player.next");
  ctx.font = "700 13px Segoe UI, Helvetica Neue, Arial, sans-serif";
  const btnW = Math.max(88, ctx.measureText(btnLabel).width + 28);
  const btnH = 32;
  const btnX = box.x + box.w - 16 - btnW;
  const btnY = fy - 8;
  roundRect(ctx, btnX, btnY, btnW, btnH, 8);
  ctx.fillStyle = "#111827";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(btnLabel, btnX + btnW / 2, btnY + 21);
  ctx.textAlign = "left";
}

function renderFrame(ctx, scene, theme) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const accent = theme.accent || "#1732FF";
  const rgb = hexRgb(accent);
  const { step, index, total, img, cursorStart = 0, cursorEnd, clickEnd, holdEnd } = scene;
  const at = Number(scene.at ?? scene.t) || 0;

  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = accent;
  ctx.font = "800 26px Segoe UI, Helvetica Neue, Arial, sans-serif";
  ctx.fillText("Guia", 32, 38);
  ctx.fillStyle = "#fff";
  ctx.fillText("Flow", 98, 38);
  ctx.font = "500 16px Segoe UI, Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(t("player.narratedTour"), 248, 38);
  ctx.textAlign = "right";
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "600 16px Segoe UI, Helvetica Neue, Arial, sans-serif";
  ctx.fillText(`${index + 1} / ${total}`, W - 32, 38);
  ctx.textAlign = "left";

  const stage = { x: 24, y: 72, w: W - 48, h: H - 86 };
  let hs = { x: stage.x + stage.w / 2 - 80, y: stage.y + 80, w: 160, h: 80 };

  if (step.type === "slide") {
    const slide = containRect(16, 9, stage.x, stage.y, stage.w, stage.h);
    ctx.fillStyle = "#1f2937";
    roundRect(ctx, slide.x, slide.y, slide.w, slide.h, 16);
    ctx.fill();

    const align = step.layout?.align === "center" || step.layout?.align === "end" ? step.layout.align : "start";
    const valign = step.layout?.valign === "top" || step.layout?.valign === "bottom" ? step.layout.valign : "center";
    const padX = 40;
    const maxW = slide.w - padX * 2;
    ctx.textAlign = align === "center" ? "center" : align === "end" ? "right" : "left";
    const textX =
      align === "center" ? slide.x + slide.w / 2 : align === "end" ? slide.x + slide.w - padX : slide.x + padX;

    ctx.font = "700 36px Segoe UI, Helvetica Neue, Arial, sans-serif";
    const titleLines = wrapText(ctx, step.popover?.title || step.label || "", maxW).slice(0, 3);
    ctx.font = "400 22px Segoe UI, Helvetica Neue, Arial, sans-serif";
    const bodyLines = wrapText(ctx, step.popover?.description || "", maxW).slice(0, 8);
    const blockH = 15 + 16 + titleLines.length * 44 + (bodyLines.length ? 28 + bodyLines.length * 32 : 0);
    const innerTop = slide.y + 40;
    const innerH = slide.h - 96;
    let cursor =
      valign === "top" ? innerTop : valign === "bottom" ? innerTop + innerH - blockH : innerTop + (innerH - blockH) / 2;

    ctx.fillStyle = accent;
    ctx.font = "700 15px Segoe UI, Helvetica Neue, Arial, sans-serif";
    cursor += 15;
    ctx.fillText("CENA " + step.scene, textX, cursor);
    cursor += 16;
    ctx.fillStyle = "#fff";
    ctx.font = "700 36px Segoe UI, Helvetica Neue, Arial, sans-serif";
    titleLines.forEach((line) => {
      cursor += 36;
      ctx.fillText(line, textX, cursor);
      cursor += 8;
    });
    if (bodyLines.length) cursor += 20;
    ctx.fillStyle = "#d1d5db";
    ctx.font = "400 22px Segoe UI, Helvetica Neue, Arial, sans-serif";
    bodyLines.forEach((line) => {
      cursor += 22;
      ctx.fillText(line, textX, cursor);
      cursor += 10;
    });
    ctx.textAlign = "left";
    hs = slide;
  } else if (img) {
    const rect = containRect(img.naturalWidth, img.naturalHeight, stage.x, stage.y, stage.w, stage.h);
    ctx.fillStyle = "#111";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);

    const raw = step.hotspot || { x: 40, y: 40, w: 12, h: 8 };
    hs = {
      x: rect.x + (raw.x / 100) * rect.w,
      y: rect.y + (raw.y / 100) * rect.h,
      w: (raw.w / 100) * rect.w,
      h: (raw.h / 100) * rect.h,
    };
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    addRoundRect(ctx, hs.x, hs.y, hs.w, hs.h, 4);
    ctx.fill("evenodd");
    ctx.restore();

    if (step.simulateClick !== false) {
      const cp = ensureClickPoint(step);
      const tx = rect.x + (cp.x / 100) * rect.w;
      const ty = rect.y + (cp.y / 100) * rect.h;
      const sx = Math.max(rect.x + 16, tx - 90);
      const sy = Math.max(rect.y + 16, ty - 70);
      const span = Math.max(1, cursorEnd - cursorStart);
      const p = Math.min(1, Math.max(0, (at - cursorStart) / span));
      const ease = 1 - Math.pow(1 - p, 3);
      const cx = sx + (tx - sx) * ease;
      const cy = sy + (ty - sy) * ease;
      if (at >= cursorStart) {
        const pressed = at >= cursorEnd && at < clickEnd;
        drawCursor(ctx, cx, cy, pressed);
      }

      if (at >= cursorEnd && at < clickEnd + 350) {
        const rt = (at - cursorEnd) / 700;
        const radius = 18 + rt * 56;
        ctx.beginPath();
        ctx.arc(tx, ty, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, 0.9 - rt)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  if (step.type !== "slide") {
    drawPopover(ctx, theme, step, index, total, hs, { x: 8, y: 56, w: W - 16, h: H - 64 });
  }

  const caption = String(step.caption || "").trim();
  if (caption && step.showCaption !== false) {
    const maxW = stage.w - 48;
    ctx.font = "500 18px Segoe UI, Helvetica Neue, Arial, sans-serif";
    const lines = wrapText(ctx, caption, maxW).slice(0, 3);
    const boxH = 20 + lines.length * 24;
    const boxY = stage.y + stage.h - boxH - 16;
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    roundRect(ctx, stage.x + 16, boxY, stage.w - 32, boxH, 10);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    lines.forEach((line, i) => {
      ctx.fillText(line, stage.x + 32, boxY + 28 + i * 24);
    });
  }

  const progress = Math.min(1, at / holdEnd);
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - 6, W * ((index + progress) / total), 6);
}
