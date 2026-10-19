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

  /**
   * @param {{ x: number, y: number }} target coords relative to frame
   * @param {{ pressHotspot?: boolean }} [opts]
   */
  async function animateTo(target, opts = {}) {
    const pressHotspot = opts.pressHotspot !== false;
    const startX = Math.max(16, target.x - 90);
    const startY = Math.max(16, target.y - 70);

    reset();
    els.cursor.hidden = false;
    els.cursor.style.left = startX + "px";
    els.cursor.style.top = startY + "px";

    await wait(30);
    els.cursor.classList.add("is-visible");
    els.cursor.style.left = target.x + "px";
    els.cursor.style.top = target.y + "px";

    await wait(520);
    els.cursor.classList.add("is-click");
    if (pressHotspot && els.hotspot) els.hotspot.classList.add("is-pressed");
    await wait(360);
    if (els.hotspot) els.hotspot.classList.remove("is-pressed");
  }

  return { reset, animateTo };
}
