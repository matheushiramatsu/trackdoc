/**
 * Botões de tela cheia do preview: um abre, o outro (só visível em tela cheia) fecha.
 */
import { t } from "./i18n.js";

const ENTER_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function fullscreenSupported() {
  return Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
}

export function exitFullscreen() {
  if (!document.fullscreenElement) return Promise.resolve();
  return document.exitFullscreen().catch(() => {});
}

function makeButton(id, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = id;
  button.className = "present-fullscreen";
  button.hidden = true;
  button.innerHTML = icon;
  return button;
}

/**
 * @param {HTMLElement} container
 * @param {{ isActive?: () => boolean }} [opts] isActive: o preview está a correr agora.
 */
export function mountFullscreenToggle(container, { isActive = () => true } = {}) {
  if (!container || !fullscreenSupported()) return { sync() {} };

  const enter = makeButton("present-fullscreen-open", ENTER_ICON);
  const close = makeButton("present-fullscreen-close", CLOSE_ICON);
  close.classList.add("is-close");
  container.append(enter, close);

  function sync() {
    const full = Boolean(document.fullscreenElement);
    const active = isActive();
    enter.hidden = !active || full;
    close.hidden = !full;
    document.body.classList.toggle("is-fullscreen", full);
    for (const [button, key] of [
      [enter, "present.fullscreen"],
      [close, "present.exitFullscreen"],
    ]) {
      const label = t(key);
      button.title = label;
      button.setAttribute("aria-label", label);
    }
  }

  // stopPropagation: o player trata cliques no palco como "sair" ou "avançar".
  enter.addEventListener("click", (event) => {
    event.stopPropagation();
    document.documentElement.requestFullscreen().catch(() => {});
  });
  close.addEventListener("click", (event) => {
    event.stopPropagation();
    exitFullscreen();
  });
  document.addEventListener("fullscreenchange", sync);
  sync();
  return { sync };
}
