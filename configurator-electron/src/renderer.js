import './styles.css';

// Global State
let dirs = {};
let currentIconTarget = null;
let allIcons = [];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  dirs = await window.api.getDirectories();
  setupTabs();
  setupKeyboardShortcuts();
  setupHeaderButtons();
  setupIconModal();

  await loadButtonsTab();
  await loadDialsTab();
  await loadTouchscreenTab();

  updateStatus('Ready', 'success');
});

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => {
    if (t.dataset.tab === tabName) {
      t.classList.remove('tab-inactive');
      t.classList.add('tab-active');
    } else {
      t.classList.remove('tab-active');
      t.classList.add('tab-inactive');
    }
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(tabName + '-tab').classList.remove('hidden');
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 'w') || (e.ctrlKey && e.key === 'q') || e.key === 'Escape') {
      e.preventDefault();
      window.close();
    }

    if (e.ctrlKey && e.key === '1') switchTab('buttons');
    if (e.ctrlKey && e.key === '2') switchTab('dials');
    if (e.ctrlKey && e.key === '3') switchTab('touchscreen');

    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      exportConfig();
    }

    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      importConfig();
    }
  });
}

// ============================================================================
// HEADER BUTTONS
// ============================================================================

function setupHeaderButtons() {
  document.getElementById('export-btn').addEventListener('click', exportConfig);
  document.getElementById('import-btn').addEventListener('click', importConfig);
  document.getElementById('autostart-btn').addEventListener('click', toggleAutostart);
  updateAutostartButton();
}

async function updateAutostartButton() {
  const result = await window.api.checkAutostart();
  const btn = document.getElementById('autostart-btn');
  if (result.success && result.enabled) {
    btn.textContent = '✓ Auto-start ON';
    btn.className = 'btn-success text-sm';
  } else {
    btn.textContent = '⚙️ Auto-start OFF';
    btn.className = 'btn-purple text-sm';
  }
}

async function toggleAutostart() {
  const result = await window.api.checkAutostart();
  const newState = !(result.success && result.enabled);
  await window.api.toggleAutostart(newState);
  await updateAutostartButton();
  updateStatus(newState ? 'Auto-start enabled' : 'Auto-start disabled', 'success');
}

async function exportConfig() {
  const result = await window.api.browseSaveFile({
    title: 'Export Configuration',
    defaultPath: 'streamdeck-config.tar.gz',
    filters: [{ name: 'Tar Archive', extensions: ['tar.gz'] }]
  });

  if (!result.canceled && result.filePath) {
    const cmd = `tar -czf "${result.filePath}" -C "${dirs.streamdeck}" buttons dials touchscreen`;
    const execResult = await window.api.execCommand(cmd);
    if (execResult.success) {
      updateStatus('Configuration exported successfully', 'success');
    } else {
      updateStatus('Export failed', 'error');
    }
  }
}

async function importConfig() {
  const result = await window.api.browseFile({
    title: 'Import Configuration',
    filters: [{ name: 'Tar Archive', extensions: ['tar.gz'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const cmd = `tar -xzf "${result.filePaths[0]}" -C "${dirs.streamdeck}"`;
    const execResult = await window.api.execCommand(cmd);
    if (execResult.success) {
      updateStatus('Configuration imported - reloading...', 'success');
      await Promise.all([loadButtonsTab(), loadDialsTab(), loadTouchscreenTab()]);
      await window.api.restartDaemon();
    } else {
      updateStatus('Import failed', 'error');
    }
  }
}

// ============================================================================
// STATUS BAR
// ============================================================================

function updateStatus(message, type = 'info') {
  const statusBar = document.getElementById('status-text');
  statusBar.textContent = message;
  statusBar.className = '';

  if (type === 'success') statusBar.classList.add('text-green-600');
  else if (type === 'error') statusBar.classList.add('text-red-600');
  else if (type === 'warning') statusBar.classList.add('text-amber-600');
  else statusBar.classList.add('text-gray-700');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fileExists(filePath) {
  return await window.api.fileExists(filePath);
}

async function readFile(filePath) {
  const result = await window.api.readFile(filePath);
  return result.success ? result.content : null;
}

async function writeFile(filePath, content) {
  return await window.api.writeFile(filePath, content);
}

async function deleteFile(filePath) {
  return await window.api.deleteFile(filePath);
}

async function findImageFile(directory, basename) {
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const path = directory + '/' + basename + ext;
    if (await fileExists(path)) return path;
  }
  return null;
}

async function getScriptDescription(scriptPath) {
  const content = await readFile(scriptPath);
  if (!content) return 'Script configured';

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# Description:')) {
      return line.replace('# Description:', '').trim();
    }
  }

  const firstLine = lines.find(l => l.trim() && !l.startsWith('#'));
  if (firstLine) return firstLine.substring(0, 50) + '...';

  return 'Script configured';
}

// ============================================================================
// BUTTONS TAB
// ============================================================================

async function loadButtonsTab() {
  const container = document.getElementById('buttons-container');
  const scrollPos = container.scrollTop; // Save scroll position
  container.innerHTML = '';

  for (let i = 1; i <= 8; i++) {
    const card = await createButtonCard(i);
    container.appendChild(card);
  }

  container.scrollTop = scrollPos; // Restore scroll position

  document.getElementById('apply-button-fontsize').onclick = async () => {
    const fontSize = document.getElementById('button-fontsize-all').value;
    for (let i = 1; i <= 8; i++) {
      await writeFile(dirs.buttons + '/button-' + i + '-fontsize.txt', fontSize);
    }
    updateStatus('Font size ' + fontSize + ' applied to all buttons', 'success');
    await loadButtonsTab();
  };
}

async function createButtonCard(buttonNum) {
  const card = document.createElement('div');
  card.className = 'card fade-in';

  const scriptPath = dirs.buttons + '/button-' + buttonNum + '.sh';
  const imagePath = await findImageFile(dirs.buttons, 'button-' + buttonNum);
  const labelPath = dirs.buttons + '/button-' + buttonNum + '.txt';
  const positionPath = dirs.buttons + '/button-' + buttonNum + '-position.txt';
  const fontsizePath = dirs.buttons + '/button-' + buttonNum + '-fontsize.txt';

  const scriptExists = await fileExists(scriptPath);
  const label = await readFile(labelPath);
  const position = (await readFile(positionPath)) || 'bottom';
  const fontsize = (await readFile(fontsizePath)) || '24';

  let html = '<div class="card-header bg-gradient-to-r from-blue-500 to-indigo-500">Button ' + buttonNum + '</div><div class="space-y-4">';

  html += '<div class="space-y-2">';
  if (scriptExists) {
    const desc = await getScriptDescription(scriptPath);
    html += '<div class="text-green-600 text-sm font-medium">▶ ' + desc + '</div>';
  } else {
    html += '<div class="text-gray-500 text-sm">○ No script assigned</div>';
  }

  if (imagePath) {
    const imgData = await window.api.readImageBase64(imagePath);
    if (imgData.success) {
      const filename = imagePath.split('/').pop();
      html += '<div class="flex items-center gap-2"><img src="' + imgData.data + '" class="w-8 h-8 border-2 border-gray-200 rounded"><span class="text-gray-700 text-sm">🖼 ' + filename + '</span></div>';
    }
  }

  if (label) {
    html += '<div class="text-gray-700 text-sm">🏷 "' + label + '"</div>';
  }
  html += '</div>';

  html += '<div class="border-t border-gray-200"></div>';

  html += '<div><span class="label">Script</span><div class="flex flex-wrap gap-2 mt-2">';
  html += '<button class="btn-primary text-sm" onclick="browseScript(' + buttonNum + ')">📁 Browse</button>';
  html += '<button class="btn-success text-sm" onclick="browseExamples(' + buttonNum + ', \'button\')">📚 Examples</button>';
  html += '<button class="btn-purple text-sm" onclick="recordAction(' + buttonNum + ', \'button\')">⌨️ Record</button>';

  if (scriptExists) {
    html += '<button class="btn-warning text-sm" onclick="editScript(\'' + scriptPath + '\')">✏️ Edit</button>';
    html += '<button class="btn-danger text-sm" onclick="removeScript(' + buttonNum + ')">🗑 Remove</button>';
  }
  html += '</div></div>';

  html += '<div><span class="label">Image</span><div class="flex flex-wrap gap-2 mt-2">';
  html += '<button class="btn-primary text-sm" onclick="browseImage(' + buttonNum + ', \'button\')">🖼 Browse</button>';
  html += '<button class="btn-purple text-sm" onclick="selectIcon(' + buttonNum + ', \'button\')">🎨 Icons</button>';

  if (imagePath) {
    html += '<button class="btn-danger text-sm" onclick="removeImage(' + buttonNum + ', \'button\')">🗑 Remove</button>';
  }
  html += '</div></div>';

  html += '<div><span class="label">Label</span>';
  html += '<div class="flex flex-wrap gap-2 mt-2 items-center">';
  html += '<input type="text" id="button-' + buttonNum + '-label" class="input flex-1" value="' + (label || '') + '" placeholder="Enter label...">';
  html += '<button class="btn-success text-sm" onclick="setLabel(' + buttonNum + ', \'button\')">✓ Set</button>';
  html += '</div>';

  html += '<div class="flex flex-wrap gap-2 mt-2 items-center">';
  html += '<span class="text-gray-700 text-sm font-medium">Position:</span>';
  html += '<select id="button-' + buttonNum + '-position" class="input w-32">';
  html += '<option value="top"' + (position === 'top' ? ' selected' : '') + '>Top</option>';
  html += '<option value="middle"' + (position === 'middle' ? ' selected' : '') + '>Middle</option>';
  html += '<option value="bottom"' + (position === 'bottom' ? ' selected' : '') + '>Bottom</option>';
  html += '</select>';

  html += '<span class="text-gray-700 text-sm font-medium ml-4">Font Size:</span>';
  html += '<input type="number" id="button-' + buttonNum + '-fontsize" class="input w-20" value="' + fontsize + '" min="10" max="60">';
  html += '<button class="btn-primary text-sm" onclick="setFontSize(' + buttonNum + ', \'button\')">Apply</button>';
  html += '</div></div>';

  html += '</div>';
  card.innerHTML = html;
  return card;
}

// ============================================================================
// DIALS TAB
// ============================================================================

async function loadDialsTab() {
  const container = document.getElementById('dials-container');
  const scrollPos = container.scrollTop; // Save scroll position
  container.innerHTML = '';

  for (let i = 1; i <= 4; i++) {
    const card = await createDialCard(i);
    container.appendChild(card);
  }

  container.scrollTop = scrollPos; // Restore scroll position
}

async function createDialCard(dialNum) {
  const card = document.createElement('div');
  card.className = 'card fade-in';

  const actions = [
    { key: 'cw', name: '↻ Clockwise', icon: '🔵' },
    { key: 'ccw', name: '↺ Counter-Clockwise', icon: '🟢' },
    { key: 'press', name: '⬇ Press', icon: '🟡' },
    { key: 'longpress', name: '⏱ Long Press', icon: '🔴' }
  ];

  let html = '<div class="card-header bg-gradient-to-r from-amber-500 to-orange-500">Dial ' + dialNum + '</div><div class="space-y-3">';

  for (const action of actions) {
    const scriptPath = dirs.dials + '/dial-' + dialNum + '-' + action.key + '.sh';
    const scriptExists = await fileExists(scriptPath);

    html += '<div class="action-row">';
    html += '<div class="action-label">' + action.icon + ' ' + action.name + '</div>';

    if (scriptExists) {
      const desc = await getScriptDescription(scriptPath);
      html += '<div class="action-status action-status-configured">' + desc + '</div>';
    } else {
      html += '<div class="action-status">Not configured</div>';
    }

    html += '<button class="btn-secondary text-sm" onclick="browseDialScript(' + dialNum + ', \'' + action.key + '\')">Browse</button>';
    html += '<button class="btn-success text-sm" onclick="browseDialExamples(' + dialNum + ', \'' + action.key + '\')">Examples</button>';
    html += '<button class="btn-purple text-sm" onclick="recordDialAction(' + dialNum + ', \'' + action.key + '\')">Record</button>';

    if (scriptExists) {
      html += '<button class="btn-warning text-sm" onclick="editScript(\'' + scriptPath + '\')">Edit</button>';
      html += '<button class="btn-danger text-sm" onclick="removeDialScript(' + dialNum + ', \'' + action.key + '\')">Remove</button>';
    }

    html += '</div>';
  }

  html += '</div>';
  card.innerHTML = html;
  return card;
}

// ============================================================================
// TOUCHSCREEN TAB
// ============================================================================

async function loadTouchscreenTab() {
  const container = document.getElementById('touchscreen-container');
  const scrollPos = container.scrollTop; // Save scroll position
  container.innerHTML = '';

  for (let i = 1; i <= 4; i++) {
    const card = await createTouchCard(i);
    container.appendChild(card);
  }

  const longSwipeCard = await createLongSwipeCard();
  container.appendChild(longSwipeCard);

  container.scrollTop = scrollPos; // Restore scroll position

  document.getElementById('apply-touch-fontsize').onclick = async () => {
    const fontSize = document.getElementById('touch-fontsize-all').value;
    for (let i = 1; i <= 4; i++) {
      await writeFile(dirs.touch + '/touch-' + i + '-fontsize.txt', fontSize);
    }
    updateStatus('Font size ' + fontSize + ' applied to all zones', 'success');
    await loadTouchscreenTab();
  };
}

async function createTouchCard(zoneNum) {
  const card = document.createElement('div');
  card.className = 'card fade-in';

  const imagePath = await findImageFile(dirs.touch, 'touch-' + zoneNum);
  const labelPath = dirs.touch + '/touch-' + zoneNum + '.txt';
  const positionPath = dirs.touch + '/touch-' + zoneNum + '-position.txt';
  const fontsizePath = dirs.touch + '/touch-' + zoneNum + '-fontsize.txt';

  const label = await readFile(labelPath);
  const position = (await readFile(positionPath)) || 'middle';
  const fontsize = (await readFile(fontsizePath)) || '28';

  let html = '<div class="card-header bg-gradient-to-r from-purple-500 to-pink-500">Touch Zone ' + zoneNum + '</div><div class="space-y-4">';

  html += '<div class="space-y-2">';
  if (imagePath) {
    const imgData = await window.api.readImageBase64(imagePath);
    if (imgData.success) {
      const filename = imagePath.split('/').pop();
      html += '<div class="flex items-center gap-2"><img src="' + imgData.data + '" class="w-8 h-8 border-2 border-gray-200 rounded"><span class="text-gray-700 text-sm">🖼 ' + filename + '</span></div>';
    }
  }
  if (label) {
    html += '<div class="text-gray-700 text-sm">🏷 "' + label + '"</div>';
  }
  html += '</div>';

  html += '<div><span class="label">Image</span><div class="flex flex-wrap gap-2 mt-2">';
  html += '<button class="btn-primary text-sm" onclick="browseImage(' + zoneNum + ', \'touch\')">🖼 Browse</button>';
  html += '<button class="btn-purple text-sm" onclick="selectIcon(' + zoneNum + ', \'touch\')">🎨 Icons</button>';
  if (imagePath) {
    html += '<button class="btn-danger text-sm" onclick="removeImage(' + zoneNum + ', \'touch\')">🗑 Remove</button>';
  }
  html += '</div></div>';

  html += '<div><span class="label">Label</span>';
  html += '<div class="flex flex-wrap gap-2 mt-2 items-center">';
  html += '<input type="text" id="touch-' + zoneNum + '-label" class="input flex-1" value="' + (label || '') + '" placeholder="Enter label...">';
  html += '<button class="btn-success text-sm" onclick="setLabel(' + zoneNum + ', \'touch\')">✓ Set</button>';
  html += '</div>';

  html += '<div class="flex flex-wrap gap-2 mt-2 items-center">';
  html += '<span class="text-gray-700 text-sm font-medium">Position:</span>';
  html += '<select id="touch-' + zoneNum + '-position" class="input w-32">';
  html += '<option value="top"' + (position === 'top' ? ' selected' : '') + '>Top</option>';
  html += '<option value="middle"' + (position === 'middle' ? ' selected' : '') + '>Middle</option>';
  html += '<option value="bottom"' + (position === 'bottom' ? ' selected' : '') + '>Bottom</option>';
  html += '</select>';

  html += '<span class="text-gray-700 text-sm font-medium ml-4">Font Size:</span>';
  html += '<input type="number" id="touch-' + zoneNum + '-fontsize" class="input w-20" value="' + fontsize + '" min="10" max="60">';
  html += '<button class="btn-primary text-sm" onclick="setFontSize(' + zoneNum + ', \'touch\')">Apply</button>';
  html += '</div></div>';

  html += '<div class="border-t border-gray-200"></div>';

  const gestures = [
    { suffix: '', name: '👆 Tap' },
    { suffix: '-longpress', name: '⏱ Long Press' },
    { suffix: '-swipe-up', name: '⬆️ Swipe Up' },
    { suffix: '-swipe-down', name: '⬇️ Swipe Down' },
    { suffix: '-swipe-left', name: '⬅️ Swipe Left' },
    { suffix: '-swipe-right', name: '➡️ Swipe Right' }
  ];

  for (const gesture of gestures) {
    const scriptPath = dirs.touch + '/touch-' + zoneNum + gesture.suffix + '.sh';
    const scriptExists = await fileExists(scriptPath);

    html += '<div class="action-row">';
    html += '<div class="action-label">' + gesture.name + '</div>';

    if (scriptExists) {
      const desc = await getScriptDescription(scriptPath);
      html += '<div class="action-status action-status-configured">' + desc + '</div>';
    } else {
      html += '<div class="action-status">Not configured</div>';
    }

    html += '<button class="btn-secondary text-sm" onclick="browseTouchScript(' + zoneNum + ', \'' + gesture.suffix + '\')">Browse</button>';
    html += '<button class="btn-success text-sm" onclick="browseTouchExamples(' + zoneNum + ', \'' + gesture.suffix + '\')">Examples</button>';
    html += '<button class="btn-purple text-sm" onclick="recordTouchAction(' + zoneNum + ', \'' + gesture.suffix + '\')">Record</button>';

    if (scriptExists) {
      html += '<button class="btn-warning text-sm" onclick="editScript(\'' + scriptPath + '\')">Edit</button>';
      html += '<button class="btn-danger text-sm" onclick="removeTouchScript(' + zoneNum + ', \'' + gesture.suffix + '\')">Remove</button>';
    }

    html += '</div>';
  }

  html += '</div>';
  card.innerHTML = html;
  return card;
}

async function createLongSwipeCard() {
  const card = document.createElement('div');
  card.className = 'card fade-in';

  let html = '<div class="card-header bg-gradient-to-r from-pink-500 to-rose-500">Long Swipes (across >2 zones)</div><div class="space-y-3">';

  for (const direction of ['left', 'right']) {
    const scriptPath = dirs.touch + '/longswipe-' + direction + '.sh';
    const scriptExists = await fileExists(scriptPath);
    const emoji = direction === 'left' ? '⬅️' : '➡️';
    const dirTitle = direction.charAt(0).toUpperCase() + direction.slice(1);

    html += '<div class="action-row">';
    html += '<div class="action-label">' + emoji + ' Long Swipe ' + dirTitle + '</div>';

    if (scriptExists) {
      const desc = await getScriptDescription(scriptPath);
      html += '<div class="action-status action-status-configured">' + desc + '</div>';
    } else {
      html += '<div class="action-status">Not configured</div>';
    }

    html += '<button class="btn-secondary text-sm" onclick="browseLongSwipeScript(\'' + direction + '\')">Browse</button>';
    html += '<button class="btn-success text-sm" onclick="browseLongSwipeExamples(\'' + direction + '\')">Examples</button>';
    html += '<button class="btn-purple text-sm" onclick="recordLongSwipeAction(\'' + direction + '\')">Record</button>';

    if (scriptExists) {
      html += '<button class="btn-warning text-sm" onclick="editScript(\'' + scriptPath + '\')">Edit</button>';
      html += '<button class="btn-danger text-sm" onclick="removeLongSwipeScript(\'' + direction + '\')">Remove</button>';
    }

    html += '</div>';
  }

  html += '</div>';
  card.innerHTML = html;
  return card;
}

// ============================================================================
// GLOBAL ACTION HANDLERS (called from onclick in HTML)
// ============================================================================

window.browseScript = async (num) => {
  const result = await window.api.browseFile({
    title: 'Select Script File',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.buttons + '/button-' + num + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Script copied', 'success');
    await loadButtonsTab();
  }
};

window.removeScript = async (num) => {
  const path = dirs.buttons + '/button-' + num + '.sh';
  await deleteFile(path);
  updateStatus('Script removed', 'success');
  await loadButtonsTab();
};

window.browseImage = async (num, type) => {
  const result = await window.api.browseFile({
    title: 'Select Image File',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dir = type === 'button' ? dirs.buttons : dirs.touch;
    const basename = type === 'button' ? 'button-' + num : 'touch-' + num;
    const ext = result.filePaths[0].split('.').pop();
    const dest = dir + '/' + basename + '.' + ext;

    await window.api.copyFile(result.filePaths[0], dest);
    updateStatus('Image set', 'success');

    if (type === 'button') await loadButtonsTab();
    else await loadTouchscreenTab();
  }
};

window.removeImage = async (num, type) => {
  const dir = type === 'button' ? dirs.buttons : dirs.touch;
  const basename = type === 'button' ? 'button-' + num : 'touch-' + num;

  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const path = dir + '/' + basename + ext;
    if (await fileExists(path)) await deleteFile(path);
  }

  updateStatus('Image removed', 'success');
  if (type === 'button') await loadButtonsTab();
  else await loadTouchscreenTab();
};

window.setLabel = async (num, type) => {
  const prefix = type === 'button' ? 'button' : 'touch';
  const dir = type === 'button' ? dirs.buttons : dirs.touch;

  const label = document.getElementById(prefix + '-' + num + '-label').value;
  const labelPath = dir + '/' + prefix + '-' + num + '.txt';
  const positionPath = dir + '/' + prefix + '-' + num + '-position.txt';

  if (label.trim()) {
    await writeFile(labelPath, label.trim());
  } else {
    await deleteFile(labelPath);
  }

  const position = document.getElementById(prefix + '-' + num + '-position').value;
  await writeFile(positionPath, position);

  updateStatus('Label and position set', 'success');
};

window.setFontSize = async (num, type) => {
  const prefix = type === 'button' ? 'button' : 'touch';
  const dir = type === 'button' ? dirs.buttons : dirs.touch;

  const fontSize = document.getElementById(prefix + '-' + num + '-fontsize').value;
  const path = dir + '/' + prefix + '-' + num + '-fontsize.txt';

  await writeFile(path, fontSize);
  updateStatus('Font size set', 'success');
};

window.selectIcon = (num, type) => {
  currentIconTarget = { num, type };
  showIconModal();
};

window.editScript = async (scriptPath) => {
  await window.api.execCommand('xdg-open "' + scriptPath + '"');
};

window.browseDialScript = async (dialNum, actionKey) => {
  const result = await window.api.browseFile({
    title: 'Select Script File',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.dials + '/dial-' + dialNum + '-' + actionKey + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Script copied', 'success');
    await loadDialsTab();
  }
};

window.removeDialScript = async (dialNum, actionKey) => {
  const path = dirs.dials + '/dial-' + dialNum + '-' + actionKey + '.sh';
  await deleteFile(path);
  updateStatus('Script removed', 'success');
  await loadDialsTab();
};

window.browseTouchScript = async (zoneNum, suffix) => {
  const result = await window.api.browseFile({
    title: 'Select Script File',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.touch + '/touch-' + zoneNum + suffix + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Script copied', 'success');
    await loadTouchscreenTab();
  }
};

window.removeTouchScript = async (zoneNum, suffix) => {
  const path = dirs.touch + '/touch-' + zoneNum + suffix + '.sh';
  await deleteFile(path);
  updateStatus('Script removed', 'success');
  await loadTouchscreenTab();
};

window.browseLongSwipeScript = async (direction) => {
  const result = await window.api.browseFile({
    title: 'Select Script File',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.touch + '/longswipe-' + direction + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Script copied', 'success');
    await loadTouchscreenTab();
  }
};

window.removeLongSwipeScript = async (direction) => {
  const path = dirs.touch + '/longswipe-' + direction + '.sh';
  await deleteFile(path);
  updateStatus('Script removed', 'success');
  await loadTouchscreenTab();
};

// ============================================================================
// EXAMPLES AND RECORDING
// ============================================================================

// Examples - Browse to examples directory
window.browseExamples = async (num, type) => {
  const result = await window.api.browseFile({
    title: 'Select Example Script',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.buttons + '/button-' + num + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Example script copied', 'success');
    await loadButtonsTab();
  }
};

window.browseDialExamples = async (dialNum, actionKey) => {
  const result = await window.api.browseFile({
    title: 'Select Example Script',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.dials + '/dial-' + dialNum + '-' + actionKey + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Example script copied', 'success');
    await loadDialsTab();
  }
};

window.browseTouchExamples = async (zoneNum, suffix) => {
  const result = await window.api.browseFile({
    title: 'Select Example Script',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.touch + '/touch-' + zoneNum + suffix + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Example script copied', 'success');
    await loadTouchscreenTab();
  }
};

window.browseLongSwipeExamples = async (direction) => {
  const result = await window.api.browseFile({
    title: 'Select Example Script',
    defaultPath: dirs.examples,
    filters: [{ name: 'Shell Scripts', extensions: ['sh'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dest = dirs.touch + '/longswipe-' + direction + '.sh';
    await window.api.copyFile(result.filePaths[0], dest);
    await window.api.makeExecutable(dest);
    updateStatus('Example script copied', 'success');
    await loadTouchscreenTab();
  }
};

// Recording - Generate scripts from recorded input
window.recordAction = async (num, type) => {
  const modal = createRecordModal('Button ' + num);
  document.body.appendChild(modal);

  const events = await captureEvents(modal);
  if (events.length > 0) {
    const script = generateScript(events);
    const dest = dirs.buttons + '/button-' + num + '.sh';
    await writeFile(dest, script);
    await window.api.makeExecutable(dest);
    updateStatus('Recorded script saved', 'success');
    await loadButtonsTab();
  }

  document.body.removeChild(modal);
};

window.recordDialAction = async (dialNum, actionKey) => {
  const actionNames = { cw: 'Clockwise', ccw: 'Counter-Clockwise', press: 'Press', longpress: 'Long Press' };
  const modal = createRecordModal('Dial ' + dialNum + ' - ' + actionNames[actionKey]);
  document.body.appendChild(modal);

  const events = await captureEvents(modal);
  if (events.length > 0) {
    const script = generateScript(events);
    const dest = dirs.dials + '/dial-' + dialNum + '-' + actionKey + '.sh';
    await writeFile(dest, script);
    await window.api.makeExecutable(dest);
    updateStatus('Recorded script saved', 'success');
    await loadDialsTab();
  }

  document.body.removeChild(modal);
};

window.recordTouchAction = async (zoneNum, suffix) => {
  const gestureNames = { '': 'Tap', '-longpress': 'Long Press', '-swipe-up': 'Swipe Up', '-swipe-down': 'Swipe Down', '-swipe-left': 'Swipe Left', '-swipe-right': 'Swipe Right' };
  const modal = createRecordModal('Touch Zone ' + zoneNum + ' - ' + gestureNames[suffix]);
  document.body.appendChild(modal);

  const events = await captureEvents(modal);
  if (events.length > 0) {
    const script = generateScript(events);
    const dest = dirs.touch + '/touch-' + zoneNum + suffix + '.sh';
    await writeFile(dest, script);
    await window.api.makeExecutable(dest);
    updateStatus('Recorded script saved', 'success');
    await loadTouchscreenTab();
  }

  document.body.removeChild(modal);
};

window.recordLongSwipeAction = async (direction) => {
  const modal = createRecordModal('Long Swipe ' + direction.charAt(0).toUpperCase() + direction.slice(1));
  document.body.appendChild(modal);

  const events = await captureEvents(modal);
  if (events.length > 0) {
    const script = generateScript(events);
    const dest = dirs.touch + '/longswipe-' + direction + '.sh';
    await writeFile(dest, script);
    await window.api.makeExecutable(dest);
    updateStatus('Recorded script saved', 'success');
    await loadTouchscreenTab();
  }

  document.body.removeChild(modal);
};

function createRecordModal(title) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-2xl w-2/3 max-w-2xl p-6">
      <div class="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg px-4 py-3 rounded-lg mb-4">
        ⌨️ Record Action - ${title}
      </div>
      <div class="mb-4">
        <p class="text-gray-700 mb-2">Press keyboard keys or click mouse buttons to record. Click "Stop & Save" when done.</p>
        <div class="bg-gray-100 border-2 border-gray-300 rounded p-4 min-h-32 max-h-64 overflow-auto font-mono text-sm">
          <div id="recorded-events" class="text-gray-600">Waiting for input...</div>
        </div>
      </div>
      <div class="flex gap-3 justify-end">
        <button id="record-cancel" class="btn-danger">Cancel</button>
        <button id="record-save" class="btn-success">Stop & Save</button>
      </div>
    </div>
  `;
  return modal;
}

function captureEvents(modal) {
  return new Promise((resolve) => {
    const events = [];
    const display = modal.querySelector('#recorded-events');

    const keyHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key;
      const code = e.code;
      const modifiers = [];
      if (e.ctrlKey) modifiers.push('ctrl');
      if (e.shiftKey) modifiers.push('shift');
      if (e.altKey) modifiers.push('alt');
      if (e.metaKey) modifiers.push('super');

      const event = { type: 'key', key, code, modifiers };
      events.push(event);

      const modStr = modifiers.length > 0 ? modifiers.join('+') + '+' : '';
      const displayKey = key === ' ' ? 'Space' : key;
      display.innerHTML += `<div class="text-blue-600">Key: ${modStr}${displayKey}</div>`;
      display.scrollTop = display.scrollHeight;
    };

    const mouseHandler = (e) => {
      if (e.target.closest('#record-cancel') || e.target.closest('#record-save')) return;

      e.preventDefault();
      const button = e.button === 0 ? 'left' : e.button === 1 ? 'middle' : 'right';
      events.push({ type: 'mouse', button });

      display.innerHTML += `<div class="text-green-600">Mouse: ${button} click</div>`;
      display.scrollTop = display.scrollHeight;
    };

    document.addEventListener('keydown', keyHandler);
    document.addEventListener('mousedown', mouseHandler);

    modal.querySelector('#record-save').onclick = () => {
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('mousedown', mouseHandler);
      resolve(events);
    };

    modal.querySelector('#record-cancel').onclick = () => {
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('mousedown', mouseHandler);
      resolve([]);
    };
  });
}

function mapKeyToXdotool(key, code) {
  // Map JavaScript key names to xdotool key names
  const keyMap = {
    ' ': 'space',
    'Enter': 'Return',
    'Escape': 'Escape',
    'Tab': 'Tab',
    'Backspace': 'BackSpace',
    'Delete': 'Delete',
    'Insert': 'Insert',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'Page_Up',
    'PageDown': 'Page_Down',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'PrintScreen': 'Print',
    'ScrollLock': 'Scroll_Lock',
    'Pause': 'Pause',
    'CapsLock': 'Caps_Lock',
    'NumLock': 'Num_Lock',
    'ContextMenu': 'Menu',
    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
    'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
    'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
  };

  // Check if key is in the map
  if (keyMap[key]) {
    return keyMap[key];
  }

  // For single character keys, just lowercase them
  if (key.length === 1) {
    return key.toLowerCase();
  }

  // For anything else, try to use the key as-is
  return key;
}

function generateScript(events) {
  let script = '#!/bin/bash\n';
  script += '# Description: Recorded input sequence\n';
  script += '# Generated by Stream Deck Configurator\n\n';

  for (const event of events) {
    if (event.type === 'key') {
      const xdotoolKey = mapKeyToXdotool(event.key, event.code);
      const modifiers = event.modifiers.join('+');
      const fullKey = modifiers ? modifiers + '+' + xdotoolKey : xdotoolKey;
      script += `xdotool key "${fullKey}"\n`;
    } else if (event.type === 'mouse') {
      const buttonNum = event.button === 'left' ? 1 : event.button === 'middle' ? 2 : 3;
      script += `xdotool click ${buttonNum}\n`;
    }
  }

  return script;
}

// ============================================================================
// ICON SELECTOR MODAL
// ============================================================================

function setupIconModal() {
  document.getElementById('close-icon-modal').addEventListener('click', hideIconModal);
  document.getElementById('icon-category').addEventListener('change', loadIcons);
  document.getElementById('icon-color').addEventListener('change', loadIcons);
  document.getElementById('icon-search').addEventListener('input', filterIcons);
}

async function showIconModal() {
  document.getElementById('icon-modal').classList.remove('hidden');
  document.getElementById('icon-modal').classList.add('flex');
  await loadIcons();
}

function hideIconModal() {
  document.getElementById('icon-modal').classList.add('hidden');
  document.getElementById('icon-modal').classList.remove('flex');
}

async function loadIcons() {
  const category = document.getElementById('icon-category').value;
  const color = document.getElementById('icon-color').value;
  const iconPath = dirs.icons + '/' + category + '/' + color;

  const result = await window.api.listDirectory(iconPath);
  if (result.success) {
    allIcons = result.files.filter(f => f.endsWith('.png'));
    filterIcons();
  } else {
    allIcons = [];
    updateStatus('Icons not found in this category/color', 'warning');
    document.getElementById('icon-grid').innerHTML = '<div class="col-span-6 text-center text-gray-600 py-8">No icons found</div>';
  }
}

function filterIcons() {
  const search = document.getElementById('icon-search').value.toLowerCase();
  const filtered = allIcons.filter(icon => icon.toLowerCase().includes(search));

  const grid = document.getElementById('icon-grid');
  grid.innerHTML = '';

  const displayCount = Math.min(filtered.length, 30);

  for (let i = 0; i < displayCount; i++) {
    const iconName = filtered[i];
    const category = document.getElementById('icon-category').value;
    const color = document.getElementById('icon-color').value;
    const iconPath = dirs.icons + '/' + category + '/' + color + '/' + iconName;

    const item = document.createElement('div');
    item.className = 'icon-item';
    item.title = iconName;
    item.onclick = () => selectIconFile(iconPath);

    window.api.readImageBase64(iconPath).then(result => {
      if (result.success) {
        const img = document.createElement('img');
        img.src = result.data;
        img.className = 'w-12 h-12';
        item.appendChild(img);
      }
    });

    grid.appendChild(item);
  }

  if (displayCount === 0) {
    grid.innerHTML = '<div class="col-span-6 text-center text-gray-600 py-8">No matching icons</div>';
  } else if (filtered.length > 30) {
    grid.innerHTML += '<div class="col-span-6 text-center text-sm text-gray-600 py-4">Showing first 30 of ' + filtered.length + ' icons</div>';
  }
}

async function selectIconFile(iconPath) {
  if (!currentIconTarget) return;

  const { num, type } = currentIconTarget;
  const dir = type === 'button' ? dirs.buttons : dirs.touch;
  const basename = type === 'button' ? 'button-' + num : 'touch-' + num;
  const dest = dir + '/' + basename + '.png';

  await window.api.copyFile(iconPath, dest);
  updateStatus('Icon set', 'success');
  hideIconModal();

  if (type === 'button') await loadButtonsTab();
  else await loadTouchscreenTab();
}
