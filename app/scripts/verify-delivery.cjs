const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const electronExe = path.join(root, "node_modules", "electron", "dist", "electron.exe");

function run(label, command, args) {
  console.log(`\n> ${label}`);
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
}

run("delivery contract checks", process.execPath, ["scripts/check-delivery.mjs"]);
run("unit tests", process.execPath, [
  "--experimental-strip-types",
  "--test",
  "tests/study-policies.test.mjs",
  "tests/study-memory-rag-builders.test.mjs",
  "tests/study-conversation-context.test.mjs",
  "tests/sqlite-migration.test.mjs",
]);
run("typescript", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]);
run("production build", process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
run("electron smoke", electronExe, [".", "--smoke-test"]);
run("electron sqlite smoke", electronExe, ["electron/database-smoke.cjs"]);

console.log("\nDelivery verification passed.");
