const { app, BrowserWindow, BrowserView, ipcMain, session, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { createKeyStore } = require("./secret-store");

const ROOT = path.join(__dirname, "..");
const CONTENT_JS = path.join(ROOT, "extension", "content.js");
const DEMO_PAYLOAD = path.join(ROOT, "extension", "lib", "demo-payload.js");

let mainWindow = null;
let captureWindow = null;
let captureView = null;
let captureSession = emptySession();

function emptySession() {
  return { active: false, shots: [], projectName: "" };
}

function randId(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function trimTitle(title) {
  const text = String(title || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

function publicState(extra = {}) {
  const last = captureSession.shots[captureSession.shots.length - 1];
  return {
    ok: true,
    active: Boolean(captureSession.active),
    count: captureSession.shots.length,
    awaitingHotspot: Boolean(last?.awaitingHotspot),
    projectName: captureSession.projectName || "",
    ...extra,
  };
}

function broadcastState(state) {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send("capture:state", state);
  }
  if (captureView && !captureView.webContents.isDestroyed()) {
    captureView.webContents.send("capture:state", state);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "TrackDoc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(ROOT, "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => ({
    // why: exportação para PDF abre uma janela vazia e controlada para impressão.
    action: url === "about:blank" ? "allow" : "deny",
  }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = url.startsWith("file:") || url.startsWith("devtools:");
    if (!allowed) event.preventDefault();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (captureWindow && !captureWindow.isDestroyed()) captureWindow.close();
  });
}

function layoutCaptureView() {
  if (!captureWindow || !captureView) return;
  const [width, height] = captureWindow.getContentSize();
  const bar = 64;
  captureView.setBounds({ x: 0, y: bar, width, height: Math.max(100, height - bar) });
}

// Lido uma vez: a injeção roda a cada navegação e não deve bloquear o processo principal.
let contentScriptSource = null;

async function injectContentScript() {
  if (!captureView) return;
  contentScriptSource ??= await fs.promises.readFile(CONTENT_JS, "utf8");
  const source = contentScriptSource;
  await captureView.webContents.executeJavaScript(source, true);
  await captureView.webContents.executeJavaScript(
    `window.guiaDesktop && window.guiaDesktop.send({ type: "STATUS" })`,
    true
  ).catch(() => {});
}

function createCaptureWindow() {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.focus();
    return captureWindow;
  }

  captureWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    title: "Capturar — TrackDoc",
    webPreferences: {
      preload: path.join(__dirname, "preload-toolbar.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  captureView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, "preload-capture.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: "persist:capture",
    },
  });
  captureWindow.setBrowserView(captureView);
  layoutCaptureView();

  captureWindow.loadFile(path.join(__dirname, "capture.html"));
  captureView.webContents.loadURL("about:blank");

  captureWindow.on("resize", layoutCaptureView);
  captureWindow.on("closed", () => {
    captureWindow = null;
    captureView = null;
    captureSession = emptySession();
  });

  captureView.webContents.on("did-finish-load", () => {
    const url = captureView.webContents.getURL();
    if (/^https?:/i.test(url)) injectContentScript().catch(console.error);
  });

  return captureWindow;
}

async function loadDemoPayloadHelpers() {
  const mod = await import(pathToFileURL(DEMO_PAYLOAD).href);
  return mod;
}

async function hideOverlay() {
  if (!captureView) return;
  await captureView.webContents
    .executeJavaScript(
      `(() => {
        const host = document.querySelector("[data-guia-capture]");
        if (host) host.style.setProperty("visibility", "hidden", "important");
      })()`,
      true
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 40));
}

async function captureShot(meta, { withClick }) {
  if (!captureSession.active) return publicState({ ok: false, error: "A captura não está ativa." });
  if (!captureView) return publicState({ ok: false, error: "Janela de captura indisponível." });
  const url = captureView.webContents.getURL();
  if (!/^https?:/i.test(url)) {
    return publicState({ ok: false, error: "Abra uma página http ou https." });
  }

  await hideOverlay();
  let dataUrl;
  try {
    const image = await captureView.webContents.capturePage();
    const png = image.toPNG();
    dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return publicState({ ok: false, error: "Não foi possível fotografar esta página." });
  }

  const { pointFromClick } = await loadDemoPayloadHelpers();
  const stepNumber = captureSession.shots.length + 1;
  captureSession.shots.push({
    imageId: randId("img-"),
    stepId: randId("step-"),
      name: `passo-${stepNumber}.png`,
    label: trimTitle(meta?.title) || `Passo ${stepNumber}`,
    dataUrl,
    addedAt: Date.now(),
    clickPoint: withClick ? pointFromClick(meta) : null,
    awaitingHotspot: !withClick,
  });

  const state = publicState({
    status: withClick
      ? `Passo ${stepNumber} salvo com o clique.`
      : "Tela salva. Clique no elemento para marcar o destaque.",
  });
  broadcastState(state);
  return state;
}

async function markHotspot(meta) {
  const { pointFromClick } = await loadDemoPayloadHelpers();
  const last = captureSession.shots[captureSession.shots.length - 1];
  const point = pointFromClick(meta);
  if (!last || !point) return publicState({ ok: false, error: "Clique inválido." });
  last.clickPoint = point;
  last.awaitingHotspot = false;
  const state = publicState({ status: "Destaque marcado. Capture a próxima tela." });
  broadcastState(state);
  return state;
}

async function handlePageMessage(msg) {
  switch (msg?.type) {
    case "STATUS":
      return publicState();
    case "CAPTURE_FROM_PAGE":
      return captureShot(msg, { withClick: false });
    case "PAGE_CLICK": {
      const { nextClickAction } = await loadDemoPayloadHelpers();
      if (nextClickAction(captureSession.shots) === "mark") return markHotspot(msg);
      return captureShot(msg, { withClick: true });
    }
    case "UNDO": {
      if (!captureSession.shots.length) return publicState({ ok: false, error: "Nada para desfazer." });
      captureSession.shots.pop();
      const state = publicState({ status: "Último passo removido." });
      broadcastState(state);
      return state;
    }
    case "CANCEL": {
      captureSession = emptySession();
      const state = publicState({ show: false, status: "Captura cancelada." });
      broadcastState(state);
      return state;
    }
    case "CREATE_PROJECT":
      return finishCapture();
    default:
      return publicState({ ok: false, error: "Comando desconhecido." });
  }
}

async function finishCapture() {
  if (!captureSession.shots.length) {
    return publicState({ ok: false, error: "Capture ao menos uma tela." });
  }
  const { buildDemoPayload } = await loadDemoPayloadHelpers();
  let payload;
  try {
    payload = buildDemoPayload({
      name: captureSession.projectName || "Projeto capturado",
      shots: captureSession.shots,
    });
  } catch (err) {
    return publicState({ ok: false, error: err?.message || "Falha ao montar o projeto." });
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    return publicState({ ok: false, error: "O editor não está aberto." });
  }

  mainWindow.webContents.send("capture:import", payload);
  mainWindow.focus();

  captureSession = emptySession();
  const state = publicState({ show: false, status: "Projeto enviado ao editor." });
  broadcastState(state);
  if (captureWindow && !captureWindow.isDestroyed()) captureWindow.close();
  return state;
}

function llmKeys() {
  return createKeyStore({
    directory: path.join(app.getPath("userData"), "secrets"),
    fileName: "llm-settings.bin",
    encrypt(value) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("encryption-unavailable");
      }
      return safeStorage.encryptString(value);
    },
    decrypt(buffer) {
      return safeStorage.decryptString(buffer);
    },
  });
}

let llmLibPromise = null;
function llmLib() {
  if (!llmLibPromise) {
    llmLibPromise = import(pathToFileURL(path.join(ROOT, "js", "llm.js")).href);
  }
  return llmLibPromise;
}

function registerIpc() {
  ipcMain.handle("desktop:is", () => true);

  ipcMain.handle("llm:status", async () => {
    const {
      defaultLlmSettings,
      isPlausibleLlmKey,
      maskLlmKey,
      normalizeBaseUrl,
    } = await llmLib();
    const store = llmKeys();
    const defaults = defaultLlmSettings();
    if (!store.configured()) {
      return {
        ok: true,
        configured: false,
        masked: "",
        provider: defaults.provider,
        baseUrl: defaults.baseUrl,
        model: defaults.model,
      };
    }
    try {
      const payload = store.readPayload() || {};
      const apiKey = String(payload.apiKey || "");
      const baseUrl = normalizeBaseUrl(payload.baseUrl) || defaults.baseUrl;
      const model = String(payload.model || defaults.model).trim() || defaults.model;
      const provider = String(payload.provider || defaults.provider);
      const configured = isPlausibleLlmKey(apiKey) && !!baseUrl && !!model;
      return {
        ok: true,
        configured,
        masked: maskLlmKey(apiKey),
        provider,
        baseUrl,
        model,
      };
    } catch {
      return { ok: false, configured: false, masked: "", error: "Não li a configuração de IA." };
    }
  });

  ipcMain.handle("llm:save", async (_event, settings) => {
    const {
      defaultLlmSettings,
      isPlausibleLlmKey,
      maskLlmKey,
      normalizeBaseUrl,
      resolveProvider,
    } = await llmLib();
    const defaults = defaultLlmSettings();
    const provider = resolveProvider(settings?.provider, settings?.baseUrl);
    const baseUrl = provider.baseUrl || normalizeBaseUrl(settings?.baseUrl);
    const model = String(settings?.model || defaults.model).trim() || defaults.model;
    const apiKey = String(settings?.apiKey || "").trim();
    if (!isPlausibleLlmKey(apiKey)) {
      return { ok: false, error: "Informe uma chave de API válida." };
    }
    if (!baseUrl) {
      return { ok: false, error: "Informe uma URL base válida." };
    }
    try {
      llmKeys().savePayload({
        provider: provider.id,
        baseUrl,
        model,
        apiKey,
      });
    } catch {
      return { ok: false, error: "O chaveiro do sistema não está disponível." };
    }
    return {
      ok: true,
      configured: true,
      masked: maskLlmKey(apiKey),
      provider: provider.id,
      baseUrl,
      model,
    };
  });

  ipcMain.handle("llm:clear", async () => {
    llmKeys().clear();
    return { ok: true, configured: false };
  });

  ipcMain.handle("llm:complete", async (_event, payload) => {
    const { chatCompletions, defaultLlmSettings, isPlausibleLlmKey, normalizeBaseUrl } = await llmLib();
    const store = llmKeys();
    if (!store.configured()) {
      return { ok: false, error: "Salve a configuração de IA." };
    }
    let settings;
    try {
      settings = store.readPayload() || {};
    } catch {
      return { ok: false, error: "Não li a configuração de IA." };
    }
    const defaults = defaultLlmSettings();
    const apiKey = String(settings.apiKey || "").trim();
    const baseUrl = normalizeBaseUrl(settings.baseUrl) || defaults.baseUrl;
    const model = String(settings.model || defaults.model).trim() || defaults.model;
    if (!isPlausibleLlmKey(apiKey) || !baseUrl) {
      return { ok: false, error: "Salve a configuração de IA." };
    }
    return chatCompletions({
      apiKey,
      baseUrl,
      model,
      messages: payload?.messages,
      maxTokens: payload?.maxTokens,
    });
  });

  ipcMain.handle("llm:list-models", async () => {
    const { listModels, defaultLlmSettings, isPlausibleLlmKey, normalizeBaseUrl } = await llmLib();
    const store = llmKeys();
    if (!store.configured()) {
      return { ok: false, error: "Salve a configuração de IA.", models: [] };
    }
    let settings;
    try {
      settings = store.readPayload() || {};
    } catch {
      return { ok: false, error: "Não li a configuração de IA.", models: [] };
    }
    const defaults = defaultLlmSettings();
    const apiKey = String(settings.apiKey || "").trim();
    const baseUrl = normalizeBaseUrl(settings.baseUrl) || defaults.baseUrl;
    if (!isPlausibleLlmKey(apiKey) || !baseUrl) {
      return { ok: false, error: "Salve a configuração de IA.", models: [] };
    }
    return listModels({ apiKey, baseUrl });
  });

  ipcMain.handle("capture:open", () => {
    createCaptureWindow();
    return { ok: true };
  });

  ipcMain.handle("capture:navigate", async (_event, rawUrl) => {
    createCaptureWindow();
    let url = String(rawUrl || "").trim();
    if (!url) return publicState({ ok: false, error: "Informe um endereço." });
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      await captureView.webContents.loadURL(url);
      return publicState({ status: `Carregando ${url}` });
    } catch (err) {
      return publicState({ ok: false, error: err?.message || "Não abri este endereço." });
    }
  });

  ipcMain.handle("capture:start", async () => {
    createCaptureWindow();
    if (!captureView) return publicState({ ok: false, error: "Janela indisponível." });
    const url = captureView.webContents.getURL();
    if (!/^https?:/i.test(url)) {
      return publicState({ ok: false, error: "Abra a página do produto (http ou https) e inicie de novo." });
    }
    captureSession.active = true;
    await injectContentScript();
    const state = publicState({
      status: "Captura ligada. Congele a tela e depois clique no destaque.",
    });
    broadcastState(state);
    return state;
  });

  ipcMain.handle("capture:toolbar", async (_event, msg) => handlePageMessage(msg));
  ipcMain.handle("capture:page-message", async (_event, msg) => handlePageMessage(msg));
  ipcMain.handle("capture:status", () => publicState());
}

app.whenReady().then(() => {
  registerIpc();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
