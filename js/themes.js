/**
 * Temas prontos + helpers de cores
 */

export const THEME_COLOR_KEYS = [
  "accent",
  "overlay",
  "popoverBg",
  "title",
  "text",
  "button",
  "hotspot",
];

/** Presets do design system (Claro / Escuro) — usados pelo botão Aparência */
export const DESIGN_SYSTEM_PRESET_IDS = ["documento", "social"];

export const APPEARANCE_STORAGE_KEY = "ns-appearance";

export const THEME_PRESETS = [
  {
    id: "documento",
    name: "Claro",
    appearance: "documento",
    colors: {
      accent: "#1732FF",
      accentDark: "#142BD9",
      overlay: "#24262D",
      popoverBg: "#FFFFFF",
      title: "#36405E",
      text: "#24262D",
      button: "#1732FF",
      hotspot: "#35D2F2",
    },
  },
  {
    id: "social",
    name: "Escuro",
    appearance: "social",
    colors: {
      accent: "#1732FF",
      accentDark: "#142BD9",
      overlay: "#191919",
      popoverBg: "#24262D",
      title: "#FFFFFF",
      text: "#D2E7FC",
      button: "#1732FF",
      hotspot: "#35D2F2",
    },
  },
  {
    id: "laranja-vibrante",
    name: "Laranja vibrante",
    colors: {
      accent: "#e85d04",
      accentDark: "#c44d00",
      overlay: "#000000",
      popoverBg: "#ffffff",
      title: "#1a1a1a",
      text: "#3d3d3d",
      button: "#e85d04",
      hotspot: "#e85d04",
    },
  },
  {
    id: "corporate-blue",
    name: "Corporativo azul",
    colors: {
      accent: "#2563eb",
      accentDark: "#1d4ed8",
      overlay: "#0f172a",
      popoverBg: "#ffffff",
      title: "#0f172a",
      text: "#334155",
      button: "#2563eb",
      hotspot: "#2563eb",
    },
  },
  {
    id: "dark",
    name: "Azul noite",
    colors: {
      accent: "#38bdf8",
      accentDark: "#0ea5e9",
      overlay: "#020617",
      popoverBg: "#1e293b",
      title: "#f8fafc",
      text: "#cbd5e1",
      button: "#38bdf8",
      hotspot: "#38bdf8",
    },
  },
  {
    id: "neutral-light",
    name: "Neutro claro",
    colors: {
      accent: "#4b5563",
      accentDark: "#374151",
      overlay: "#111827",
      popoverBg: "#ffffff",
      title: "#111827",
      text: "#4b5563",
      button: "#111827",
      hotspot: "#6b7280",
    },
  },
  {
    id: "green",
    name: "Verde",
    colors: {
      accent: "#059669",
      accentDark: "#047857",
      overlay: "#064e3b",
      popoverBg: "#ffffff",
      title: "#064e3b",
      text: "#374151",
      button: "#059669",
      hotspot: "#10b981",
    },
  },
  {
    id: "violet",
    name: "Violeta",
    colors: {
      accent: "#7c3aed",
      accentDark: "#6d28d9",
      overlay: "#1e1b4b",
      popoverBg: "#ffffff",
      title: "#1e1b4b",
      text: "#4b5563",
      button: "#7c3aed",
      hotspot: "#8b5cf6",
    },
  },
];

export function getPreset(id) {
  if (!id) return null;
  return (
    THEME_PRESETS.find((p) => p.id === id) ||
    THEME_PRESETS.find((p) => p.legacyIds?.includes(id)) ||
    null
  );
}

export function defaultTheme() {
  return cloneTheme(THEME_PRESETS[0].colors, { presetId: THEME_PRESETS[0].id });
}

export function cloneTheme(colors, meta = {}) {
  const next = {
    accent: colors.accent,
    accentDark: colors.accentDark || darkenHex(colors.accent),
    overlay: colors.overlay,
    popoverBg: colors.popoverBg,
    title: colors.title,
    text: colors.text,
    button: colors.button,
    hotspot: colors.hotspot,
  };
  const presetId = meta.presetId || colors.presetId;
  const customId = meta.customId || colors.customId;
  if (presetId) next.presetId = presetId;
  if (customId) next.customId = customId;
  return next;
}

export function darkenHex(hex, amount = 0.15) {
  const h = String(hex || "#000000").replace("#", "");
  if (h.length !== 6) return hex;
  const nums = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const darkened = nums.map((n) => Math.max(0, Math.round(n * (1 - amount))));
  return (
    "#" +
    darkened
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function themePreviewDots(theme) {
  if (!theme) return [];
  return [theme.accent, theme.popoverBg, theme.title, theme.button].filter(Boolean);
}

export function createThemeId() {
  return "theme-" + Math.random().toString(36).slice(2, 9);
}

export function matchThemeSelection(theme, customThemes = []) {
  if (!theme) return { kind: "preset", id: THEME_PRESETS[0].id };
  if (theme.customId && customThemes.some((t) => t.id === theme.customId)) {
    return { kind: "custom", id: theme.customId };
  }
  if (theme.presetId && getPreset(theme.presetId)) {
    return { kind: "preset", id: theme.presetId };
  }
  for (const preset of THEME_PRESETS) {
    if (colorsEqual(preset.colors, theme)) {
      return { kind: "preset", id: preset.id };
    }
  }
  for (const custom of customThemes) {
    if (colorsEqual(custom.colors, theme)) {
      return { kind: "custom", id: custom.id };
    }
  }
  return { kind: "custom", id: null };
}

/** Preferência salva: system | documento | social */
export function getAppearancePreference() {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw === "documento" || raw === "social" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function setAppearancePreference(value) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function systemAppearanceMode() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "social"
      : "documento";
  }
  return "documento";
}

/** Modo efetivo: documento | social */
export function resolveAppearanceMode(preference = getAppearancePreference()) {
  if (preference === "documento" || preference === "social") return preference;
  return systemAppearanceMode();
}

export function cycleAppearancePreference(current = getAppearancePreference()) {
  const order = ["system", "documento", "social"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

function colorsEqual(a, b) {
  return THEME_COLOR_KEYS.every(
    (key) => normalizeHex(a[key]) === normalizeHex(b[key])
  );
}

function normalizeHex(value) {
  if (!value) return "";
  if (value.startsWith("#") && value.length === 7) return value.toLowerCase();
  if (value.startsWith("#") && value.length === 4) {
    return (
      "#" +
      value
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    ).toLowerCase();
  }
  return String(value).toLowerCase();
}
