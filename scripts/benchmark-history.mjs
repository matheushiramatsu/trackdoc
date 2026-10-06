import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHistory } from "../js/history.js";

// Opcional: caminho do history.js anterior para uma comparação na mesma máquina.
const baselinePath = process.argv[2];
const versions = baselinePath
  ? [["antes", (await import(pathToFileURL(resolve(baselinePath)).href)).createHistory], ["depois", createHistory]]
  : [["atual", createHistory]];
const media = "data:image/png;base64," + "a".repeat(2 * 1024 * 1024);

function median(samples) {
  samples.sort((a, b) => a - b);
  return Number(samples[Math.floor(samples.length / 2)].toFixed(3));
}

for (const [version, factory] of versions) {
  const state = {
    customImages: { screenshot: { dataUrl: media } },
    steps: Array.from({ length: 100 }, (_, i) => ({ id: `step-${i}`, image: "custom:screenshot", caption: `Caption ${i}` })),
  };
  const history = factory();
  history.reset(state);
  const commit = [];
  const capture = [];
  for (let i = 0; i < 35; i++) {
    state.steps[0].caption = `Edit ${i}`;
    history.noteChange();
    const start = performance.now();
    history.settle(state);
    if (i >= 20) commit.push(performance.now() - start);
    const saveStart = performance.now();
    // Reproduz a captura feita por flushAutosave, antes e depois da alteração.
    if (version === "antes") history.exportStacks();
    else {
      structuredClone(state);
      history.exportStacks({ cloneEntries: false });
    }
    if (i >= 20) capture.push(performance.now() - saveStart);
  }
  console.log(JSON.stringify({ version, steps: 100, mediaMiB: 2, historyEntries: 20, samples: 15, commitMedianMs: median(commit), saveCaptureMedianMs: median(capture) }));
}
