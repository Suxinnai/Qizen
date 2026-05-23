const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const host = "127.0.0.1";
const port = 1420;
const devUrl = `http://${host}:${port}`;
const viteBin = path.join(path.dirname(require.resolve("vite/package.json")), "bin", "vite.js");
const electronBin = require("electron");

function waitForPort(timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const socket = net.createConnection({ host, port }, () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${devUrl}`));
          return;
        }
        setTimeout(check, 250);
      });
    }
    check();
  });
}

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function startVite() {
  return spawn(process.execPath, [viteBin, "--host", host], {
    stdio: "inherit",
    env: { ...process.env, BROWSER: "none" },
  });
}

function startElectron(vite) {
  const electron = spawn(electronBin, [path.join(__dirname, "..")], {
    stdio: "inherit",
    env: { ...process.env, QIZEN_ELECTRON_DEV_URL: devUrl },
  });

  electron.on("exit", (code) => {
    vite?.kill();
    process.exit(code ?? 0);
  });

  return electron;
}

let vite = null;
let electronStarted = false;

(async () => {
  if (await isPortOpen()) {
    console.log(`Using existing Vite dev server at ${devUrl}`);
  } else {
    vite = startVite();
    vite.on("exit", (code) => {
      if (!electronStarted) {
        process.exit(code ?? 1);
      }
    });
  }

  await waitForPort();
})()
  .then(() => {
    electronStarted = true;
    startElectron(vite);
  })
  .catch((error) => {
    vite?.kill();
    console.error(error);
    process.exit(1);
  });
