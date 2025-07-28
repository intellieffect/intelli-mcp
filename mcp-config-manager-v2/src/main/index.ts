/**
 * Simple Electron main process for JSON config editor
 */

import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { isDev } from './utils/environment';
import { setupLogging } from './utils/logging';
import { setupSecurity } from './utils/security';
import { setupIPC } from './ipc/handlers';

const logger = setupLogging();

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
const createMainWindow = async (): Promise<BrowserWindow> => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
  });

  // Set up security measures
  setupSecurity(window);

  // Load the application
  if (isDev && process.env.WEBPACK_DEV_SERVER === 'true') {
    await window.loadURL('http://localhost:3000');
    window.webContents.openDevTools();
  } else {
    await window.loadFile(path.join(__dirname, 'index.html'));
    if (isDev) {
      window.webContents.openDevTools();
    }
  }

  // Show window when ready
  window.once('ready-to-show', () => {
    window.show();
    logger.info('Window shown successfully');
  });

  // Handle window closed
  window.on('closed', () => {
    mainWindow = null;
  });

  return window;
};

/**
 * Create simple menu
 */
const createMenu = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
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
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
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
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

/**
 * App event handlers
 */
app.whenReady().then(async () => {
  try {
    // Create main window
    mainWindow = await createMainWindow();
    
    // Set up menu
    createMenu();
    
    // Set up IPC handlers
    setupIPC();
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window on macOS
app.on('activate', async () => {
  if (mainWindow === null) {
    mainWindow = await createMainWindow();
  }
});

export { mainWindow };