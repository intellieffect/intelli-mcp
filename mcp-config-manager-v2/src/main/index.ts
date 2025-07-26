/**
 * Electron main process entry point
 */

console.log('Main process starting...');
console.log('Process arguments:', process.argv);
console.log('Process versions:', process.versions);

import { app, BrowserWindow, ipcMain, Menu, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { isDev, isProduction } from './utils/environment';
import { setupLogging } from './utils/logging';
import { setupSecurity } from './utils/security';
import { setupIPC } from './ipc/handlers';
import { AppError } from '@shared/types/result';

// Debug environment
console.log('Environment check:');
console.log('  process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('  process.defaultApp:', process.defaultApp);
console.log('  app.isPackaged:', app.isPackaged);
console.log('  isDev:', isDev);
console.log('  isProduction:', isProduction);

// Logging setup
console.log('Setting up logging...');
const logger = setupLogging();
console.log('Logger initialized:', !!logger);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Track app lifecycle
let appInitialized = false;
let windowCreated = false;

/**
 * Create the main application window
 */
const createMainWindow = async (): Promise<BrowserWindow> => {
  logger.info('Creating main window');

  // Create the browser window
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Don't show until ready
    // icon: path.join(__dirname, '../assets/icon.png'), // TODO: Add icon
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: isProduction,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  // Set up security measures
  setupSecurity(window);

  // Load the application
  console.log('isDev:', isDev);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('__dirname:', __dirname);
  
  // Check if dev server is likely running (port 3000)
  const isDevServerRunning = isDev && process.env.WEBPACK_DEV_SERVER === 'true';
  
  if (isDevServerRunning) {
    // Development: Load from webpack dev server
    console.log('Loading from dev server: http://localhost:3000');
    await window.loadURL('http://localhost:3000');
    
    // Open DevTools in development
    window.webContents.openDevTools();
  } else {
    // Production or development without dev server: Load from built files
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Loading from file:', indexPath);
    try {
      await window.loadFile(indexPath);
    } catch (error) {
      console.error('Failed to load index.html:', error);
      throw error;
    }
    
    // Open DevTools in development mode
    if (isDev) {
      window.webContents.openDevTools();
    }
  }

  // Show window when ready
  window.once('ready-to-show', () => {
    console.log('Window ready to show');
    window.show();
    windowCreated = true;
    logger.info('Window shown successfully');
    
    if (isDev) {
      window.webContents.openDevTools();
    }
  });

  // Handle window closed
  window.on('closed', () => {
    console.log('Window closed event');
    logger.info('Main window closed');
    mainWindow = null;
    windowCreated = false;
  });

  // Monitor window lifecycle
  window.on('close', (event) => {
    console.log('Window close event (before closed)');
    logger.info('Window is closing...');
  });

  window.webContents.on('did-finish-load', () => {
    console.log('Renderer finished loading');
    logger.info('Renderer process loaded');
  });

  window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Renderer failed to load:', errorCode, errorDescription);
    logger.error('Renderer load failed:', { errorCode, errorDescription });
  });

  window.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed:', killed);
    logger.error('Renderer crashed:', { killed });
  });

  window.webContents.on('unresponsive', () => {
    console.error('Renderer process unresponsive');
    logger.error('Renderer unresponsive');
  });

  // Handle external links
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:3000') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return window;
};

/**
 * Set up application menu
 */
const createMenu = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Configuration',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-configuration');
          },
        },
        {
          label: 'Open Configuration',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!mainWindow) return;
            
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'Configuration Files', extensions: ['json', 'yaml', 'yml'] },
                { name: 'All Files', extensions: ['*'] },
              ],
              properties: ['openFile'],
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('menu-open-configuration', result.filePaths[0]);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Import Configuration',
          click: () => {
            mainWindow?.webContents.send('menu-import-configuration');
          },
        },
        {
          label: 'Export Configuration',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu-export-configuration');
          },
        },
        { type: 'separator' },
        {
          role: 'quit',
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Servers',
      submenu: [
        {
          label: 'Start All Servers',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow?.webContents.send('menu-start-all-servers');
          },
        },
        {
          label: 'Stop All Servers',
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => {
            mainWindow?.webContents.send('menu-stop-all-servers');
          },
        },
        {
          label: 'Restart All Servers',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow?.webContents.send('menu-restart-all-servers');
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About MCP Config Manager',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About MCP Config Manager v2',
              message: 'MCP Config Manager v2',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nChrome: ${process.versions.chrome}`,
            });
          },
        },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/claude-code/mcp-config-manager-v2');
          },
        },
      ],
    },
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });

    // Window menu
    (template[4].submenu as Electron.MenuItemConstructorOptions[]).push(
      { type: 'separator' },
      { role: 'front' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

/**
 * Set up auto-updater (production only)
 */
const setupAutoUpdater = (): void => {
  if (!isProduction) return;

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    logger.info('Update available');
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version is available. It will be downloaded in the background.',
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-downloaded', () => {
    logger.info('Update downloaded');
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
};

/**
 * Handle application errors
 */
const setupErrorHandling = (): void => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    
    if (mainWindow) {
      dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
    }
    
    app.quit();
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  });
};

/**
 * Application event handlers
 */

// This method will be called when Electron has finished initialization
console.log('Registering app.whenReady handler...');
app.whenReady().then(async () => {
  console.log('App ready event fired!');
  appInitialized = true;
  
  try {
    logger.info('App ready, initializing...');
    
    // Set up error handling
    setupErrorHandling();
    
    // Create main window
    console.log('Creating main window...');
    mainWindow = await createMainWindow();
    console.log('Main window created:', !!mainWindow);
    
    // Set up application menu
    console.log('Setting up menu...');
    createMenu();
    
    // Set up IPC handlers
    console.log('Setting up IPC handlers...');
    setupIPC();
    
    // Set up auto-updater
    console.log('Setting up auto-updater...');
    setupAutoUpdater();
    
    logger.info('Application initialized successfully');
    console.log('App initialization complete');
    
    // Keep app alive
    setInterval(() => {
      console.log(`App status - Initialized: ${appInitialized}, Window: ${windowCreated}, MainWindow exists: ${!!mainWindow}`);
    }, 5000);
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    logger.error('Failed to initialize application:', error);
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  console.log('All windows closed event');
  logger.info('All windows closed');
  
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    console.log('Not macOS, quitting app...');
    app.quit();
  } else {
    console.log('macOS detected, keeping app alive');
  }
});

// Re-create window when dock icon is clicked on macOS
app.on('activate', async () => {
  console.log('App activate event');
  if (mainWindow === null) {
    console.log('Re-creating main window...');
    mainWindow = await createMainWindow();
  }
});

// Monitor app lifecycle
app.on('before-quit', (event) => {
  console.log('App before-quit event');
  logger.info('App is about to quit');
});

app.on('will-quit', (event) => {
  console.log('App will-quit event');
  logger.info('App will quit');
});

app.on('quit', (event, exitCode) => {
  console.log('App quit event, exit code:', exitCode);
  logger.info('App quit:', { exitCode });
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

// Prevent navigation to external protocols
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
});

export { mainWindow };