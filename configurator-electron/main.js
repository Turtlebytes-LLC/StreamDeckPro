const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const STREAMDECK_DIR = path.join(require('os').homedir(), 'streamdeck-actions');
const BUTTONS_DIR = path.join(STREAMDECK_DIR, 'buttons');
const DIALS_DIR = path.join(STREAMDECK_DIR, 'dials');
const TOUCH_DIR = path.join(STREAMDECK_DIR, 'touchscreen');
const EXAMPLES_DIR = path.join(STREAMDECK_DIR, 'examples');
const ICONS_DIR = path.join(STREAMDECK_DIR, 'icons');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#f5f7fa'
  });

  // Load the index.html
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('dist/index.html');
    // Open dev tools to debug
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Read file
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Write file
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete file
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

// List directory
ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get directories
ipcMain.handle('get-directories', async () => {
  return {
    streamdeck: STREAMDECK_DIR,
    buttons: BUTTONS_DIR,
    dials: DIALS_DIR,
    touch: TOUCH_DIR,
    examples: EXAMPLES_DIR,
    icons: ICONS_DIR
  };
});

// Browse for file
ipcMain.handle('browse-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Browse for save file
ipcMain.handle('browse-save-file', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Execute command
ipcMain.handle('exec-command', async (event, command) => {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Make file executable
ipcMain.handle('make-executable', async (event, filePath) => {
  try {
    await fs.chmod(filePath, 0o755);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Copy file
ipcMain.handle('copy-file', async (event, source, destination) => {
  try {
    await fs.copyFile(source, destination);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Read image as base64
ipcMain.handle('read-image-base64', async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return { success: true, data: `data:${mimeType};base64,${base64}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get file stats
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return { success: true, stats: { size: stats.size, mtime: stats.mtime } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Restart daemon
ipcMain.handle('restart-daemon', async () => {
  try {
    await execAsync('systemctl --user restart streamdeck');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check autostart status
ipcMain.handle('check-autostart', async () => {
  try {
    const { stdout } = await execAsync('systemctl --user is-enabled streamdeck 2>/dev/null || echo disabled');
    return { success: true, enabled: stdout.trim() === 'enabled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Toggle autostart
ipcMain.handle('toggle-autostart', async (event, enable) => {
  try {
    const command = enable
      ? 'systemctl --user enable streamdeck'
      : 'systemctl --user disable streamdeck';
    await execAsync(command);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
