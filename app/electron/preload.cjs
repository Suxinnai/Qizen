const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("qizenWindow", {
  minimize: () => ipcRenderer.invoke("qizen:window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("qizen:window:toggle-maximize"),
  close: () => ipcRenderer.invoke("qizen:window:close"),
});

contextBridge.exposeInMainWorld("qizenSecrets", {
  set: (key, value) => ipcRenderer.invoke("qizen:secret:set", key, value),
  get: (key) => ipcRenderer.invoke("qizen:secret:get", key),
  delete: (key) => ipcRenderer.invoke("qizen:secret:delete", key),
});

contextBridge.exposeInMainWorld("qizenDatabase", {
  status: () => ipcRenderer.invoke("qizen:db:status"),
  importBundle: (bundle) => ipcRenderer.invoke("qizen:db:import-bundle", bundle),
  exportBundle: () => ipcRenderer.invoke("qizen:db:export-bundle"),
});
