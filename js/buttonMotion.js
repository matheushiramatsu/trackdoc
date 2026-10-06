const BUTTON_SELECTOR = "button, a.btn, summary.btn, .theme-panel > summary, .export-panel > summary, .preview-menu > summary, .more-panel > summary";

function getButton(target) {
  if (!(target instanceof Element)) return null;
  const button = target.closest(BUTTON_SELECTOR);
  return button?.closest(".driver-popover") ? null : button;
}

function setOrigin(button, clientX, clientY) {
  const rect = button.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
  const y = Math.min(rect.height, Math.max(0, clientY - rect.top));
  const radius = Math.hypot(
    Math.max(x, rect.width - x),
    Math.max(y, rect.height - y),
  );

  button.style.setProperty("--origin-x", `${x}px`);
  button.style.setProperty("--origin-y", `${y}px`);
  button.style.setProperty("--origin-diameter", `${radius * 2 + 4}px`);
}

function activateOrigin(button) {
  button.classList.add("has-origin-motion");
  if (button.dataset.originMotionReady === "true") {
    button.classList.add("is-origin-active");
    return;
  }
  if (button.dataset.originMotionPending === "true") return;

  button.dataset.originMotionPending = "true";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      button.dataset.originMotionReady = "true";
      delete button.dataset.originMotionPending;
      if (button.matches(":hover, :focus-visible")) {
        button.classList.add("is-origin-active");
      }
    });
  });
}

export function initButtonMotion(root = document) {
  root.addEventListener("pointerover", (event) => {
    const button = getButton(event.target);
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
    if (event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) return;

    setOrigin(button, event.clientX, event.clientY);
    activateOrigin(button);
  });

  root.addEventListener("pointerout", (event) => {
    const button = getButton(event.target);
    if (!button || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) return;
    if (!(document.activeElement === button && button.matches(":focus-visible"))) {
      button.classList.remove("is-origin-active");
    }
  });

  root.addEventListener("focusin", (event) => {
    const button = getButton(event.target);
    if (!button || button.disabled) return;
    const rect = button.getBoundingClientRect();
    setOrigin(button, rect.left + rect.width / 2, rect.top + rect.height / 2);
    activateOrigin(button);
  });

  root.addEventListener("focusout", (event) => {
    const button = getButton(event.target);
    if (button && !button.matches(":hover")) button.classList.remove("is-origin-active");
  });
}
