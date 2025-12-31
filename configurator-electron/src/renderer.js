import './styles.css';

let dirs = {};
let currentIconTarget = null;
let allIcons = [];
let darkMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  dirs = await window.api.getDirectories();
  initDarkMode();
  setupTabs();
  setupKeyboardShortcuts();
  setupHeaderButtons();
  setupIconModal();

  await loadButtonsTab();
  await loadDialsTab();
  await loadTouchscreenTab();

  showToast('Ready to configure your Stream Deck', 'success');
});

function initDarkMode() {
  darkMode = localStorage.getItem('darkMode') === 'true';
  applyDarkMode();
  
  document.getElementById('theme-toggle').addEventListener('click', () => {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    applyDarkMode();
  });
}

function applyDarkMode() {
  const icon = document.getElementById('theme-icon');
  if (darkMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    icon.textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    icon.textContent = '🌙';
  }
}

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

    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      document.getElementById('theme-toggle').click();
    }
  });
}

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
    btn.innerHTML = '<span>✓</span> Auto-start ON';
    btn.classList.add('bg-green-500/20');
  } else {
    btn.innerHTML = '<span>⚙️</span> Auto-start';
    btn.classList.remove('bg-green-500/20');
  }
}

async function toggleAutostart() {
  const result = await window.api.checkAutostart();
  const newState = !(result.success && result.enabled);
  await window.api.toggleAutostart(newState);
  await updateAutostartButton();
  showToast(newState ? 'Auto-start enabled' : 'Auto-start disabled', 'success');
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
      showToast('Configuration exported successfully', 'success');
    } else {
      showToast('Export failed: ' + execResult.error, 'error');
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
      showToast('Configuration imported - reloading...', 'success');
      await Promise.all([loadButtonsTab(), loadDialsTab(), loadTouchscreenTab()]);
      await window.api.restartDaemon();
    } else {
      showToast('Import failed: ' + execResult.error, 'error');
    }
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const colors = {
    success: 'bg-deck-success',
    error: 'bg-deck-danger', 
    warning: 'bg-deck-warning',
    info: 'bg-deck-primary'
  };

  toast.className = `toast ${colors[type]}`;
  toast.innerHTML = `
    <span class="text-xl">${icons[type]}</span>
    <span class="flex-1">${message}</span>
    <button class="btn-icon hover:bg-white/20 text-white" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);

  updateStatusBar(message, type);
}

function updateStatusBar(message, type = 'info') {
  const statusText = document.getElementById('status-text');
  const indicator = document.getElementById('status-indicator');
  
  statusText.textContent = message;
  statusText.className = '';

  if (type === 'success') {
    statusText.classList.add('text-deck-success');
    indicator.className = 'config-indicator config-indicator-active';
  } else if (type === 'error') {
    statusText.classList.add('text-deck-danger');
    indicator.className = 'config-indicator bg-deck-danger';
  } else if (type === 'warning') {
    statusText.classList.add('text-deck-warning');
    indicator.className = 'config-indicator bg-deck-warning';
  } else {
    statusText.classList.add('text-gray-600', 'dark:text-gray-400');
    indicator.className = 'config-indicator config-indicator-active';
  }
}

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
  for (const ext of ['.png', '.jpg', '.jpeg', '.svg']) {
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
  if (firstLine) return firstLine.substring(0, 40) + (firstLine.length > 40 ? '...' : '');

  return 'Script configured';
}

async function loadButtonsTab() {
  const container = document.getElementById('buttons-container');
  const scrollPos = container.scrollTop;
  container.innerHTML = '';

  for (let i = 1; i <= 8; i++) {
    const card = await createButtonCard(i);
    container.appendChild(card);
  }

  container.scrollTop = scrollPos;

  document.getElementById('apply-button-fontsize').onclick = async () => {
    const fontSize = document.getElementById('button-fontsize-all').value;
    for (let i = 1; i <= 8; i++) {
      await writeFile(dirs.buttons + '/button-' + i + '-fontsize.txt', fontSize);
    }
    showToast(`Font size ${fontSize} applied to all buttons`, 'success');
    await loadButtonsTab();
  };
}

async function createButtonCard(buttonNum) {
  const card = document.createElement('div');
  card.className = 'card animate-fade-in';

  const scriptPath = dirs.buttons + '/button-' + buttonNum + '.sh';
  const imagePath = await findImageFile(dirs.buttons, 'button-' + buttonNum);
  const labelPath = dirs.buttons + '/button-' + buttonNum + '.txt';
  const positionPath = dirs.buttons + '/button-' + buttonNum + '-position.txt';
  const fontsizePath = dirs.buttons + '/button-' + buttonNum + '-fontsize.txt';

  const scriptExists = await fileExists(scriptPath);
  const label = await readFile(labelPath);
  const position = (await readFile(positionPath)) || 'bottom';
  const fontsize = (await readFile(fontsizePath)) || '24';

  let html = `
    <div class="card-header card-header-blue">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">${buttonNum}</span>
      <span>Button ${buttonNum}</span>
      ${scriptExists ? '<span class="badge badge-success ml-auto">Configured</span>' : '<span class="badge badge-warning ml-auto">Empty</span>'}
    </div>
    <div class="space-y-4">
  `;

  html += '<div class="flex items-start gap-4">';
  
  if (imagePath) {
    const imgData = await window.api.readImageBase64(imagePath);
    if (imgData.success) {
      html += `<img src="${imgData.data}" class="image-preview w-16 h-16">`;
    }
  } else {
    html += `<div class="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
      <span class="text-2xl">🖼</span>
    </div>`;
  }

  html += '<div class="flex-1 space-y-1">';
  if (scriptExists) {
    const desc = await getScriptDescription(scriptPath);
    html += `<div class="text-deck-success font-medium flex items-center gap-2">
      <span class="config-indicator config-indicator-active"></span>
      ${desc}
    </div>`;
  } else {
    html += `<div class="text-gray-500 dark:text-gray-400 flex items-center gap-2">
      <span class="config-indicator config-indicator-inactive"></span>
      No script assigned
    </div>`;
  }

  if (label) {
    html += `<div class="text-gray-600 dark:text-gray-400 text-sm">Label: "${label}"</div>`;
  }
  html += '</div></div>';

  html += '<div class="divider"></div>';

  html += `
    <div class="space-y-3">
      <div>
        <span class="label">Script</span>
        <div class="flex flex-wrap gap-2 mt-1">
          <button class="btn-primary text-sm" onclick="browseScript(${buttonNum})">
            <span>📁</span> Browse
          </button>
          <button class="btn-success text-sm" onclick="browseExamples(${buttonNum}, 'button')">
            <span>📚</span> Examples
          </button>
          <button class="btn-purple text-sm" onclick="recordAction(${buttonNum}, 'button')">
            <span>⌨️</span> Record
          </button>
          ${scriptExists ? `
            <button class="btn-warning text-sm" onclick="editScript('${scriptPath}')">
              <span>✏️</span> Edit
            </button>
            <button class="btn-danger text-sm" onclick="removeScript(${buttonNum})">
              <span>🗑</span> Remove
            </button>
          ` : ''}
        </div>
      </div>
      
      <div>
        <span class="label">Image</span>
        <div class="flex flex-wrap gap-2 mt-1">
          <button class="btn-primary text-sm" onclick="browseImage(${buttonNum}, 'button')">
            <span>🖼</span> Browse
          </button>
          <button class="btn-purple text-sm" onclick="selectIcon(${buttonNum}, 'button')">
            <span>🎨</span> Icons
          </button>
          ${imagePath ? `
            <button class="btn-danger text-sm" onclick="removeImage(${buttonNum}, 'button')">
              <span>🗑</span> Remove
            </button>
          ` : ''}
        </div>
      </div>

      <div>
        <span class="label">Label & Style</span>
        <div class="flex flex-wrap gap-2 mt-1 items-center">
          <input type="text" id="button-${buttonNum}-label" class="input flex-1" 
                 value="${label || ''}" placeholder="Enter label...">
          <select id="button-${buttonNum}-position" class="input w-28">
            <option value="top" ${position === 'top' ? 'selected' : ''}>Top</option>
            <option value="middle" ${position === 'middle' ? 'selected' : ''}>Middle</option>
            <option value="bottom" ${position === 'bottom' ? 'selected' : ''}>Bottom</option>
          </select>
          <input type="number" id="button-${buttonNum}-fontsize" class="input w-16 text-center" 
                 value="${fontsize}" min="10" max="60">
          <button class="btn-success text-sm" onclick="setLabel(${buttonNum}, 'button')">
            <span>✓</span> Save
          </button>
        </div>
      </div>
    </div>
  `;

  html += '</div>';
  card.innerHTML = html;
  return card;
}

async function loadDialsTab() {
  const container = document.getElementById('dials-container');
  const scrollPos = container.scrollTop;
  container.innerHTML = '';

  for (let i = 1; i <= 4; i++) {
    const card = await createDialCard(i);
    container.appendChild(card);
  }

  container.scrollTop = scrollPos;
}

async function createDialCard(dialNum) {
  const card = document.createElement('div');
  card.className = 'card animate-fade-in';

  const actions = [
    { key: 'cw', name: 'Clockwise', icon: '↻', color: 'text-blue-500' },
    { key: 'ccw', name: 'Counter-Clockwise', icon: '↺', color: 'text-green-500' },
    { key: 'press', name: 'Press', icon: '⬇', color: 'text-amber-500' },
    { key: 'longpress', name: 'Long Press', icon: '⏱', color: 'text-red-500' }
  ];

  let configuredCount = 0;
  for (const action of actions) {
    const scriptPath = dirs.dials + '/dial-' + dialNum + '-' + action.key + '.sh';
    if (await fileExists(scriptPath)) configuredCount++;
  }

  let html = `
    <div class="card-header card-header-amber">
      <span class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">${dialNum}</span>
      <span>Dial ${dialNum}</span>
      <span class="badge ${configuredCount > 0 ? 'badge-success' : 'badge-warning'} ml-auto">${configuredCount}/4</span>
    </div>
    <div class="space-y-1">
  `;

  for (const action of actions) {
    const scriptPath = dirs.dials + '/dial-' + dialNum + '-' + action.key + '.sh';
    const scriptExists = await fileExists(scriptPath);

    html += `
      <div class="action-row">
        <div class="action-label">
          <span class="${action.color} text-lg">${action.icon}</span>
          ${action.name}
        </div>
        <div class="action-status ${scriptExists ? 'action-status-configured' : ''}">
          ${scriptExists ? await getScriptDescription(scriptPath) : 'Not configured'}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseDialScript(${dialNum}, '${action.key}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseDialExamples(${dialNum}, '${action.key}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordDialAction(${dialNum}, '${action.key}')">Record</button>
          ${scriptExists ? `
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${scriptPath}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeDialScript(${dialNum}, '${action.key}')">Remove</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  html += '</div>';
  card.innerHTML = html;
  return card;
}

async function loadTouchscreenTab() {
  const container = document.getElementById('touchscreen-container');
  const scrollPos = container.scrollTop;
  container.innerHTML = '';

  for (let i = 1; i <= 4; i++) {
    const card = await createTouchCard(i);
    container.appendChild(card);
  }

  const longSwipeCard = await createLongSwipeCard();
  container.appendChild(longSwipeCard);

  container.scrollTop = scrollPos;

  document.getElementById('apply-touch-fontsize').onclick = async () => {
    const fontSize = document.getElementById('touch-fontsize-all').value;
    for (let i = 1; i <= 4; i++) {
      await writeFile(dirs.touch + '/touch-' + i + '-fontsize.txt', fontSize);
    }
    showToast(`Font size ${fontSize} applied to all zones`, 'success');
    await loadTouchscreenTab();
  };
}

async function createTouchCard(zoneNum) {
  const card = document.createElement('div');
  card.className = 'card animate-fade-in';

  const imagePath = await findImageFile(dirs.touch, 'touch-' + zoneNum);
  const labelPath = dirs.touch + '/touch-' + zoneNum + '.txt';
  const positionPath = dirs.touch + '/touch-' + zoneNum + '-position.txt';
  const fontsizePath = dirs.touch + '/touch-' + zoneNum + '-fontsize.txt';

  const label = await readFile(labelPath);
  const position = (await readFile(positionPath)) || 'middle';
  const fontsize = (await readFile(fontsizePath)) || '28';

  const gestures = [
    { suffix: '', name: 'Tap', icon: '👆' },
    { suffix: '-longpress', name: 'Long Press', icon: '⏱' },
    { suffix: '-swipe-up', name: 'Swipe Up', icon: '⬆️' },
    { suffix: '-swipe-down', name: 'Swipe Down', icon: '⬇️' },
    { suffix: '-swipe-left', name: 'Swipe Left', icon: '⬅️' },
    { suffix: '-swipe-right', name: 'Swipe Right', icon: '➡️' }
  ];

  let configuredCount = 0;
  for (const gesture of gestures) {
    const scriptPath = dirs.touch + '/touch-' + zoneNum + gesture.suffix + '.sh';
    if (await fileExists(scriptPath)) configuredCount++;
  }

  let html = `
    <div class="card-header card-header-purple">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">${zoneNum}</span>
      <span>Touch Zone ${zoneNum}</span>
      <span class="badge ${configuredCount > 0 ? 'badge-success' : 'badge-warning'} ml-auto">${configuredCount}/6</span>
    </div>
    <div class="space-y-4">
  `;

  html += '<div class="flex items-start gap-4">';
  
  if (imagePath) {
    const imgData = await window.api.readImageBase64(imagePath);
    if (imgData.success) {
      html += `<img src="${imgData.data}" class="w-24 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700 object-cover">`;
    }
  } else {
    html += `<div class="w-24 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-sm">
      Zone ${zoneNum}
    </div>`;
  }

  html += '<div class="flex-1 space-y-1">';
  if (label) {
    html += `<div class="text-gray-700 dark:text-gray-300 font-medium">Label: "${label}"</div>`;
  }
  html += '</div></div>';

  html += `
    <div class="flex flex-wrap gap-2">
      <button class="btn-primary text-sm" onclick="browseImage(${zoneNum}, 'touch')">
        <span>🖼</span> Browse Image
      </button>
      <button class="btn-purple text-sm" onclick="selectIcon(${zoneNum}, 'touch')">
        <span>🎨</span> Icons
      </button>
      ${imagePath ? `
        <button class="btn-danger text-sm" onclick="removeImage(${zoneNum}, 'touch')">
          <span>🗑</span> Remove
        </button>
      ` : ''}
    </div>
  `;

  html += `
    <div>
      <span class="label">Label & Style</span>
      <div class="flex flex-wrap gap-2 mt-1 items-center">
        <input type="text" id="touch-${zoneNum}-label" class="input flex-1" 
               value="${label || ''}" placeholder="Enter label...">
        <select id="touch-${zoneNum}-position" class="input w-28">
          <option value="top" ${position === 'top' ? 'selected' : ''}>Top</option>
          <option value="middle" ${position === 'middle' ? 'selected' : ''}>Middle</option>
          <option value="bottom" ${position === 'bottom' ? 'selected' : ''}>Bottom</option>
        </select>
        <input type="number" id="touch-${zoneNum}-fontsize" class="input w-16 text-center" 
               value="${fontsize}" min="10" max="60">
        <button class="btn-success text-sm" onclick="setLabel(${zoneNum}, 'touch')">
          <span>✓</span> Save
        </button>
      </div>
    </div>
  `;

  html += '<div class="divider"></div>';
  html += '<div class="space-y-1">';

  for (const gesture of gestures) {
    const scriptPath = dirs.touch + '/touch-' + zoneNum + gesture.suffix + '.sh';
    const scriptExists = await fileExists(scriptPath);

    html += `
      <div class="action-row">
        <div class="action-label">
          <span class="text-lg">${gesture.icon}</span>
          ${gesture.name}
        </div>
        <div class="action-status ${scriptExists ? 'action-status-configured' : ''}">
          ${scriptExists ? await getScriptDescription(scriptPath) : 'Not configured'}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseTouchScript(${zoneNum}, '${gesture.suffix}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseTouchExamples(${zoneNum}, '${gesture.suffix}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordTouchAction(${zoneNum}, '${gesture.suffix}')">Record</button>
          ${scriptExists ? `
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${scriptPath}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeTouchScript(${zoneNum}, '${gesture.suffix}')">Remove</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  html += '</div></div>';
  card.innerHTML = html;
  return card;
}

async function createLongSwipeCard() {
  const card = document.createElement('div');
  card.className = 'card animate-fade-in';

  let html = `
    <div class="card-header card-header-rose">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">↔️</span>
      <span>Long Swipes</span>
      <span class="text-sm font-normal ml-2 opacity-80">Across 2+ zones</span>
    </div>
    <div class="space-y-1">
  `;

  for (const direction of ['left', 'right']) {
    const scriptPath = dirs.touch + '/longswipe-' + direction + '.sh';
    const scriptExists = await fileExists(scriptPath);
    const emoji = direction === 'left' ? '⬅️' : '➡️';
    const dirTitle = direction.charAt(0).toUpperCase() + direction.slice(1);

    html += `
      <div class="action-row">
        <div class="action-label">
          <span class="text-lg">${emoji}</span>
          Long Swipe ${dirTitle}
        </div>
        <div class="action-status ${scriptExists ? 'action-status-configured' : ''}">
          ${scriptExists ? await getScriptDescription(scriptPath) : 'Not configured'}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseLongSwipeScript('${direction}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseLongSwipeExamples('${direction}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordLongSwipeAction('${direction}')">Record</button>
          ${scriptExists ? `
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${scriptPath}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeLongSwipeScript('${direction}')">Remove</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  html += '</div>';
  card.innerHTML = html;
  return card;
}

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
    showToast('Script assigned to Button ' + num, 'success');
    await loadButtonsTab();
  }
};

window.removeScript = async (num) => {
  const path = dirs.buttons + '/button-' + num + '.sh';
  await deleteFile(path);
  showToast('Script removed from Button ' + num, 'success');
  await loadButtonsTab();
};

window.browseImage = async (num, type) => {
  const result = await window.api.browseFile({
    title: 'Select Image File',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dir = type === 'button' ? dirs.buttons : dirs.touch;
    const basename = type === 'button' ? 'button-' + num : 'touch-' + num;
    const ext = result.filePaths[0].split('.').pop();
    const dest = dir + '/' + basename + '.' + ext;

    await window.api.copyFile(result.filePaths[0], dest);
    showToast('Image set', 'success');

    if (type === 'button') await loadButtonsTab();
    else await loadTouchscreenTab();
  }
};

window.removeImage = async (num, type) => {
  const dir = type === 'button' ? dirs.buttons : dirs.touch;
  const basename = type === 'button' ? 'button-' + num : 'touch-' + num;

  for (const ext of ['.png', '.jpg', '.jpeg', '.svg']) {
    const path = dir + '/' + basename + ext;
    if (await fileExists(path)) await deleteFile(path);
  }

  showToast('Image removed', 'success');
  if (type === 'button') await loadButtonsTab();
  else await loadTouchscreenTab();
};

window.setLabel = async (num, type) => {
  const prefix = type === 'button' ? 'button' : 'touch';
  const dir = type === 'button' ? dirs.buttons : dirs.touch;

  const label = document.getElementById(prefix + '-' + num + '-label').value;
  const labelPath = dir + '/' + prefix + '-' + num + '.txt';
  const positionPath = dir + '/' + prefix + '-' + num + '-position.txt';
  const fontsizePath = dir + '/' + prefix + '-' + num + '-fontsize.txt';

  if (label.trim()) {
    await writeFile(labelPath, label.trim());
  } else {
    await deleteFile(labelPath);
  }

  const position = document.getElementById(prefix + '-' + num + '-position').value;
  await writeFile(positionPath, position);

  const fontsize = document.getElementById(prefix + '-' + num + '-fontsize').value;
  await writeFile(fontsizePath, fontsize);

  showToast('Settings saved', 'success');
};

window.selectIcon = (num, type) => {
  currentIconTarget = { num, type };
  showIconModal();
};

window.editScript = async (scriptPath) => {
  await window.api.execCommand('xdg-open "' + scriptPath + '"');
  showToast('Opening script in editor', 'info');
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
    showToast('Script assigned', 'success');
    await loadDialsTab();
  }
};

window.removeDialScript = async (dialNum, actionKey) => {
  const path = dirs.dials + '/dial-' + dialNum + '-' + actionKey + '.sh';
  await deleteFile(path);
  showToast('Script removed', 'success');
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
    showToast('Script assigned', 'success');
    await loadTouchscreenTab();
  }
};

window.removeTouchScript = async (zoneNum, suffix) => {
  const path = dirs.touch + '/touch-' + zoneNum + suffix + '.sh';
  await deleteFile(path);
  showToast('Script removed', 'success');
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
    showToast('Script assigned', 'success');
    await loadTouchscreenTab();
  }
};

window.removeLongSwipeScript = async (direction) => {
  const path = dirs.touch + '/longswipe-' + direction + '.sh';
  await deleteFile(path);
  showToast('Script removed', 'success');
  await loadTouchscreenTab();
};

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
    showToast('Example script assigned', 'success');
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
    showToast('Example script assigned', 'success');
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
    showToast('Example script assigned', 'success');
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
    showToast('Example script assigned', 'success');
    await loadTouchscreenTab();
  }
};

window.recordAction = async (num, type) => {
  const modal = createRecordModal('Button ' + num);
  document.body.appendChild(modal);

  const events = await captureEvents(modal);
  if (events.length > 0) {
    const script = generateScript(events);
    const dest = dirs.buttons + '/button-' + num + '.sh';
    await writeFile(dest, script);
    await window.api.makeExecutable(dest);
    showToast('Recorded ' + events.length + ' actions', 'success');
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
    showToast('Recorded ' + events.length + ' actions', 'success');
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
    showToast('Recorded ' + events.length + ' actions', 'success');
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
    showToast('Recorded ' + events.length + ' actions', 'success');
    await loadTouchscreenTab();
  }

  document.body.removeChild(modal);
};

function createRecordModal(title) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content w-2/3 max-w-2xl">
      <div class="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg px-6 py-4 flex items-center gap-3">
        <span class="text-2xl">⌨️</span>
        <span>Record Action - ${title}</span>
      </div>
      <div class="p-6">
        <p class="text-gray-700 dark:text-gray-300 mb-4">Press keyboard keys or click mouse buttons. Click "Stop & Save" when done.</p>
        <div class="bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 min-h-32 max-h-64 overflow-auto font-mono text-sm">
          <div id="recorded-events" class="text-gray-500 dark:text-gray-400">Waiting for input...</div>
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 pb-6">
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
      display.innerHTML += `<div class="text-blue-600 dark:text-blue-400">Key: ${modStr}${displayKey}</div>`;
      display.scrollTop = display.scrollHeight;
    };

    const mouseHandler = (e) => {
      if (e.target.closest('#record-cancel') || e.target.closest('#record-save')) return;

      e.preventDefault();
      const button = e.button === 0 ? 'left' : e.button === 1 ? 'middle' : 'right';
      events.push({ type: 'mouse', button });

      display.innerHTML += `<div class="text-green-600 dark:text-green-400">Mouse: ${button} click</div>`;
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

  if (keyMap[key]) return keyMap[key];
  if (key.length === 1) return key.toLowerCase();
  return key;
}

function generateScript(events) {
  let script = '#!/bin/bash\n\n';

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

function setupIconModal() {
  document.getElementById('close-icon-modal').addEventListener('click', hideIconModal);
  document.getElementById('icon-category').addEventListener('change', loadIcons);
  document.getElementById('icon-color').addEventListener('change', loadIcons);
  document.getElementById('icon-search').addEventListener('input', filterIcons);
}

async function showIconModal() {
  const modal = document.getElementById('icon-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  await loadIcons();
}

function hideIconModal() {
  const modal = document.getElementById('icon-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
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
    const grid = document.getElementById('icon-grid');
    grid.innerHTML = `
      <div class="col-span-6 empty-state">
        <div class="empty-state-icon">📭</div>
        <div>No icons found in this category/color</div>
        <div class="text-sm mt-2">Try a different combination</div>
      </div>
    `;
  }
}

function filterIcons() {
  const search = document.getElementById('icon-search').value.toLowerCase();
  const filtered = allIcons.filter(icon => icon.toLowerCase().includes(search));

  const grid = document.getElementById('icon-grid');
  grid.innerHTML = '';

  const displayCount = Math.min(filtered.length, 48);

  for (let i = 0; i < displayCount; i++) {
    const iconName = filtered[i];
    const category = document.getElementById('icon-category').value;
    const color = document.getElementById('icon-color').value;
    const iconPath = dirs.icons + '/' + category + '/' + color + '/' + iconName;

    const item = document.createElement('div');
    item.className = 'icon-item group relative';
    item.title = iconName.replace('.png', '');
    item.onclick = () => selectIconFile(iconPath);

    window.api.readImageBase64(iconPath).then(result => {
      if (result.success) {
        const img = document.createElement('img');
        img.src = result.data;
        img.className = 'w-10 h-10';
        item.appendChild(img);
      }
    });

    grid.appendChild(item);
  }

  if (displayCount === 0) {
    grid.innerHTML = `
      <div class="col-span-6 empty-state">
        <div class="empty-state-icon">🔍</div>
        <div>No matching icons</div>
      </div>
    `;
  } else if (filtered.length > 48) {
    const more = document.createElement('div');
    more.className = 'col-span-6 text-center text-sm text-gray-500 dark:text-gray-400 py-4';
    more.textContent = `Showing first 48 of ${filtered.length} icons. Refine your search to see more.`;
    grid.appendChild(more);
  }
}

async function selectIconFile(iconPath) {
  if (!currentIconTarget) return;

  const { num, type } = currentIconTarget;
  const dir = type === 'button' ? dirs.buttons : dirs.touch;
  const basename = type === 'button' ? 'button-' + num : 'touch-' + num;
  const dest = dir + '/' + basename + '.png';

  await window.api.copyFile(iconPath, dest);
  showToast('Icon applied', 'success');
  hideIconModal();

  if (type === 'button') await loadButtonsTab();
  else await loadTouchscreenTab();
}
