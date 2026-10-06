/** Layout compartilhado pelo editor e pelo player. */
function containSize(nw, nh, maxW, maxH) {
  const w0 = Math.max(1, nw || 16);
  const h0 = Math.max(1, nh || 9);
  const scale = Math.min(maxW / w0, maxH / h0);
  return { w: Math.round(w0 * scale), h: Math.round(h0 * scale) };
}
function mediaMaxBox(stage) {
  const styles = stage ? getComputedStyle(stage) : null;
  const padX = styles ? parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight) : 32;
  const maxW = Math.min(1200, Math.max(280, (stage?.clientWidth || 800) - (Number.isFinite(padX) ? padX : 32)));
  const maxH = Math.max(200, window.innerHeight - 160);
  return { maxW, maxH };
}

function referenceImageSrc(demo, step, resolve) {
  const steps = demo?.steps || [];
  const start = Math.max(0, steps.indexOf(step));
  for (let i = start - 1; i >= 0; i--) {
    const item = steps[i];
    if (item && item.type !== "slide" && item.image) return resolve(demo, item.image);
  }
  for (let i = start + 1; i < steps.length; i++) {
    const item = steps[i];
    if (item && item.type !== "slide" && item.image) return resolve(demo, item.image);
  }
  return "";
}

const imageSizeCache = new Map();
const pendingLayouts = new WeakMap();
const IMAGE_SIZE_CACHE_LIMIT = 64;

function imageSize(src) {
  if (imageSizeCache.has(src)) return imageSizeCache.get(src);
  const pending = new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve({ w: probe.naturalWidth, h: probe.naturalHeight });
    probe.onerror = () => resolve(null);
    probe.src = src;
  });
  imageSizeCache.set(src, pending);
  pending.then((size) => {
    if (!size && imageSizeCache.get(src) === pending) imageSizeCache.delete(src);
  });
  if (imageSizeCache.size > IMAGE_SIZE_CACHE_LIMIT) {
    imageSizeCache.delete(imageSizeCache.keys().next().value);
  }
  return pending;
}

export function applySlideLayout(slideEl, step) {
  if (!slideEl) return;
  const align = step?.layout?.align;
  const valign = step?.layout?.valign;
  slideEl.dataset.align = align === "center" || align === "end" ? align : "start";
  slideEl.dataset.valign = valign === "top" || valign === "bottom" ? valign : "center";
}

export function sizeSlideLikeImage(slideEl, stage, demo, step, resolve) {
  if (!slideEl) return;
  const token = {};
  pendingLayouts.set(slideEl, token);
  const { maxW, maxH } = mediaMaxBox(stage);
  const paint = (nw, nh) => {
    const box = containSize(nw, nh, maxW, maxH);
    slideEl.style.width = box.w + "px";
    slideEl.style.height = box.h + "px";
  };
  const src = referenceImageSrc(demo, step, resolve);
  if (!src) {
    paint(16, 9);
    return;
  }
  paint(16, 9);
  imageSize(src).then((size) => {
    if (size && pendingLayouts.get(slideEl) === token) paint(size.w, size.h);
  });
}
