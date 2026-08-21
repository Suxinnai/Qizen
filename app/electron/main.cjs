const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app, BrowserWindow, ipcMain, safeStorage, shell } = require("electron");
const { registerDatabaseIpc, closeDatabaseIpc } = require("./database-ipc.cjs");

const DEV_URL = process.env.QIZEN_ELECTRON_DEV_URL;
const isSmokeTest = process.argv.includes("--smoke-test");
const isVisualSmoke = process.argv.includes("--visual-smoke");
const visualSmokeUrl = process.env.QIZEN_VISUAL_SMOKE_URL;
const visualSmokeOut = process.env.QIZEN_VISUAL_SMOKE_OUT;
const SAFE_STORAGE_PREFIX = "qizen-safe-storage-v1:";
let visualSmokeRequired = [];
try {
  visualSmokeRequired = JSON.parse(process.env.QIZEN_VISUAL_SMOKE_REQUIRED || "[]");
} catch {
  visualSmokeRequired = [];
}

let mainWindow = null;

if (isSmokeTest) {
  const smokeProfile = path.join(os.tmpdir(), `qizen-electron-smoke-${process.pid}`);
  fs.mkdirSync(smokeProfile, { recursive: true });
  app.setPath("userData", smokeProfile);
}

if (isVisualSmoke) {
  const visualSmokeProfile = process.env.QIZEN_VISUAL_SMOKE_PROFILE;
  const visualSmokeCache = process.env.QIZEN_VISUAL_SMOKE_CACHE;
  if (visualSmokeProfile) {
    fs.mkdirSync(visualSmokeProfile, { recursive: true });
    app.setPath("userData", visualSmokeProfile);
  }
  if (visualSmokeCache) fs.mkdirSync(visualSmokeCache, { recursive: true });
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-dev-shm-usage");
  app.commandLine.appendSwitch("disable-software-rasterizer");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-http-cache");
  app.commandLine.appendSwitch("disk-cache-size", "1");
  app.commandLine.appendSwitch("media-cache-size", "1");
  if (visualSmokeCache) app.commandLine.appendSwitch("disk-cache-dir", visualSmokeCache);
  if (visualSmokeProfile) app.commandLine.appendSwitch("user-data-dir", visualSmokeProfile);
  app.commandLine.appendSwitch(
    "disable-features",
    "VizDisplayCompositor,UseSkiaRenderer,CanvasOopRasterization,DefaultANGLEVulkan,Vulkan,UseDawn,SkiaGraphite"
  );
}

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
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return path.join(dir, `${safeSecretKey(key)}.secret`);
}

function encodeSecret(value) {
  const plainText = String(value);
  if (!safeStorage.isEncryptionAvailable()) return plainText;
  const encrypted = safeStorage.encryptString(plainText);
  return `${SAFE_STORAGE_PREFIX}${encrypted.toString("base64")}`;
}

function decodeSecret(payload) {
  if (!payload.startsWith(SAFE_STORAGE_PREFIX)) {
    return { value: payload, encrypted: false };
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Encrypted secret exists but OS-backed decryption is unavailable");
  }

  const encoded = payload.slice(SAFE_STORAGE_PREFIX.length);
  if (!encoded) return { value: "", encrypted: true };
  return {
    value: safeStorage.decryptString(Buffer.from(encoded, "base64")),
    encrypted: true,
  };
}

function writeSecret(key, value) {
  const file = secretPath(key);
  fs.writeFileSync(file, encodeSecret(value), { encoding: "utf8", mode: 0o600 });
  return true;
}

function readSecret(key) {
  const file = secretPath(key);
  if (!fs.existsSync(file)) return null;

  const payload = fs.readFileSync(file, "utf8");
  const decoded = decodeSecret(payload);

  // Backward compatibility: old releases stored plaintext `.secret` files.
  // Migrate them in-place on the first successful read when OS encryption is available.
  if (!decoded.encrypted && safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(file, encodeSecret(decoded.value), { encoding: "utf8", mode: 0o600 });
  }

  return decoded.value;
}

function deleteSecret(key) {
  const file = secretPath(key);
  if (fs.existsSync(file)) fs.rmSync(file);
  return true;
}

function verifySecretStorageSmoke() {
  const key = "qizen-smoke-secret";
  const value = `secret-${process.pid}-${Date.now()}`;
  writeSecret(key, value);

  const restored = readSecret(key);
  if (restored !== value) {
    throw new Error("Electron secret storage smoke failed to restore the stored value");
  }

  if (safeStorage.isEncryptionAvailable()) {
    const payload = fs.readFileSync(secretPath(key), "utf8");
    if (!payload.startsWith(SAFE_STORAGE_PREFIX) || payload.includes(value)) {
      throw new Error("Electron secret storage smoke expected an encrypted payload");
    }
  }

  deleteSecret(key);
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

  ipcMain.handle("qizen:secret:set", (_event, key, value) => writeSecret(key, value));

  ipcMain.handle("qizen:secret:get", (_event, key) => readSecret(key));

  ipcMain.handle("qizen:secret:delete", (_event, key) => deleteSecret(key));
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

async function runVisualSmoke() {
  if (!visualSmokeUrl || !visualSmokeOut) {
    throw new Error("Missing visual smoke URL or output path");
  }

  const smokeWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    show: false,
    backgroundColor: "#f3f3f3",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Visual smoke timed out while rendering /study")), 20000);
  });
  const render = (async () => {
    smokeWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
      console.error(`Visual smoke load failed: ${errorCode} ${errorDescription} ${validatedUrl}`);
    });
    await smokeWindow.loadURL(visualSmokeUrl);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return smokeWindow.webContents.executeJavaScript("document.body.innerText", true);
  })();

  const text = await Promise.race([render, timeout]);
  const missing = visualSmokeRequired.filter((item) => !text.includes(item));
  if (missing.length > 0) {
    throw new Error(`Visual smoke missing text: ${missing.join(", ")}`);
  }

  const image = await smokeWindow.webContents.capturePage();
  fs.mkdirSync(path.dirname(visualSmokeOut), { recursive: true });
  fs.writeFileSync(visualSmokeOut, image.toPNG());
  smokeWindow.destroy();
}

registerIpc();
registerDatabaseIpc();

app.whenReady().then(() => {
  if (isSmokeTest) {
    if (!fs.existsSync(path.join(__dirname, "preload.cjs"))) {
      throw new Error("Missing Electron preload script");
    }
    verifySecretStorageSmoke();
    app.quit();
    return;
  }

  if (isVisualSmoke) {
    runVisualSmoke()
      .then(() => {
        console.log(`Visual smoke passed: ${visualSmokeOut}`);
        app.quit();
      })
      .catch((error) => {
        console.error(error);
        app.exit(1);
      });
    return;
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  closeDatabaseIpc();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

module.exports = { createWindow, secretPath, readSecret, writeSecret, deleteSecret };