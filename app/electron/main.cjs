const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const DEV_URL = process.env.QIZEN_ELECTRON_DEV_URL;
const isSmokeTest = process.argv.includes("--smoke-test");

let mainWindow = null;

function safeSecretKey(key) {
  const safe = String(key)
    .split("")
    .filter((character) => /[a-zA-Z0-9_-]/.test(character))
    .join("");
  if (!safe) throw new Error("Invalid secret key");
  return safe;
}

function secretPath(key) {
  const dir = path.join(app.getPath("userData"), "secrets");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${safeSecretKey(key)}.secret`);
}

function registerIpc() {
  ipcMain.handle("qizen:window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle("qizen:window:toggle-maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.handle("qizen:window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle("qizen:secret:set", (_event, key, value) => {
    fs.writeFileSync(secretPath(key), String(value), "utf8");
    return true;
  });

  ipcMain.handle("qizen:secret:get", (_event, key) => {
    const file = secretPath(key);
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, "utf8");
  });

  ipcMain.handle("qizen:secret:delete", (_event, key) => {
    const file = secretPath(key);
    if (fs.existsSync(file)) fs.rmSync(file);
    return true;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "栖知 — Qizen",
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    show: false,
    backgroundColor: "#f3f3f3",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

registerIpc();

app.whenReady().then(() => {
  if (isSmokeTest) {
    if (!fs.existsSync(path.join(__dirname, "preload.cjs"))) {
      throw new Error("Missing Electron preload script");
    }
    app.quit();
    return;
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

module.exports = { createWindow, secretPath };
