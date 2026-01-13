const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('api', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  listDirectoryRecursive: (dirPath) => ipcRenderer.invoke('list-directory-recursive', dirPath),
  copyFile: (source, dest) => ipcRenderer.invoke('copy-file', source, dest),
  makeExecutable: (filePath) => ipcRenderer.invoke('make-executable', filePath),
  readImageBase64: (filePath) => ipcRenderer.invoke('read-image-base64', filePath),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),

  // Directory paths
  getDirectories: () => ipcRenderer.invoke('get-directories'),

  // Dialogs
  browseFile: (options) => ipcRenderer.invoke('browse-file', options),
  browseSaveFile: (options) => ipcRenderer.invoke('browse-save-file', options),
  selectFile: (extensions) => ipcRenderer.invoke('select-file', extensions),

  // System commands
  execCommand: (command) => ipcRenderer.invoke('exec-command', command),
  restartDaemon: () => ipcRenderer.invoke('restart-daemon'),
  checkAutostart: () => ipcRenderer.invoke('check-autostart'),
  toggleAutostart: (enable) => ipcRenderer.invoke('toggle-autostart', enable),

  // Window operations
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Chrome profiles
  listChromeProfiles: () => ipcRenderer.invoke('list-chrome-profiles'),

  // System monitoring
  getCpuUsage: () => ipcRenderer.invoke('get-cpu-usage'),

  // Macro recording
  recordMacro: (buttonNum, elementType) => ipcRenderer.invoke('record-macro', buttonNum, elementType),
});
