import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import { ipcMain, MenuItemConstructorOptions, shell } from 'electron';
import { app, MenuItem } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';

import * as cp from "child_process";

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';
import path from 'path';
import fs from 'fs';


// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
  // Wait for electron app to be ready.
  await app.whenReady();
  // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
  // setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  // Initialize our app, build windows, and load content.
  await myCapacitorApp.init();
  // Check for updates if we are in a packaged app.
  autoUpdater.checkForUpdatesAndNotify();
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the dock icon is clicked.
app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// Place all ipc or other electron api calls and custom functionality under this line


ipcMain.handle('service:back-node', (event, arg) => {
  return new Promise((resolve, reject) => {
    const server = require(path.resolve(__dirname, 'services/back-node/index.js'));
    if (server) {
      resolve(server)
    }
    // console.log('call for server');
    // const nodeBack = cp.fork(path.resolve(__dirname, 'services/back-node/index.js'));
    // nodeBack.addListener("close", (code, event) => {
    // resolve(event);

  });
});

ipcMain.handle('service:deploy', (event, arg) => {
  const { config } = arg;
  return new Promise(async (resolve, reject) => {

    let dataConfig = await fs.writeFile(path.resolve(__dirname, 'services/back-node') + '/environment.json', JSON.stringify(config), (err) => {
      // console.log("ERROR_CREATE_ENV", err);
      // throw err;
    });

    const archiver = require('archiver');

    if (!fs.existsSync(path.resolve(app.getPath('home'), '#Back'))) {
      fs.mkdirSync(path.resolve(app.getPath('home'), '#Back'));
    }

    const output = fs.createWriteStream(path.resolve(app.getPath('home'), '#Back', 'back-node.zip'));
    const archive = archiver('zip');
    console.log(path.resolve(app.getPath('home'), 'back-node.zip'));

    output.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
      shell.showItemInFolder(path.resolve(app.getPath('home'), '#Back', 'back-node.zip'));
      // return path.resolve(app.getPath('home'));
      resolve(path.resolve(app.getPath('home'), '#Back'));
    });

    archive.on('error', function (err) {
      console.log("ERROR_ARCHIVE", err);

      throw err;
    });

    archive.pipe(output);

    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(path.resolve(__dirname, 'services/back-node'), false);


    archive.finalize();
  });
});
