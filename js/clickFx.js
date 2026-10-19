/**
 * Animação compartilhada do cursor e do destaque no clique
 */

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {{
 *   frame: HTMLElement,
 *   hotspot: HTMLElement,
 *   cursor: HTMLElement,
 * }} els
 */
export function createClickFxController(els) {
  function reset() {
    if (els.hotspot) els.hotspot.classList.remove("is-pressed");
    if (els.cursor) {
      els.cursor.classList.remove("is-visible", "is-click");
      els.cursor.hidden = true;
    }
  }

  function moveTo(target) {
    if (!els.cursor) return;
    els.cursor.classList.remove("is-click");
    els.cursor.hidden = false;
    els.cursor.style.left = target.x + "px";
    els.cursor.style.top = target.y + "px";
    els.cursor.classList.add("is-visible", "is-click");
  }

  /**
   * @param {{ x: number, y: number }} target coords relative to frame
   * @param {{ pressHotspot?: boolean }} [opts]
   */
  async function animateTo(target, opts = {}) {
    const pressHotspot = opts.pressHotspot !== false;
    moveTo(target);
    if (pressHotspot && els.hotspot) els.hotspot.classList.add("is-pressed");
    await wait(360);
    if (els.hotspot) els.hotspot.classList.remove("is-pressed");
  }

  return { reset, moveTo, animateTo };
}
