import { createDatabase } from "./database.js";
/**
 * Biblioteca de projetos: IndexedDB + índice em localStorage
 */

import {
  cloneTheme,
  defaultTheme,
  themePreviewDots,
  THEME_PRESETS,
} from "./themes.js";
import { defaultNarration, defaultPlayback, ensureNarration, ensurePlayback } from "./playback.js";
import { t } from "./i18n.js";

const DB_NAME = "demo-studio";
const DB_VERSION = 3;
const STORE = "projects";
const HISTORY_STORE = "history";
const CLIPBOARD_STORE = "clipboard";
const CLIPBOARD_KEY = "steps";
const INDEX_KEY = "demo-studio-index-v2";
const LEGACY_KEYS = ["interactive-demo-v1"];
const STOCK_DEMO_NAME = "Como usar o Guia";

const DEFAULT_SCENE_LABELS = {
  1: "Cena 1",
};

const database = createDatabase(DB_NAME, DB_VERSION, (db) => {
  for (const storeName of [STORE, HISTORY_STORE, CLIPBOARD_STORE]) {
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, { keyPath: "id" });
    }
  }
});

function withStore(mode, fn, storeName = STORE) {
  return database.run(storeName, mode, (tx) => fn(tx.objectStore(storeName)));
}

export function createProjectId() {
  return "proj-" + Math.random().toString(36).slice(2, 10);
}

/** Grava um ou mais passos para colar noutra aba do mesmo origin. */
export async function putStepClipboard(entry) {
  const steps = Array.isArray(entry?.steps)
    ? entry.steps.filter(Boolean)
    : entry?.step
      ? [entry.step]
      : [];
  const record = {
    id: CLIPBOARD_KEY,
    updatedAt: Date.now(),
    step: steps[0] || null,
    steps,
    images: entry?.images || {},
  };
  await withStore("readwrite", (store) => store.put(record), CLIPBOARD_STORE);
  return record;
}

export async function getStepClipboard() {
  const record = await withStore("readonly", (store) => store.get(CLIPBOARD_KEY), CLIPBOARD_STORE);
  const steps = Array.isArray(record?.steps) && record.steps.length
    ? record.steps
    : record?.step
      ? [record.step]
      : [];
  if (!steps.length) return null;
  return { ...record, steps, step: steps[0], images: record.images || {} };
}

export function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) {
      return { activeProjectId: null, projects: [], customThemes: [], migrated: false, seedRevision: 0 };
    }
    const data = JSON.parse(raw);
    return {
      activeProjectId: data.activeProjectId || null,
      projects: Array.isArray(data.projects) ? data.projects : [],
      customThemes: Array.isArray(data.customThemes) ? data.customThemes : [],
      migrated: Boolean(data.migrated),
      seedRevision: Number(data.seedRevision) || 0,
    };
  } catch {
    return { activeProjectId: null, projects: [], customThemes: [], migrated: false, seedRevision: 0 };
  }
}

export function writeIndex(index) {
  localStorage.setItem(
    INDEX_KEY,
    JSON.stringify({
      activeProjectId: index.activeProjectId || null,
      projects: index.projects || [],
      customThemes: index.customThemes || [],
      migrated: Boolean(index.migrated),
      seedRevision: Number(index.seedRevision) || 0,
    })
  );
}

/** Data URLs maiores que isto viram miniatura reduzida no índice (localStorage tem ~5 MB). */
const THUMB_INLINE_MAX = 32 * 1024;
const THUMB_MAX_WIDTH = 640;

function projectThumbSource(project) {
  const firstImage = (project.steps || []).find(
    (s) => s.type !== "slide" && s.image
  )?.image;
  if (firstImage?.startsWith("custom:")) {
    return project.customImages?.[firstImage.slice(7)]?.dataUrl || null;
  }
  return firstImage || null;
}

/** Identifica a imagem sem guardar o conteúdo no índice. */
function thumbKeyFor(src) {
  if (!src) return "";
  if (!src.startsWith("data:")) return src;
  const mid = Math.floor(src.length / 2);
  return `${src.length}:${src.slice(mid, mid + 32)}:${src.slice(-32)}`;
}

async function downscaleDataUrl(src) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return src;
  try {
    const bitmap = await createImageBitmap(await (await fetch(src)).blob());
    const scale = Math.min(1, THUMB_MAX_WIDTH / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const thumb = canvas.toDataURL("image/jpeg", 0.78);
    return thumb.length < src.length ? thumb : src;
  } catch {
    return src;
  }
}

async function summarizeProject(project, previous = null) {
  const src = projectThumbSource(project);
  const thumbKey = thumbKeyFor(src);
  let thumb = null;
  if (previous && previous.thumbKey === thumbKey && previous.thumb !== undefined) {
    thumb = previous.thumb;
  } else if (src?.startsWith("data:") && src.length > THUMB_INLINE_MAX) {
    thumb = await downscaleDataUrl(src);
  } else {
    thumb = src;
  }

  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    stepCount: Array.isArray(project.steps) ? project.steps.length : 0,
    thumb,
    thumbKey,
    themePreview: themePreviewDots(project.theme),
  };
}

async function upsertSummary(project) {
  const previous = readIndex().projects.find((p) => p.id === project.id) || null;
  const summary = await summarizeProject(project, previous);
  // Relê depois do await: outra gravação pode ter alterado o índice nesse intervalo.
  const index = readIndex();
  const i = index.projects.findIndex((p) => p.id === project.id);
  if (i >= 0) index.projects[i] = summary;
  else index.projects.unshift(summary);
  index.projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  writeIndex(index);
  return index;
}

export async function getProject(id) {
  if (!id) return null;
  return withStore("readonly", (store) => store.get(id));
}

export async function listAllProjects() {
  const rows = await withStore("readonly", (store) => store.getAll());
  return Array.isArray(rows) ? rows : [];
}

export async function putProject(project) {
  const next = {
    ...project,
    updatedAt: Date.now(),
  };
  await withStore("readwrite", (store) => store.put(next));
  await upsertSummary(next);
  return next;
}

export async function getProjectHistory(id) {
  if (!id) return null;
  const row = await withStore("readonly", (store) => store.get(id), HISTORY_STORE);
  if (!row) return null;
  return {
    undo: Array.isArray(row.undo) ? row.undo : [],
    redo: Array.isArray(row.redo) ? row.redo : [],
  };
}

export async function putProjectAndHistory(project, stacks) {
  const next = {
    ...project,
    updatedAt: Date.now(),
  };
  const historyRow = {
    id: next.id,
    undo: Array.isArray(stacks?.undo) ? stacks.undo : [],
    redo: Array.isArray(stacks?.redo) ? stacks.redo : [],
  };
  await database.run([STORE, HISTORY_STORE], "readwrite", (tx) => {
    tx.objectStore(STORE).put(next);
    tx.objectStore(HISTORY_STORE).put(historyRow);
  });
  await upsertSummary(next);
  return next;
}

export async function deleteProject(id) {
  await database.run([STORE, HISTORY_STORE], "readwrite", (tx) => {
    tx.objectStore(STORE).delete(id);
    tx.objectStore(HISTORY_STORE).delete(id);
  });
  const index = readIndex();
  index.projects = index.projects.filter((p) => p.id !== id);
  if (index.activeProjectId === id) index.activeProjectId = null;
  writeIndex(index);
}

export async function setActiveProjectId(id) {
  const index = readIndex();
  index.activeProjectId = id || null;
  writeIndex(index);
}

export function getCustomThemes() {
  return readIndex().customThemes || [];
}

export function saveCustomThemes(themes) {
  const index = readIndex();
  index.customThemes = themes;
  writeIndex(index);
}

export function createEmptyProject({ name, theme } = {}) {
  const now = Date.now();
  return {
    id: createProjectId(),
    name: (name || t("default.newProject")).trim() || t("default.newProject"),
    createdAt: now,
    updatedAt: now,
    theme: theme ? cloneTheme(theme) : defaultTheme(),
    customImages: {},
    steps: [],
    sceneLabels: { "1": "Cena 1" },
    playback: defaultPlayback(),
    narration: defaultNarration(),
  };
}

export function projectToDemoPayload(project) {
  const payload = {
    name: project.name,
    theme: project.theme,
    customImages: project.customImages || {},
    steps: project.steps || [],
    sceneLabels: project.sceneLabels || {},
    playback: project.playback || defaultPlayback(),
    narration: project.narration || defaultNarration(),
  };
  ensurePlayback(payload);
  ensureNarration(payload);
  return payload;
}

export function demoPayloadToProject(data, { name, id } = {}) {
  const now = Date.now();
  const theme = data.theme ? cloneTheme(data.theme, {
    presetId: data.theme.presetId,
    customId: data.theme.customId,
  }) : defaultTheme();
  const project = {
    id: id || createProjectId(),
    name: name || data.name || t("default.importedProject"),
    createdAt: now,
    updatedAt: now,
    theme,
    customImages: data.customImages || {},
    steps: Array.isArray(data.steps) ? data.steps : [],
    sceneLabels: data.sceneLabels || {},
    playback: data.playback || defaultPlayback(),
    narration: data.narration || defaultNarration(),
  };
  ensurePlayback(project);
  ensureNarration(project);
  return project;
}

export async function duplicateProject(id) {
  const project = await getProject(id);
  if (!project) throw new Error(t("err.projectNotFound"));
  const copy = {
    ...structuredClone(project),
    id: createProjectId(),
    name: t("default.projectCopy", { name: project.name }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  delete copy.share;
  await putProject(copy);
  return copy;
}

export async function renameProject(id, name) {
  const project = await getProject(id);
  if (!project) throw new Error(t("err.projectNotFound"));
  project.name = (name || "").trim() || project.name;
  return putProject(project);
}

function loadLegacyLocalStorage() {
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (data?.steps?.length) return { data, key };
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Reconstrói o índice a partir do que ainda existe no IndexedDB. */
async function reconcileIndexFromIdb() {
  const stored = await listAllProjects();
  const previous = new Map(readIndex().projects.map((p) => [p.id, p]));
  const summaries = await Promise.all(
    stored.filter((p) => p?.id).map((p) => summarizeProject(p, previous.get(p.id)))
  );
  const index = readIndex();
  index.projects = summaries;
  index.projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (index.activeProjectId && !index.projects.some((p) => p.id === index.activeProjectId)) {
    index.activeProjectId = null;
  }

  writeIndex(index);
  return { index, stored };
}

async function migrateLegacyProject() {
  const legacy = loadLegacyLocalStorage();
  const data = legacy?.data;
  if (!data?.steps?.length) return null;

  const project = demoPayloadToProject(data, {
    name: data.name || t("default.importedProject"),
  });
  project.sceneLabels = {
    ...(data.sceneLabels && Object.keys(data.sceneLabels).length
      ? data.sceneLabels
      : DEFAULT_SCENE_LABELS),
  };
  if (!project.theme.presetId) project.theme.presetId = THEME_PRESETS[0].id;
  await putProject(project);

  if (legacy.key) {
    try {
      localStorage.removeItem(legacy.key);
    } catch {
      /* ignore */
    }
  }
  const index = readIndex();
  index.activeProjectId = index.activeProjectId || project.id;
  index.migrated = true;
  writeIndex(index);
  return project;
}

async function removeStockDemoProjects() {
  const stockIds = readIndex().projects
    .filter((project) => project.name === STOCK_DEMO_NAME)
    .map((project) => project.id);
  for (const id of stockIds) await deleteProject(id);
  return stockIds.length;
}

/**
 * Prepara a biblioteca sem inserir projetos de exemplo:
 * - reconcilia IndexedDB ↔ índice
 * - remove o projeto de exemplo que versões antigas semeavam
 * - migra projetos legados do localStorage
 * @returns {{ index: object, seeded: boolean }}
 */
export async function ensureMigrated() {
  await reconcileIndexFromIdb();

  let index = readIndex();
  let seeded = false;

  await removeStockDemoProjects();
  index = readIndex();

  if (!(index.projects || []).length) {
    const migratedProject = await migrateLegacyProject();
    if (migratedProject) {
      index = readIndex();
      seeded = true;
    }
  }

  await removeStockDemoProjects();
  index = readIndex();
  if (!index.migrated) {
    index.migrated = true;
    writeIndex(index);
  }

  return { index, seeded };
}

export { DEFAULT_SCENE_LABELS };
