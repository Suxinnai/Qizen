const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");

function run(label, command, args) {
  console.log(`\n> ${label}`);
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
}

run("delivery contract checks", process.execPath, ["scripts/check-delivery.mjs"]);
run("typescript", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]);
run("production build", process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
run("electron smoke", path.join(root, "node_modules", "electron", "dist", "electron.exe"), [".", "--smoke-test"]);

console.log("\nDelivery verification passed.");
