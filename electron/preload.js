const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("guiaDesktopApp", {
  isDesktop: true,
  openCapture: () => ipcRenderer.invoke("capture:open"),
  llmStatus: () => ipcRenderer.invoke("llm:status"),
  llmSave: (settings) => ipcRenderer.invoke("llm:save", settings),
  llmClear: () => ipcRenderer.invoke("llm:clear"),
  llmComplete: (payload) => ipcRenderer.invoke("llm:complete", payload),
  llmListModels: () => ipcRenderer.invoke("llm:list-models"),
});

ipcRenderer.on("capture:import", (_event, payload) => {
  window.dispatchEvent(
    new CustomEvent("guia-desktop-import", {
      detail: payload,
    })
  );
});
