// Animações de interface (Motion). Falha em silêncio se a lib não carregar ou se o usuário preferir menos movimento.
const M = window.Motion;
const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

if (M && !reduce) {
  const { stagger, inView } = M;
  const ease = [0.22, 1, 0.36, 1];
  const spring = { type: "spring", stiffness: 420, damping: 26 };
  const list = (x) => (x instanceof Element ? [x] : [...x]);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // why: transform inline sobrevive à animação e anula o :hover do CSS; limpa ao fim
  const animate = (els, kf, opts) => {
    const a = M.animate(els, kf, opts);
    if (kf.transform) {
      const items = list(els);
      // why: o fill da animação concluída segura o transform e bloqueia o :hover do CSS
      const clear = () => {
        a.cancel();
        // why: Motion regrava o estilo final logo após o cancel; limpa depois
        requestAnimationFrame(() => requestAnimationFrame(() => items.forEach((el) => (el.style.transform = ""))));
      };
      a.finished.then(clear, () => {});
    }
    return a;
  };
  const from = (y, x = 0, s = 1) => [`translate(${x}px, ${y}px) scale(${s})`, "translate(0px, 0px) scale(1)"];
  const fx = {
    rise: (e, o) => animate(e, { opacity: [0, 1], transform: from(14) }, { duration: 0.5, ease, ...o }),
    pop: (e, o) => animate(e, { opacity: [0, 1], transform: from(8, 0, 0.94) }, { duration: 0.32, ease, ...o }),
    left: (e, o) => animate(e, { opacity: [0, 1], transform: from(0, -28) }, { duration: 0.5, ease, ...o }),
    right: (e, o) => animate(e, { opacity: [0, 1], transform: from(0, 28) }, { duration: 0.5, ease, ...o }),
    down: (e, o) => animate(e, { opacity: [0, 1], transform: from(-12) }, { duration: 0.45, ease, ...o }),
    fade: (e, o) => animate(e, { opacity: [0, 1] }, { duration: 0.35, ease, ...o }),
  };

  // 1. entrada inicial
  fx.down($(".topbar"), { duration: 0.5 });
  const head = $(".library-header");
  if (head) fx.rise(head, { delay: 0.1 });

  // 3. filmstrip: anima só passos novos (a lista é re-renderizada a cada edição)
  let filmCount = 0;
  const filmstrip = document.getElementById("filmstrip");
  function animateFilm() {
    if (!filmstrip) return;
    const items = $$(".film-item, .film-scene", filmstrip);
    if (items.length > filmCount) fx.left(items.slice(filmCount), { delay: stagger(0.045), duration: 0.4 });
    filmCount = items.length;
  }
  if (filmstrip) new MutationObserver(animateFilm).observe(filmstrip, { childList: true });

  // 2. troca de tela; editor anima painéis separadamente
  const enterEditor = () => {
    fx.left($("#filmstrip-panel"));
    fx.right($("#props-panel"), { delay: 0.05 });
    fx.down($(".canvas-toolbar"), { delay: 0.1 });
    fx.rise($$("#props-panel > *").slice(0, 12), { delay: stagger(0.035, { startDelay: 0.18 }), duration: 0.4 });
    const frame = $("#canvas-frame");
    if (frame) fx.pop(frame, { delay: 0.12, duration: 0.45 });
    filmCount = 0; // força cascata completa dos passos
    animateFilm();
  };
  for (const id of ["view-library", "view-editor", "view-help"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    new MutationObserver(() => {
      if (el.hidden) return;
      if (id === "view-editor") {
        fx.fade(el, { duration: 0.25 });
        enterEditor();
      } else fx.rise(el, { duration: 0.4 });
    }).observe(el, { attributes: true, attributeFilter: ["hidden"] });
  }

  // 4. elementos que aparecem/somem via atributo hidden
  const hiddenPresets = {
    "library-empty": "rise",
    "canvas-empty": "rise",
    "canvas-slide": "pop",
    hotspot: "pop",
    "click-point": "pop",
    "canvas-caption": "rise",
    "rotate-hint": "fade",
    toast: "pop",
    "canvas-missing": "fade",
    "topbar-actions-editor": "fade",
    "topbar-actions-library": "fade",
    "topbar-nav-editor": "fade",
  };
  for (const [id, preset] of Object.entries(hiddenPresets)) {
    const el = document.getElementById(id);
    if (!el) continue;
    new MutationObserver(() => {
      if (!el.hidden) fx[preset](el, { duration: 0.35 });
    }).observe(el, { attributes: true, attributeFilter: ["hidden"] });
  }

  // 5. imagem do canvas troca de passo: fade suave
  const img = document.getElementById("canvas-image");
  if (img) new MutationObserver(() => fx.fade(img, { duration: 0.3 })).observe(img, { attributes: true, attributeFilter: ["src"] });

  // 6. diálogos (<dialog open>)
  for (const d of $$("dialog")) {
    new MutationObserver(() => {
      if (d.open) animate(d, { opacity: [0, 1], transform: from(18, 0, 0.96) }, { duration: 0.35, ease });
    }).observe(d, { attributes: true, attributeFilter: ["open"] });
  }

  // 7. nós adicionados dinamicamente (cards, temas, painéis)
  const added = [
    [".project-card", "rise"],
    [".theme-swatch", "pop"],
    [".more-section", "rise"],
    [".inline-edit", "pop"],
  ];
  const pending = new Map();
  let flush = 0;
  new MutationObserver((muts) => {
    for (const m of muts)
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        for (const [sel, preset] of added) {
          for (const el of n.matches(sel) ? [n, ...$$(sel, n)] : $$(sel, n)) {
            if (!pending.has(preset)) pending.set(preset, new Set());
            pending.get(preset).add(el);
          }
        }
      }
    if (!flush && pending.size)
      flush = requestAnimationFrame(() => {
        for (const [preset, els] of pending) fx[preset]([...els], { delay: stagger(0.05) });
        pending.clear();
        flush = 0;
      });
  }).observe(document.body, { childList: true, subtree: true });

  // 8. painéis <details> e menus
  document.addEventListener(
    "toggle",
    (e) => {
      const d = e.target;
      if (!(d instanceof HTMLDetailsElement) || !d.open) return;
      const body = $("summary ~ *", d);
      if (body) animate(body, { opacity: [0, 1], transform: from(-8, 0, 0.97) }, { duration: 0.24, ease });
    },
    true,
  );

  // 9. micro-interações: clique em botões, troca de modo, foco em campos
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest?.(".btn, .preview-menu-option, .mode-btn, .film-item, .theme-swatch, .project-card");
    if (b && !b.disabled) M.animate(b, { scale: [1, 0.96, 1] }, { duration: 0.3, ease });
  });
  new MutationObserver((muts) => {
    for (const m of muts)
      if (m.target.getAttribute("aria-pressed") === "true") M.animate(m.target, { scale: [0.92, 1] }, spring);
  }).observe(document.body, { attributes: true, attributeFilter: ["aria-pressed"], subtree: true });
  document.addEventListener("focusin", (e) => {
    const f = e.target;
    if (f.matches?.("input[type=text], textarea, select")) M.animate(f, { scale: [0.99, 1] }, { duration: 0.25, ease });
  });

  // 10. scroll reveal (ajuda e demais páginas com .card)
  inView(".page .card, [data-reveal]", (el) => {
    fx.rise(el, { duration: 0.6 });
  }, { margin: "0px 0px -8% 0px" });
}
