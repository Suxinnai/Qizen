const { app, ipcMain } = require("electron");
const {
  openQizenDatabase,
  replaceFromMigrationBundle,
  getDatabaseStatus,
  closeQizenDatabase,
} = require("./database.cjs");
const { readMigrationBundleFromDatabase } = require("./database-readback.cjs");

let database = null;

function getDatabase() {
  if (!database) {
    database = openQizenDatabase({ userDataDir: app.getPath("userData") });
  }
  return database;
}

function registerDatabaseIpc() {
  ipcMain.handle("qizen:db:status", () => getDatabaseStatus(getDatabase()));
  ipcMain.handle("qizen:db:import-bundle", (_event, bundle) =>
    replaceFromMigrationBundle(getDatabase(), bundle)
  );
  ipcMain.handle("qizen:db:export-bundle", () =>
    readMigrationBundleFromDatabase(getDatabase())
  );
}

function closeDatabaseIpc() {
  if (!database) return;
  closeQizenDatabase(database);
  database = null;
}

module.exports = {
  registerDatabaseIpc,
  closeDatabaseIpc,
};
