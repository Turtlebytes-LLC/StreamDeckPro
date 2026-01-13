const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

// Use the parent directory of configurator-electron (the project root)
const STREAMDECK_DIR = path.join(__dirname, '..');
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
    backgroundColor: '#2b2b2b'  // Dark theme background
  });

  // Remove menu bar
  mainWindow.setMenu(null);

  // Load the new official-style UI
  mainWindow.loadFile('index-v2.html');

  // Open dev tools for debugging (optional)
  // mainWindow.webContents.openDevTools();
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

// List directory recursively
ipcMain.handle('list-directory-recursive', async (event, dirPath) => {
  try {
    const files = [];

    async function walkDir(currentPath, relativePath = '') {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          await walkDir(fullPath, relPath);
        } else {
          files.push(relPath);
        }
      }
    }

    await walkDir(dirPath);
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

// Close window
ipcMain.handle('close-window', async () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Select file dialog
ipcMain.handle('select-file', async (event, extensions) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Supported Files', extensions: extensions || ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return { success: true, filePath: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// List Chrome profiles
ipcMain.handle('list-chrome-profiles', async () => {
  try {
    const chromeConfigPath = path.join(os.homedir(), '.config', 'google-chrome');

    // Check if Chrome config directory exists
    try {
      await fs.access(chromeConfigPath);
    } catch {
      return { success: true, profiles: [] };
    }

    const entries = await fs.readdir(chromeConfigPath, { withFileTypes: true });
    const profiles = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name;
        // Check for profile directories (Default, Profile 1, Profile 2, etc.)
        if (name === 'Default' || name.startsWith('Profile ')) {
          // Try to read profile name from Preferences file
          const prefsPath = path.join(chromeConfigPath, name, 'Preferences');
          try {
            const prefsContent = await fs.readFile(prefsPath, 'utf-8');
            const prefs = JSON.parse(prefsContent);
            const profileName = prefs.profile?.name || name;
            profiles.push({
              directory: name,
              displayName: `${profileName} (${name})`
            });
          } catch {
            // If we can't read preferences, just use the directory name
            profiles.push({
              directory: name,
              displayName: name
            });
          }
        }
      }
    }

    return { success: true, profiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// CPU usage tracking
let previousCpuUsage = null;

function getCpuUsage() {
  const cpus = os.cpus();

  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;

  if (!previousCpuUsage) {
    previousCpuUsage = { idle, total };
    return 0;
  }

  const idleDifference = idle - previousCpuUsage.idle;
  const totalDifference = total - previousCpuUsage.total;
  const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);

  previousCpuUsage = { idle, total };

  return percentageCPU;
}

// Get CPU usage
ipcMain.handle('get-cpu-usage', async () => {
  try {
    const usage = getCpuUsage();
    return { success: true, usage };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Record macro
ipcMain.handle('record-macro', async (event, buttonNum, elementType = 'button') => {
  try {
    const macroFile = path.join(STREAMDECK_DIR, 'macros', `${elementType}-${buttonNum}.json`);
    const recorderScript = path.join(STREAMDECK_DIR, 'utils', 'macro-recorder.py');

    // Ensure macros directory exists
    const macrosDir = path.join(STREAMDECK_DIR, 'macros');
    try {
      await fs.mkdir(macrosDir, { recursive: true });
    } catch (err) {
      // Directory may already exist
    }

    // Detect available terminal emulator
    let terminal = null;
    const terminals = [
      { cmd: 'konsole', args: '-e' },
      { cmd: 'gnome-terminal', args: '--' },
      { cmd: 'xfce4-terminal', args: '-e' },
      { cmd: 'xterm', args: '-e' },
      { cmd: 'alacritty', args: '-e' },
      { cmd: 'kitty', args: '-e' },
      { cmd: 'terminator', args: '-e' }
    ];

    for (const term of terminals) {
      try {
        await execAsync(`which ${term.cmd}`);
        terminal = term;
        break;
      } catch {
        // Terminal not found, try next
      }
    }

    if (!terminal) {
      return { success: false, error: 'No terminal emulator found. Please install konsole, gnome-terminal, or xterm.' };
    }

    // Run the recorder in a new terminal window
    const command = `${terminal.cmd} ${terminal.args} bash -c "python3 '${recorderScript}' '${macroFile}'; echo ''; echo 'Press ENTER to close...'; read"`;

    await execAsync(command);

    // Wait a moment and check if file was created
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await fs.access(macroFile);
      return { success: true, macroFile };
    } catch {
      return { success: false, error: 'Macro recording cancelled or failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});
