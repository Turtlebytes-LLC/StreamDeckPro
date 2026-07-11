// Stream Deck Configurator - Official UI Style
// Renderer process for Electron

// State management
let selectedElement = null;
let dirs = {};
let device = null;
let codeEditor = null;
let currentScriptPath = null;
let pendingScriptAssignment = null;
let cpuChart = null;
let cpuData = [];

// ── Inline SVG icon set (Lucide-style, themable via currentColor) ──────────
function svgIcon(inner, sw = 2) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
const ACTION_ICONS = {
  examples: svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>'),
  dev:      svgIcon('<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>'),
  buttons:  svgIcon('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="2.5"/>'),
  dials:    svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 3v4"/>'),
  touch:    svgIcon('<path d="M8 13V5a2 2 0 0 1 4 0v6"/><path d="M12 11V4a2 2 0 0 1 4 0v7"/><path d="M16 11.5V9a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.66-4L5 13a2 2 0 0 1 3.5-2"/>'),
};
function actionIcon(category) { return ACTION_ICONS[category] || ACTION_ICONS.examples; }

const EMPTY_ICONS = {
  search: svgIcon('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 1.7),
  error:  svgIcon('<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>', 1.7),
  folder: svgIcon('<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>', 1.7),
};

// ── Live daemon/device status chip in the header ──────────────────────────
async function updateDeviceStatus() {
  const chip = document.getElementById('device-status-chip');
  const text = document.getElementById('device-status-text');
  if (!chip || !text) return;
  try {
    const res = await window.api.execCommand('systemctl --user is-active streamdeck 2>/dev/null || echo inactive');
    const active = res && res.success && (res.stdout || '').trim() === 'active';
    if (active) {
      const name = (device && (device.device_type || device.deviceType)) || 'Stream Deck';
      chip.className = 'status-chip connected';
      text.innerHTML = `Connected&nbsp;&middot;&nbsp;<span class="dev-name">${name}</span>`;
    } else {
      chip.className = 'status-chip disconnected';
      text.textContent = 'Daemon offline';
    }
  } catch (e) {
    chip.className = 'status-chip disconnected';
    text.textContent = 'Status unknown';
  }
}

// Initialize the application
async function init() {
  console.log('Initializing Stream Deck Configurator...');

  try {
    // Check if API is available
    if (!window.api) {
      throw new Error('Electron API not available. Make sure preload.js is loaded.');
    }

    // Get directory paths from main process
    dirs = await window.api.getDirectories();
    console.log('Directories loaded:', dirs);

    if (!dirs || !dirs.buttons) {
      throw new Error('Directory paths not loaded correctly');
    }

    // Detect device type
    device = await detectDevice();
    console.log('Device detected:', device);

    // Render the deck preview
    await renderDeckPreview();
    console.log('Deck preview rendered');

    // Setup event listeners
    setupEventListeners();
    console.log('Event listeners setup');

    // Load profiles into the selector
    await loadProfiles();
    console.log('Profiles loaded');

    // Load categories
    loadCategories();
    console.log('Categories loaded');

    // Load actions list
    loadActions();
    console.log('Actions loaded');

    // Live daemon status chip (poll every 5s)
    updateDeviceStatus();
    setInterval(updateDeviceStatus, 5000);

    showToast('Stream Deck configurator ready!', 'success');
  } catch (error) {
    console.error('Initialization error:', error);
    console.error('Error stack:', error.stack);
    showToast(`Error: ${error.message}`, 'error');

    // Show error in the UI
    const preview = document.getElementById('deck-preview');
    if (preview) {
      preview.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${EMPTY_ICONS.error}</div>
          <div class="empty-state-title">Initialization Error</div>
          <div class="empty-state-description">${error.message}</div>
          <div class="empty-state-description" style="margin-top: 16px; font-size: 12px; color: #666;">
            Check the console (F12) for more details
          </div>
        </div>
      `;
    }
  }
}

// Detect device type (defaults to Stream Deck Plus)
async function detectDevice() {
  try {
    // Try to find device-info.json in the project root
    const projectRoot = dirs.buttons ? dirs.buttons.replace('/buttons', '') : '';
    const infoPath = `${projectRoot}/device-info.json`;

    if (await window.api.fileExists(infoPath)) {
      const result = await window.api.readFile(infoPath);
      if (result.success && result.content) {
        const deviceInfo = JSON.parse(result.content);
        console.log('Loaded device info from file:', deviceInfo);
        return deviceInfo;
      }
    }
  } catch (error) {
    console.warn('Could not read device info, using default:', error);
  }

  // Default to Stream Deck Plus
  console.log('Using default device configuration (Stream Deck Plus)');
  return {
    device_type: "Stream Deck Plus",
    buttons: 8,
    dials: 4,
    touchscreen: { width: 800, height: 100, zones: 4 }
  };
}

// Render the complete deck preview
async function renderDeckPreview() {
  const buttonsGrid = document.getElementById('buttons-grid');
  const dialsGrid = document.getElementById('dials-grid');
  const touchPreview = document.getElementById('touchscreen-preview');

  // Clear existing content
  buttonsGrid.innerHTML = '';
  dialsGrid.innerHTML = '';
  touchPreview.innerHTML = '';

  // Render buttons
  if (device.buttons > 0) {
    const cols = device.buttons === 6 ? 3 : 4;
    buttonsGrid.className = `grid grid-cols-${cols} gap-2 mb-4`;

    for (let i = 1; i <= device.buttons; i++) {
      const button = await createButtonElement(i);
      buttonsGrid.appendChild(button);
    }
  }

  // Render dials
  if (device.dials > 0) {
    dialsGrid.className = `grid grid-cols-${device.dials} gap-4 mb-4`;

    for (let i = 1; i <= device.dials; i++) {
      const dial = createDialElement(i);
      dialsGrid.appendChild(dial);
    }
  }

  // Render touchscreen
  if (device.touchscreen && device.touchscreen.zones > 0) {
    touchPreview.className = `grid grid-cols-${device.touchscreen.zones} gap-2`;

    for (let i = 1; i <= device.touchscreen.zones; i++) {
      const zone = await createTouchZoneElement(i);
      touchPreview.appendChild(zone);
    }
  }
}

// Create a button element
async function createButtonElement(num) {
  const button = document.createElement('div');
  button.className = 'deck-button';
  button.dataset.type = 'button';
  button.dataset.num = num;

  try {
    // Check for existing image
    const imagePath = await findImageFile(`${dirs.buttons}/button-${num}`);
    if (imagePath) {
      const result = await window.api.readImageBase64(imagePath);
      if (result.success && result.data) {
        const img = document.createElement('img');
        img.src = result.data;
        img.onerror = () => {
          console.warn(`Failed to load image for button ${num}`);
          img.remove();
          const numSpan = document.createElement('span');
          numSpan.className = 'button-number';
          numSpan.textContent = num;
          button.appendChild(numSpan);
        };
        button.appendChild(img);
      } else {
        // Show button number if image load failed
        const numSpan = document.createElement('span');
        numSpan.className = 'button-number';
        numSpan.textContent = num;
        button.appendChild(numSpan);
      }
    } else {
      // Show button number if no image
      const numSpan = document.createElement('span');
      numSpan.className = 'button-number';
      numSpan.textContent = num;
      button.appendChild(numSpan);
    }

    // Check for label
    const labelPath = `${dirs.buttons}/button-${num}.txt`;
    if (await window.api.fileExists(labelPath)) {
      const result = await window.api.readFile(labelPath);
      if (result.success && result.content.trim()) {
        const label = document.createElement('div');
        label.className = 'button-label';
        label.textContent = result.content.trim();
        button.appendChild(label);
      }
    }
  } catch (error) {
    console.error(`Error creating button ${num}:`, error);
    // Show button number as fallback
    const numSpan = document.createElement('span');
    numSpan.className = 'button-number';
    numSpan.textContent = num;
    button.appendChild(numSpan);
  }

  // Add click handler
  button.addEventListener('click', () => selectElement(button, 'button', num));
  
  setupDragAndDrop(button, 'button', num);

  return button;
}

// Create a dial element
function createDialElement(num) {
  const dial = document.createElement('div');
  dial.className = 'deck-dial';
  dial.dataset.type = 'dial';
  dial.dataset.num = num;

  const numSpan = document.createElement('span');
  numSpan.className = 'dial-number';
  numSpan.textContent = num;
  dial.appendChild(numSpan);

  // Add click handler
  dial.addEventListener('click', () => selectElement(dial, 'dial', num));
  
  setupDragAndDrop(dial, 'dial', num);

  return dial;
}

// Create a touchscreen zone element
async function createTouchZoneElement(num) {
  const zone = document.createElement('div');
  zone.className = 'deck-touch-zone';
  zone.dataset.type = 'touch';
  zone.dataset.num = num;

  // Check for existing image
  const imagePath = await findImageFile(`${dirs.touch}/touch-${num}`);
  if (imagePath) {
    const result = await window.api.readImageBase64(imagePath);
    if (result.success) {
      const img = document.createElement('img');
      img.src = result.data;
      zone.appendChild(img);
    }
  } else {
    // Show zone number if no image
    const numSpan = document.createElement('span');
    numSpan.className = 'zone-number';
    numSpan.textContent = `Z${num}`;
    zone.appendChild(numSpan);
  }

  // Check for label
  const labelPath = `${dirs.touch}/touch-${num}.txt`;
  if (await window.api.fileExists(labelPath)) {
    const result = await window.api.readFile(labelPath);
    if (result.success && result.content.trim()) {
      const label = document.createElement('div');
      label.className = 'touch-label';
      label.textContent = result.content.trim();
      zone.appendChild(label);
    }
  }

  // Add click handler
  zone.addEventListener('click', () => selectElement(zone, 'touch', num));
  
  setupDragAndDrop(zone, 'touch', num);

  return zone;
}

// Find image file with any extension
async function findImageFile(basePath) {
  const extensions = ['.png', '.jpg', '.jpeg', '.svg'];

  for (const ext of extensions) {
    const path = basePath + ext;
    if (await window.api.fileExists(path)) {
      return path;
    }
  }

  return null;
}

// Select an element for configuration
function selectElement(element, type, num) {
  // Deselect previous
  document.querySelectorAll('.deck-button, .deck-dial, .deck-touch-zone')
    .forEach(el => el.classList.remove('selected'));

  // Select new
  element.classList.add('selected');
  selectedElement = { element, type, num };

  // Show configuration panel
  showConfigPanel(type, num);
}

// Show the configuration panel
async function showConfigPanel(type, num) {
  const panel = document.getElementById('element-panel');
  const title = document.getElementById('element-title');

  const typeNames = { button: 'Button', dial: 'Dial', touch: 'Touch Zone' };
  title.textContent = `${typeNames[type]} ${num}`;

  if (type === 'dial') {
    await showDialPanel(num);
  } else if (type === 'touch') {
    await showTouchPanel(num);
  } else if (type === 'button') {
    await showButtonPanel(num);
  } else {
    await loadElementConfig(type, num);
  }

  // Show panel with animation
  panel.classList.remove('hidden');
  panel.classList.add('slide-in');
}

async function showDialPanel(num) {
  const panelContent = document.querySelector('#element-panel .p-5.space-y-6');
  
  const dialActions = [
    { key: 'cw', name: 'Rotate Clockwise', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>', color: 'blue' },
    { key: 'ccw', name: 'Rotate Counter-Clockwise', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>', color: 'green' },
    { key: 'press', name: 'Press', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>', color: 'amber' },
    { key: 'longpress', name: 'Long Press', icon: '⏱', color: 'red' }
  ];
  
  let html = '';
  
  for (const action of dialActions) {
    const scriptPath = `${dirs.dials}/dial-${num}-${action.key}.sh`;
    const scriptExists = await window.api.fileExists(scriptPath);
    const scriptName = scriptExists ? scriptPath.split('/').pop() : 'No script assigned';
    
    const colorClasses = {
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-green-600 hover:bg-green-700',
      amber: 'bg-amber-600 hover:bg-amber-700',
      red: 'bg-red-600 hover:bg-red-700'
    };
    
    html += `
      <div class="pt-4 ${action.key !== 'cw' ? 'border-t border-[#232c3a]' : ''}">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-2xl">${action.icon}</span>
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">${action.name}</label>
        </div>
        <input
          type="text"
          id="dial-${action.key}-script"
          readonly
          value="${scriptName}"
          class="w-full bg-[#171d28] border border-[#232c3a] rounded-lg px-4 py-2.5 text-sm mb-3 cursor-default"
        >
        <div class="grid grid-cols-3 gap-2">
          <button
            onclick="browseDialScript('${num}', '${action.key}')"
            class="${colorClasses[action.color]} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Browse
          </button>
          <button
            onclick="editDialScript('${num}', '${action.key}')"
            class="bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            ${!scriptExists ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            Edit
          </button>
          <button
            onclick="clearDialScript('${num}', '${action.key}')"
            class="bg-[#171d28] hover:bg-[#232c3a] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-[#232c3a]"
            ${!scriptExists ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            Clear
          </button>
        </div>
      </div>
    `;
  }
  
  html += `
    <div class="pt-4 border-t border-[#232c3a]">
      <button
        onclick="closeDialPanel()"
        class="w-full bg-[#232c3a] hover:bg-[#404040] px-4 py-3 rounded-lg font-semibold transition-colors"
      >
        Close
      </button>
    </div>
  `;
  
  panelContent.innerHTML = html;
}

async function showButtonPanel(num) {
  const panelContent = document.querySelector('#element-panel .p-5.space-y-6');
  
  const buttonActions = [
    { key: '', name: 'Press', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M8 13V5a2 2 0 0 1 4 0v6"/><path d="M12 11V4a2 2 0 0 1 4 0v7"/><path d="M16 11.5V9a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.66-4L5 13a2 2 0 0 1 3.5-2"/></svg>', color: 'blue' },
    { key: '-longpress', name: 'Long Press', icon: '⏱', color: 'purple' }
  ];
  
  let html = '';
  
  const imagePath = await findImageFile(`${dirs.buttons}/button-${num}`);
  const imagePreview = imagePath ? 
    `<img src="${(await window.api.readImageBase64(imagePath)).data}" style="width: 100%; height: 100%; object-fit: cover;">` :
    '<svg viewBox="0 0 24 24" fill="none" stroke="#4b5a6e" stroke-width="1.5" style="width:44px;height:44px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
  
  html += `
    <div>
      <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Display Image</label>
      <div class="w-full aspect-square bg-[#171d28] rounded-lg border-2 border-[#232c3a] flex items-center justify-center mb-3 overflow-hidden">
        ${imagePreview}
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button onclick="browseButtonImage(${num})" class="bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Browse
        </button>
        <button onclick="selectButtonIcon(${num})" class="bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Icons
        </button>
        <button onclick="clearButtonImage(${num})" class="bg-[#171d28] hover:bg-[#232c3a] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-[#232c3a]">
          Clear
        </button>
      </div>
    </div>
  `;
  
  for (const action of buttonActions) {
    const scriptPath = `${dirs.buttons}/button-${num}${action.key}.sh`;
    const scriptExists = await window.api.fileExists(scriptPath);
    const scriptName = scriptExists ? scriptPath.split('/').pop() : 'No script assigned';
    
    const colorClasses = {
      blue: 'bg-blue-600 hover:bg-blue-700',
      purple: 'bg-purple-600 hover:bg-purple-700'
    };
    
    html += `
      <div class="pt-4 border-t border-[#232c3a]">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-2xl">${action.icon}</span>
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">${action.name}</label>
        </div>
        <input
          type="text"
          readonly
          value="${scriptName}"
          class="w-full bg-[#171d28] border border-[#232c3a] rounded-lg px-4 py-2.5 text-sm mb-3 cursor-default"
        >
        <div class="grid grid-cols-3 gap-2">
          <button
            onclick="browseButtonScript('${num}', '${action.key}')"
            class="${colorClasses[action.color]} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Browse
          </button>
          <button
            onclick="editButtonScript('${num}', '${action.key}')"
            class="bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            ${!scriptExists ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            Edit
          </button>
          <button
            onclick="clearButtonScript('${num}', '${action.key}')"
            class="bg-[#171d28] hover:bg-[#232c3a] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-[#232c3a]"
            ${!scriptExists ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            Clear
          </button>
        </div>
      </div>
    `;
  }
  
  const labelPath = `${dirs.buttons}/button-${num}.txt`;
  const labelValue = (await window.api.fileExists(labelPath)) ? 
    (await window.api.readFile(labelPath)).content.trim() : '';
  
  html += `
    <div class="pt-4 border-t border-[#232c3a]">
      <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Label Text</label>
      <input
        type="text"
        id="button-label-${num}"
        value="${labelValue}"
        placeholder="Optional label text"
        class="w-full bg-[#171d28] border border-[#232c3a] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
      >
      <button onclick="saveButtonLabel(${num})" class="w-full mt-3 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition-colors">
        Save Label
      </button>
    </div>
    
    <div class="pt-4 border-t border-[#232c3a]">
      <button
        onclick="closeButtonPanel()"
        class="w-full bg-[#232c3a] hover:bg-[#404040] px-4 py-3 rounded-lg font-semibold transition-colors"
      >
        Close
      </button>
    </div>
  `;
  
  panelContent.innerHTML = html;
}

async function showTouchPanel(num) {
  const panelContent = document.querySelector('#element-panel .p-5.space-y-6');
  
  const touchActions = [
    { key: '', name: 'Tap', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M8 13V5a2 2 0 0 1 4 0v6"/><path d="M12 11V4a2 2 0 0 1 4 0v7"/><path d="M16 11.5V9a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.66-4L5 13a2 2 0 0 1 3.5-2"/></svg>', color: 'blue' },
    { key: '-longpress', name: 'Long Press', icon: '⏱', color: 'purple' },
    { key: '-swipe-up', name: 'Swipe Up', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>', color: 'green' },
    { key: '-swipe-down', name: 'Swipe Down', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>', color: 'green' },
    { key: '-swipe-left', name: 'Swipe Left', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>', color: 'amber' },
    { key: '-swipe-right', name: 'Swipe Right', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>', color: 'amber' }
  ];
  
  let html = '';
  
  const imagePath = await findImageFile(`${dirs.touch}/touch-${num}`);
  const imagePreview = imagePath ? 
    `<img src="${(await window.api.readImageBase64(imagePath)).data}" style="width: 100%; height: 100%; object-fit: cover;">` :
    '<svg viewBox="0 0 24 24" fill="none" stroke="#4b5a6e" stroke-width="1.5" style="width:44px;height:44px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
  
  html += `
    <div>
      <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Display Image</label>
      <div class="w-full aspect-[2/1] bg-[#171d28] rounded-lg border-2 border-[#232c3a] flex items-center justify-center mb-3 overflow-hidden">
        ${imagePreview}
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button onclick="browseTouchImage(${num})" class="bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Browse
        </button>
        <button onclick="selectTouchIcon(${num})" class="bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Icons
        </button>
        <button onclick="clearTouchImage(${num})" class="bg-[#171d28] hover:bg-[#232c3a] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-[#232c3a]">
          Clear
        </button>
      </div>
    </div>
  `;
  
  for (const action of touchActions) {
    const scriptPath = `${dirs.touch}/touch-${num}${action.key}.sh`;
    const scriptExists = await window.api.fileExists(scriptPath);
    const scriptName = scriptExists ? scriptPath.split('/').pop() : 'No script assigned';
    
    const colorClasses = {
      blue: 'bg-blue-600 hover:bg-blue-700',
      purple: 'bg-purple-600 hover:bg-purple-700',
      green: 'bg-green-600 hover:bg-green-700',
      amber: 'bg-amber-600 hover:bg-amber-700'
    };
    
    html += `
      <div class="pt-4 border-t border-[#232c3a]">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-2xl">${action.icon}</span>
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide">${action.name}</label>
        </div>
        <input
          type="text"
          readonly
          value="${scriptName}"
          class="w-full bg-[#171d28] border border-[#232c3a] rounded-lg px-4 py-2.5 text-sm mb-3 cursor-default"
        >
        <div class="grid grid-cols-3 gap-2">
          <button
            onclick="browseTouchScript('${num}', '${action.key}')"
            class="${colorClasses[action.color]} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Browse
          </button>
          <button
            onclick="editTouchScript('${num}', '${action.key}')"
            class="bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            ${!scriptExists ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            Edit
          </button>
          <button
            onclick="clearTouchScript('${num}', '${action.key}')"
            class="bg-[#171d28] hover:bg-[#232c3a] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-[#232c3a]"
            ${!scriptExists ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            Clear
          </button>
        </div>
      </div>
    `;
  }
  
  const labelPath = `${dirs.touch}/touch-${num}.txt`;
  const labelValue = (await window.api.fileExists(labelPath)) ? 
    (await window.api.readFile(labelPath)).content.trim() : '';
  
  html += `
    <div class="pt-4 border-t border-[#232c3a]">
      <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Label Text</label>
      <input
        type="text"
        id="touch-label-${num}"
        value="${labelValue}"
        placeholder="Optional label text"
        class="w-full bg-[#171d28] border border-[#232c3a] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
      >
      <button onclick="saveTouchLabel(${num})" class="w-full mt-3 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition-colors">
        Save Label
      </button>
    </div>
    
    <div class="pt-4 border-t border-[#232c3a]">
      <button
        onclick="closeTouchPanel()"
        class="w-full bg-[#232c3a] hover:bg-[#404040] px-4 py-3 rounded-lg font-semibold transition-colors"
      >
        Close
      </button>
    </div>
  `;
  
  panelContent.innerHTML = html;
}

// Load element configuration
async function loadElementConfig(type, num) {
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  // Load image preview
  const imagePath = await findImageFile(`${dir}/${prefix}-${num}`);
  const imagePreview = document.getElementById('element-image-preview');

  if (imagePath) {
    const result = await window.api.readImageBase64(imagePath);
    if (result.success) {
      imagePreview.innerHTML = `<img src="${result.data}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
  } else {
    imagePreview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#4b5a6e" stroke-width="1.5" style="width:44px;height:44px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
  }

  // Load script
  const scriptPath = `${dir}/${prefix}-${num}.sh`;
  const scriptInput = document.getElementById('element-script');

  if (await window.api.fileExists(scriptPath)) {
    scriptInput.value = scriptPath;
  } else {
    scriptInput.value = 'No script assigned';
  }

  // Load label
  const labelPath = `${dir}/${prefix}-${num}.txt`;
  const labelInput = document.getElementById('element-label');

  if (await window.api.fileExists(labelPath)) {
    const result = await window.api.readFile(labelPath);
    if (result.success) {
      labelInput.value = result.content.trim();
    }
  } else {
    labelInput.value = '';
  }

  // Load font size
  const fontsizePath = `${dir}/${prefix}-${num}-fontsize.txt`;
  const fontsizeInput = document.getElementById('element-fontsize');

  if (await window.api.fileExists(fontsizePath)) {
    const result = await window.api.readFile(fontsizePath);
    if (result.success) {
      fontsizeInput.value = result.content.trim();
    }
  } else {
    fontsizeInput.value = '24';
  }

  // Load position
  const positionPath = `${dir}/${prefix}-${num}-position.txt`;
  const positionSelect = document.getElementById('element-position');

  if (await window.api.fileExists(positionPath)) {
    const result = await window.api.readFile(positionPath);
    if (result.success) {
      positionSelect.value = result.content.trim();
    }
  } else {
    positionSelect.value = 'bottom';
  }
}

// Save element configuration
async function saveElementConfig() {
  if (!selectedElement) return;

  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  try {
    console.log(`Saving configuration for ${type} ${num} to ${dir}`);

    // Save label
    const label = document.getElementById('element-label').value.trim();
    const labelPath = `${dir}/${prefix}-${num}.txt`;

    if (label) {
      const writeResult = await window.api.writeFile(labelPath, label);
      console.log('Label saved:', writeResult);
    } else {
      // Delete label file if empty
      if (await window.api.fileExists(labelPath)) {
        await window.api.deleteFile(labelPath);
        console.log('Label file deleted');
      }
    }

    // Save font size
    const fontSize = document.getElementById('element-fontsize').value;
    const fontResult = await window.api.writeFile(`${dir}/${prefix}-${num}-fontsize.txt`, fontSize);
    console.log('Font size saved:', fontResult);

    // Save position
    const position = document.getElementById('element-position').value;
    const posResult = await window.api.writeFile(`${dir}/${prefix}-${num}-position.txt`, position);
    console.log('Position saved:', posResult);

    showToast('Configuration saved!', 'success');

    // Give the daemon time to detect changes (it checks every 0.5s)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Refresh the preview
    await renderDeckPreview();

    // Reselect the element
    const elementQuery = `[data-type="${type}"][data-num="${num}"]`;
    const element = document.querySelector(elementQuery);
    if (element) {
      selectElement(element, type, num);
    }

  } catch (error) {
    console.error('Save error:', error);
    showToast(`Error saving: ${error.message}`, 'error');
  }
}

// Browse for image
async function browseImage() {
  if (!selectedElement) return;

  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  try {
    const result = await window.api.selectFile(['png', 'jpg', 'jpeg', 'svg']);

    if (result.success && result.filePath) {
      // Copy the file to the appropriate directory
      const ext = result.filePath.split('.').pop();
      const destPath = `${dir}/${prefix}-${num}.${ext}`;

      await window.api.copyFile(result.filePath, destPath);

      showToast('Image assigned!', 'success');

      // Give daemon time to detect the change
      await new Promise(resolve => setTimeout(resolve, 600));

      // Refresh preview
      await renderDeckPreview();

      // Reselect element
      const element = document.querySelector(`[data-type="${type}"][data-num="${num}"]`);
      if (element) {
        selectElement(element, type, num);
      }
    }
  } catch (error) {
    console.error('Browse image error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Global icon cache
let allIcons = [];
let iconCategories = new Set();
let iconColors = new Set();
let currentIconCategory = 'all';
let currentIconColor = 'all';

// Show icon library
async function showIconLibrary(category = null, color = null) {
  const modal = document.getElementById('icon-library-modal');
  const iconGrid = document.getElementById('icon-grid');

  // Update filters if provided
  if (category !== null) currentIconCategory = category;
  if (color !== null) currentIconColor = color;

  // If this is the first load, fetch all icons
  if (allIcons.length === 0) {
    iconGrid.innerHTML = '<div class="col-span-6 text-center py-8 text-gray-400">Loading icons...</div>';

    try {
      const iconsExist = await window.api.fileExists(dirs.icons);

      if (!iconsExist) {
        showToast('Icons directory not found', 'error');
        return;
      }

      const result = await window.api.listDirectoryRecursive(dirs.icons);

      if (!result.success || !result.files || result.files.length === 0) {
        iconGrid.innerHTML = `
          <div class="col-span-6 text-center py-8 text-gray-400">
            <div class="mb-2" style="display:flex;justify-content:center;color:#4b5a6e"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:34px;height:34px"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg></div>
            <div>No icons found</div>
            <div class="text-sm mt-2">Add PNG/SVG files to: ${dirs.icons}</div>
          </div>
        `;
        modal.classList.remove('hidden');
        return;
      }

      // Filter for image files and skip .gitkeep
      allIcons = result.files.filter(file =>
        !file.includes('.gitkeep') &&
        (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.svg'))
      );

      // Extract categories and colors from directory structure
      iconCategories.clear();
      iconColors.clear();
      allIcons.forEach(file => {
        const parts = file.split('/');
        if (parts.length > 1) {
          iconCategories.add(parts[0]); // category
          if (parts.length > 2) {
            iconColors.add(parts[1]); // color
          }
        }
      });

      // Render category and color filters
      renderIconFilters();
      renderIconColorFilters();
    } catch (error) {
      console.error('Error loading icons:', error);
      showToast(`Error loading icons: ${error.message}`, 'error');
      return;
    }
  }

  // Filter icons by category and color
  let filteredIcons = allIcons;

  if (currentIconCategory !== 'all') {
    filteredIcons = filteredIcons.filter(file => file.startsWith(currentIconCategory + '/'));
  }

  if (currentIconColor !== 'all') {
    filteredIcons = filteredIcons.filter(file => {
      const parts = file.split('/');
      return parts.length > 2 && parts[1] === currentIconColor;
    });
  }

  // Re-render filters to update counts and available options
  renderIconFilters();
  renderIconColorFilters();

  if (filteredIcons.length === 0) {
    iconGrid.innerHTML = `
      <div class="col-span-6 text-center py-8 text-gray-400">
        <div class="mb-2" style="display:flex;justify-content:center;color:#4b5a6e"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:34px;height:34px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg></div>
        <div>No icons match these filters</div>
      </div>
    `;
    modal.classList.remove('hidden');
    return;
  }

  // Render icon grid
  iconGrid.innerHTML = '';

  for (const file of filteredIcons) {
    const iconPath = `${dirs.icons}/${file}`;
    const iconItem = document.createElement('div');
    iconItem.className = 'aspect-square bg-[#171d28] rounded border-2 border-[#232c3a] hover:border-blue-500 cursor-pointer transition-all flex items-center justify-center overflow-hidden p-2';

    try {
      const imageResult = await window.api.readImageBase64(iconPath);
      if (imageResult.success) {
        const img = document.createElement('img');
        img.src = imageResult.data;
        img.className = 'w-full h-full object-contain';
        iconItem.appendChild(img);
      } else {
        iconItem.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
      }
    } catch (error) {
      iconItem.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    }

    iconItem.title = file;
    iconItem.addEventListener('click', () => selectIcon(iconPath));

    iconGrid.appendChild(iconItem);
  }

  modal.classList.remove('hidden');
}



// Select icon from library
async function selectIcon(iconPath) {
  console.log('selectIcon called with:', iconPath);

  if (!selectedElement) {
    console.error('No element selected');
    showToast('Please select a button, dial, or touch zone first', 'error');
    return;
  }

  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  console.log('Assigning icon to:', { type, num, dir, prefix });

  try {
    const ext = iconPath.split('.').pop();
    const destPath = `${dir}/${prefix}-${num}.${ext}`;

    console.log('Copying from', iconPath, 'to', destPath);

    const result = await window.api.copyFile(iconPath, destPath);
    console.log('Copy result:', result);

    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to copy icon');
    }

    // Close modal
    document.getElementById('icon-library-modal').classList.add('hidden');

    showToast('Icon assigned!', 'success');

    // Give daemon time to detect the change
    await new Promise(resolve => setTimeout(resolve, 600));

    // Refresh preview
    await renderDeckPreview();

    // Reselect element
    const element = document.querySelector(`[data-type="${type}"][data-num="${num}"]`);
    if (element) {
      selectElement(element, type, num);
    }
  } catch (error) {
    console.error('Select icon error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Clear image
async function clearImage() {
  if (!selectedElement) return;

  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  try {
    const extensions = ['.png', '.jpg', '.jpeg', '.svg'];

    for (const ext of extensions) {
      const path = `${dir}/${prefix}-${num}${ext}`;
      if (await window.api.fileExists(path)) {
        await window.api.deleteFile(path);
      }
    }

    showToast('Image cleared!', 'success');

    // Refresh preview
    await renderDeckPreview();

    // Reselect element
    const element = document.querySelector(`[data-type="${type}"][data-num="${num}"]`);
    if (element) {
      selectElement(element, type, num);
    }
  } catch (error) {
    console.error('Clear image error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Browse for script
async function browseScript() {
  if (!selectedElement) return;

  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  try {
    const result = await window.api.selectFile(['sh']);

    if (result.success && result.filePath) {
      const destPath = `${dir}/${prefix}-${num}.sh`;

      await window.api.copyFile(result.filePath, destPath);

      // Make script executable
      const makeExecResult = await window.api.makeExecutable(destPath);
      if (!makeExecResult.success) {
        console.warn('Could not make script executable:', makeExecResult.error);
      }

      showToast('Script assigned!', 'success');

      // Refresh the type-specific panel (no shared script input in the v2 UI).
      if (selectedElement) await showConfigPanel(selectedElement.type, selectedElement.num);

      // Give daemon time to detect the change
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  } catch (error) {
    console.error('Browse script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Clear script
async function clearScript() {
  if (!selectedElement) return;

  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  try {
    const scriptPath = `${dir}/${prefix}-${num}.sh`;

    if (await window.api.fileExists(scriptPath)) {
      await window.api.deleteFile(scriptPath);
    }

    showToast('Script cleared!', 'success');

    // Refresh the type-specific panel (no shared script input in the v2 UI).
    if (selectedElement) await showConfigPanel(selectedElement.type, selectedElement.num);
  } catch (error) {
    console.error('Clear script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.browseDialScript = async function(dialNum, actionKey) {
  try {
    const result = await window.api.selectFile(['sh']);

    if (result.success && result.filePath) {
      const destPath = `${dirs.dials}/dial-${dialNum}-${actionKey}.sh`;

      await window.api.copyFile(result.filePath, destPath);
      await window.api.makeExecutable(destPath);

      showToast(`Script assigned to ${actionKey}!`, 'success');

      document.getElementById(`dial-${actionKey}-script`).value = destPath.split('/').pop();

      await new Promise(resolve => setTimeout(resolve, 600));
      await showDialPanel(dialNum);
    }
  } catch (error) {
    console.error('Browse dial script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.editDialScript = async function(dialNum, actionKey) {
  const scriptPath = `${dirs.dials}/dial-${dialNum}-${actionKey}.sh`;
  
  if (await window.api.fileExists(scriptPath)) {
    await window.api.execCommand(`xdg-open "${scriptPath}"`);
    showToast('Opening script in editor...', 'info');
  }
}

window.clearDialScript = async function(dialNum, actionKey) {
  try {
    const scriptPath = `${dirs.dials}/dial-${dialNum}-${actionKey}.sh`;

    if (await window.api.fileExists(scriptPath)) {
      await window.api.deleteFile(scriptPath);
    }

    showToast(`${actionKey} script cleared!`, 'success');
    
    await showDialPanel(dialNum);
  } catch (error) {
    console.error('Clear dial script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.closeDialPanel = function() {
  const panel = document.getElementById('element-panel');
  panel.classList.add('hidden');
  
  document.querySelectorAll('.deck-dial').forEach(el => el.classList.remove('selected'));
  selectedElement = null;
}

window.browseButtonScript = async function(buttonNum, actionKey) {
  try {
    const result = await window.api.selectFile(['sh']);

    if (result.success && result.filePath) {
      const destPath = `${dirs.buttons}/button-${buttonNum}${actionKey}.sh`;

      await window.api.copyFile(result.filePath, destPath);
      await window.api.makeExecutable(destPath);

      showToast(`Script assigned!`, 'success');
      await new Promise(resolve => setTimeout(resolve, 600));
      await showButtonPanel(buttonNum);
    }
  } catch (error) {
    console.error('Browse button script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.editButtonScript = async function(buttonNum, actionKey) {
  const scriptPath = `${dirs.buttons}/button-${buttonNum}${actionKey}.sh`;
  
  if (await window.api.fileExists(scriptPath)) {
    await window.api.execCommand(`xdg-open "${scriptPath}"`);
    showToast('Opening script in editor...', 'info');
  }
}

window.clearButtonScript = async function(buttonNum, actionKey) {
  try {
    const scriptPath = `${dirs.buttons}/button-${buttonNum}${actionKey}.sh`;

    if (await window.api.fileExists(scriptPath)) {
      await window.api.deleteFile(scriptPath);
    }

    showToast(`Script cleared!`, 'success');
    await showButtonPanel(buttonNum);
  } catch (error) {
    console.error('Clear button script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.browseButtonImage = async function(buttonNum) {
  try {
    const result = await window.api.selectFile(['png', 'jpg', 'jpeg', 'svg']);

    if (result.success && result.filePath) {
      const ext = result.filePath.split('.').pop();
      const destPath = `${dirs.buttons}/button-${buttonNum}.${ext}`;

      await window.api.copyFile(result.filePath, destPath);
      showToast('Image assigned!', 'success');
      await new Promise(resolve => setTimeout(resolve, 600));
      await showButtonPanel(buttonNum);
      await renderDeckPreview();
    }
  } catch (error) {
    console.error('Browse button image error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.selectButtonIcon = async function(buttonNum) {
  await openIconLibrary('button', buttonNum);
}

window.clearButtonImage = async function(buttonNum) {
  try {
    for (const ext of ['png', 'jpg', 'jpeg', 'svg']) {
      const imagePath = `${dirs.buttons}/button-${buttonNum}.${ext}`;
      if (await window.api.fileExists(imagePath)) {
        await window.api.deleteFile(imagePath);
      }
    }

    showToast('Image cleared!', 'success');
    await showButtonPanel(buttonNum);
    await renderDeckPreview();
  } catch (error) {
    console.error('Clear button image error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.saveButtonLabel = async function(buttonNum) {
  try {
    const label = document.getElementById(`button-label-${buttonNum}`).value.trim();
    const labelPath = `${dirs.buttons}/button-${buttonNum}.txt`;

    if (label) {
      await window.api.writeFile(labelPath, label);
    } else {
      if (await window.api.fileExists(labelPath)) {
        await window.api.deleteFile(labelPath);
      }
    }

    showToast('Label saved!', 'success');
    await renderDeckPreview();
  } catch (error) {
    console.error('Save button label error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.closeButtonPanel = function() {
  const panel = document.getElementById('element-panel');
  panel.classList.add('hidden');
  
  document.querySelectorAll('.deck-button').forEach(el => el.classList.remove('selected'));
  selectedElement = null;
}

window.browseTouchScript = async function(zoneNum, actionKey) {
  try {
    const result = await window.api.selectFile(['sh']);

    if (result.success && result.filePath) {
      const destPath = `${dirs.touch}/touch-${zoneNum}${actionKey}.sh`;

      await window.api.copyFile(result.filePath, destPath);
      await window.api.makeExecutable(destPath);

      showToast(`Script assigned!`, 'success');
      await new Promise(resolve => setTimeout(resolve, 600));
      await showTouchPanel(zoneNum);
    }
  } catch (error) {
    console.error('Browse touch script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.editTouchScript = async function(zoneNum, actionKey) {
  const scriptPath = `${dirs.touch}/touch-${zoneNum}${actionKey}.sh`;
  
  if (await window.api.fileExists(scriptPath)) {
    await window.api.execCommand(`xdg-open "${scriptPath}"`);
    showToast('Opening script in editor...', 'info');
  }
}

window.clearTouchScript = async function(zoneNum, actionKey) {
  try {
    const scriptPath = `${dirs.touch}/touch-${zoneNum}${actionKey}.sh`;

    if (await window.api.fileExists(scriptPath)) {
      await window.api.deleteFile(scriptPath);
    }

    showToast(`Script cleared!`, 'success');
    await showTouchPanel(zoneNum);
  } catch (error) {
    console.error('Clear touch script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.browseTouchImage = async function(zoneNum) {
  try {
    const result = await window.api.selectFile(['png', 'jpg', 'jpeg', 'svg']);

    if (result.success && result.filePath) {
      const ext = result.filePath.split('.').pop();
      const destPath = `${dirs.touch}/touch-${zoneNum}.${ext}`;

      await window.api.copyFile(result.filePath, destPath);
      showToast('Image assigned!', 'success');
      await new Promise(resolve => setTimeout(resolve, 600));
      await showTouchPanel(zoneNum);
      await renderDeckPreview();
    }
  } catch (error) {
    console.error('Browse touch image error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.selectTouchIcon = async function(zoneNum) {
  await openIconLibrary('touch', zoneNum);
}

window.clearTouchImage = async function(zoneNum) {
  try {
    for (const ext of ['png', 'jpg', 'jpeg', 'svg']) {
      const imagePath = `${dirs.touch}/touch-${zoneNum}.${ext}`;
      if (await window.api.fileExists(imagePath)) {
        await window.api.deleteFile(imagePath);
      }
    }

    showToast('Image cleared!', 'success');
    await showTouchPanel(zoneNum);
    await renderDeckPreview();
  } catch (error) {
    console.error('Clear touch image error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.saveTouchLabel = async function(zoneNum) {
  try {
    const label = document.getElementById(`touch-label-${zoneNum}`).value.trim();
    const labelPath = `${dirs.touch}/touch-${zoneNum}.txt`;

    if (label) {
      await window.api.writeFile(labelPath, label);
    } else {
      if (await window.api.fileExists(labelPath)) {
        await window.api.deleteFile(labelPath);
      }
    }

    showToast('Label saved!', 'success');
    await renderDeckPreview();
  } catch (error) {
    console.error('Save touch label error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

window.closeTouchPanel = function() {
  const panel = document.getElementById('element-panel');
  panel.classList.add('hidden');
  
  document.querySelectorAll('.deck-touch-zone').forEach(el => el.classList.remove('selected'));
  selectedElement = null;
}

// Open code editor for current script
async function openCodeEditor() {
  if (!selectedElement) {
    showToast('Select a button, dial, or touch zone first', 'info');
    return;
  }

  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';
  const scriptPath = `${dir}/${prefix}-${num}.sh`;

  try {
    // Check if script exists
    const exists = await window.api.fileExists(scriptPath);
    let scriptContent = '';

    if (exists) {
      const result = await window.api.readFile(scriptPath);
      if (result.success) {
        scriptContent = result.content;
      }
    } else {
      // Create a default script template
      scriptContent = `#!/bin/bash
# Script for ${type} ${num}

# Add your commands here
`;
    }

    // Store current script path
    currentScriptPath = scriptPath;

    // Initialize CodeMirror if not already done
    if (!codeEditor) {
      const textarea = document.getElementById('code-editor-textarea');
      codeEditor = CodeMirror.fromTextArea(textarea, {
        mode: 'shell',
        theme: 'monokai',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        indentWithTabs: false,
        extraKeys: {
          'Ctrl-S': function() {
            saveCodeEditor();
          }
        }
      });
    }

    // Set content
    codeEditor.setValue(scriptContent);

    // Update title
    const typeNames = { button: 'Button', dial: 'Dial', touch: 'Touch Zone' };
    document.getElementById('editor-title').textContent = `Edit Script - ${typeNames[type]} ${num}`;

    // Show modal
    document.getElementById('code-editor-modal').classList.remove('hidden');

    // Refresh editor (needed when showing/hiding)
    setTimeout(() => codeEditor.refresh(), 10);
  } catch (error) {
    console.error('Open editor error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Save code editor content
async function saveCodeEditor() {
  if (!currentScriptPath) return;

  try {
    const content = codeEditor.getValue();

    // Save the file
    const result = await window.api.writeFile(currentScriptPath, content);

    if (result.success) {
      // Make executable
      await window.api.makeExecutable(currentScriptPath);

      showToast('Script saved!', 'success');

      // Close modal
      closeCodeEditor();

      // Refresh the type-specific panel (no shared script input in the v2 UI).
      if (selectedElement) await showConfigPanel(selectedElement.type, selectedElement.num);

      // Give daemon time to detect the change
      await new Promise(resolve => setTimeout(resolve, 600));
    } else {
      showToast(`Save failed: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Save editor error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Close code editor
function closeCodeEditor() {
  document.getElementById('code-editor-modal').classList.add('hidden');
  currentScriptPath = null;
}

// Load categories
function loadCategories() {
  const categories = [
    { id: 'all', label: 'All Actions' },
    { id: 'media', label: 'Media' },
    { id: 'window', label: 'Window' },
    { id: 'system', label: 'System' },
    { id: 'apps', label: 'Apps' },
    { id: 'dev', label: 'Developer' }
  ];

  const container = document.getElementById('categories');
  container.innerHTML = '';

  categories.forEach((cat, index) => {
    const pill = document.createElement('div');
    pill.className = `category-pill ${index === 0 ? 'active' : ''}`;
    pill.textContent = cat.label;
    pill.dataset.category = cat.id;

    pill.addEventListener('click', () => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterActions(cat.id);
    });

    container.appendChild(pill);
  });
}

// Load actions list from actual script files
async function loadActions(filter = 'all') {
  const actionsList = document.getElementById('actions-list');
  actionsList.innerHTML = '<div class="p-4 text-center text-gray-400">Loading scripts...</div>';

  try {
    const allActions = [];

    // Load examples directory
    if (dirs.examples) {
      const examplesExist = await window.api.fileExists(dirs.examples);
      if (examplesExist) {
        const result = await window.api.listDirectory(dirs.examples);
        if (result.success && result.files) {
          const scriptFiles = result.files.filter(f => f.endsWith('.sh'));

          for (const file of scriptFiles) {
            const name = file.replace('.sh', '').replace(/-/g, ' ');
            allActions.push({
              title: name,
              description: 'Example script',
              category: 'examples',
              path: `${dirs.examples}/${file}`
            });
          }
        }

        // Also check dev-actions subdirectory
        const devActionsPath = `${dirs.examples}/dev-actions`;
        const devActionsExist = await window.api.fileExists(devActionsPath);
        if (devActionsExist) {
          const devResult = await window.api.listDirectory(devActionsPath);
          if (devResult.success && devResult.files) {
            const devScripts = devResult.files.filter(f => f.endsWith('.sh'));

            for (const file of devScripts) {
              const name = file.replace('.sh', '').replace(/-/g, ' ');
              allActions.push({
                title: name,
                description: 'Developer action',
                category: 'dev',
                path: `${devActionsPath}/${file}`
              });
            }
          }
        }
      }
    }

    // Load existing button scripts
    if (dirs.buttons) {
      const result = await window.api.listDirectory(dirs.buttons);
      if (result.success && result.files) {
        const scriptFiles = result.files.filter(f => f.endsWith('.sh') && !f.includes('-fontsize') && !f.includes('-position'));

        for (const file of scriptFiles) {
          const name = file.replace('.sh', '').replace('button-', 'Button ');
          allActions.push({
            title: name,
            description: 'Configured button',
            category: 'buttons',
            path: `${dirs.buttons}/${file}`
          });
        }
      }
    }

    // Load existing dial scripts
    if (dirs.dials) {
      const result = await window.api.listDirectory(dirs.dials);
      if (result.success && result.files) {
        const scriptFiles = result.files.filter(f => f.endsWith('.sh'));

        for (const file of scriptFiles) {
          const name = file.replace('.sh', '').replace('dial-', 'Dial ').replace(/-/g, ' ');
          allActions.push({
            title: name,
            description: 'Configured dial',
            category: 'dials',
            path: `${dirs.dials}/${file}`
          });
        }
      }
    }

    // Load existing touchscreen scripts
    if (dirs.touch) {
      const result = await window.api.listDirectory(dirs.touch);
      if (result.success && result.files) {
        const scriptFiles = result.files.filter(f => f.endsWith('.sh'));

        for (const file of scriptFiles) {
          const name = file.replace('.sh', '').replace('touch-', 'Touch ').replace(/-/g, ' ');
          allActions.push({
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M8 13V5a2 2 0 0 1 4 0v6"/><path d="M12 11V4a2 2 0 0 1 4 0v7"/><path d="M16 11.5V9a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.66-4L5 13a2 2 0 0 1 3.5-2"/></svg>',
            title: name,
            description: 'Configured touch zone',
            category: 'touch',
            path: `${dirs.touch}/${file}`
          });
        }
      }
    }

    // Filter actions
    const filteredActions = filter === 'all' ? allActions : allActions.filter(a => a.category === filter);

    actionsList.innerHTML = '';

    if (filteredActions.length === 0) {
      actionsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${EMPTY_ICONS.search}</div>
          <div class="empty-state-title">No scripts found</div>
          <div class="empty-state-description">Add .sh files to the examples/ directory</div>
        </div>
      `;
      return;
    }

    // Sort alphabetically
    filteredActions.sort((a, b) => a.title.localeCompare(b.title));

    filteredActions.forEach(action => {
      const item = document.createElement('div');
      item.className = 'action-item';
      item.dataset.scriptPath = action.path;

      item.innerHTML = `
        <div class="action-icon cat-${action.category}">${actionIcon(action.category)}</div>
        <div class="action-info">
          <div class="action-title">${action.title}</div>
          <div class="action-description">${action.description}</div>
        </div>
        <button class="preview-script-btn px-3 py-1.5 bg-[#171d28] hover:bg-[#232c3a] rounded text-xs transition-colors border border-[#232c3a]">
          View
        </button>
      `;

      // Click to assign script to selected element (but not on the preview button)
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('preview-script-btn')) {
          assignScriptToElement(action.path);
        }
      });

      // Preview button
      const previewBtn = item.querySelector('.preview-script-btn');
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showScriptPreview(action.path, action.title);
      });

      actionsList.appendChild(item);
    });

  } catch (error) {
    console.error('Error loading actions:', error);
    actionsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${EMPTY_ICONS.error}</div>
        <div class="empty-state-title">Error loading scripts</div>
        <div class="empty-state-description">${error.message}</div>
      </div>
    `;
  }
}

// Show script preview modal
async function showScriptPreview(scriptPath, title) {
  const modal = document.getElementById('script-preview-modal');
  const titleEl = document.getElementById('script-preview-title');
  const contentEl = document.getElementById('script-preview-content');

  if (!modal || !titleEl || !contentEl) return;

  titleEl.textContent = title;
  contentEl.textContent = 'Loading script...';

  try {
    const result = await window.api.readFile(scriptPath);
    if (result.success && result.content) {
      contentEl.textContent = result.content;
    } else {
      contentEl.textContent = `Error loading script: ${result.error || 'Unknown error'}`;
    }
  } catch (error) {
    contentEl.textContent = `Error: ${error.message}`;
  }

  modal.classList.remove('hidden');
}

// Close script preview modal
function closeScriptPreview() {
  const modal = document.getElementById('script-preview-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Assign script to currently selected element
async function assignScriptToElement(scriptPath) {
  if (!selectedElement) {
    showToast('Select a button, dial, or touch zone first', 'info');
    return;
  }

  // Check if this script needs parameters
  const scriptName = scriptPath.split('/').pop();

  if (scriptName === 'open-link.sh') {
    // Show parameters modal for open-link script
    showScriptParametersModal(scriptPath, 'open-link');
    return;
  }

  if (scriptName === 'play-macro.sh') {
    // Show macro recording interface
    showMacroRecorderModal(scriptPath, 'button');
    return;
  }

  if (scriptName === 'dial-macro-stepper.sh') {
    // Assign directly - recording happens when dial is pressed
    await assignScriptDirect(scriptPath);
    return;
  }

  // For scripts without parameters, assign directly
  await assignScriptDirect(scriptPath);
}

// Direct script assignment (no parameters needed)
async function assignScriptDirect(scriptPath) {
  const { type, num } = selectedElement;

  try {
    // Dials are gesture-specific (no plain dial-N.sh); default a generic
    // assignment to the Press gesture. Buttons/touch use their base script.
    let destPath;
    if (type === 'dial') {
      destPath = `${dirs.dials}/dial-${num}-press.sh`;
    } else if (type === 'touch') {
      destPath = `${dirs.touch}/touch-${num}.sh`;
    } else {
      destPath = `${dirs.buttons}/button-${num}.sh`;
    }

    await window.api.copyFile(scriptPath, destPath);

    // Make script executable
    const makeExecResult = await window.api.makeExecutable(destPath);
    if (!makeExecResult.success) {
      console.warn('Could not make script executable:', makeExecResult.error);
    }

    showToast(type === 'dial' ? 'Script assigned to Press!' : 'Script assigned!', 'success');

    // Refresh the type-specific config panel so it reflects the new script.
    // (The v2 panels rebuild their own DOM, so there is no shared script input.)
    await showConfigPanel(type, num);

    // Give daemon time to detect the change
    await new Promise(resolve => setTimeout(resolve, 600));

  } catch (error) {
    console.error('Assign script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Show script parameters modal
async function showScriptParametersModal(scriptPath, scriptType) {
  pendingScriptAssignment = { scriptPath, scriptType };

  const modal = document.getElementById('script-params-modal');
  const container = document.getElementById('params-container');
  const title = document.getElementById('params-title');

  // Clear previous parameters
  container.innerHTML = '';

  if (scriptType === 'open-link') {
    title.textContent = 'Open Link - Configure';

    // Chrome Profile dropdown
    const profileDiv = document.createElement('div');
    profileDiv.innerHTML = `
      <label class="block text-xs text-gray-400 mb-2">Chrome Profile</label>
      <select
        id="param-chrome-profile"
        class="w-full bg-[#171d28] border border-[#232c3a] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="">Loading profiles...</option>
      </select>
      <div class="text-xs text-gray-500 mt-1">Select your Chrome profile</div>
    `;
    container.appendChild(profileDiv);

    // URL input
    const urlDiv = document.createElement('div');
    urlDiv.innerHTML = `
      <label class="block text-xs text-gray-400 mb-2">URL</label>
      <input
        type="text"
        id="param-url"
        placeholder="https://example.com"
        class="w-full bg-[#171d28] border border-[#232c3a] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
      >
      <div class="text-xs text-gray-500 mt-1">Full URL including https://</div>
    `;
    container.appendChild(urlDiv);

    // Load Chrome profiles
    try {
      const result = await window.api.listChromeProfiles();
      const profileSelect = document.getElementById('param-chrome-profile');

      if (result.success && result.profiles.length > 0) {
        profileSelect.innerHTML = '<option value="">System Default (no profile specified)</option>';
        result.profiles.forEach(profile => {
          const option = document.createElement('option');
          option.value = profile.directory;
          option.textContent = profile.displayName;
          // Auto-select the Default profile if it exists
          if (profile.directory === 'Default') {
            option.selected = true;
          }
          profileSelect.appendChild(option);
        });
      } else {
        profileSelect.innerHTML = '<option value="">System Default (no profile specified)</option>';
      }
    } catch (error) {
      console.error('Error loading Chrome profiles:', error);
      const profileSelect = document.getElementById('param-chrome-profile');
      profileSelect.innerHTML = '<option value="">System Default (no profile specified)</option>';
    }
  }

  modal.classList.remove('hidden');

  // Focus URL input (since profile is now a dropdown)
  setTimeout(() => {
    const urlInput = document.getElementById('param-url');
    if (urlInput) urlInput.focus();
  }, 100);

  // Add Enter key support for URL input
  const urlInput = document.getElementById('param-url');
  if (urlInput) {
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyScriptParameters();
      }
    });
  }
}

// Apply script parameters and create custom script
async function applyScriptParameters() {
  if (!pendingScriptAssignment || !selectedElement) return;

  const { scriptPath, scriptType } = pendingScriptAssignment;
  const { type, num } = selectedElement;
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  try {
    let scriptContent = '';

    if (scriptType === 'open-link') {
      const profileSelect = document.getElementById('param-chrome-profile');
      const chromeProfile = profileSelect ? profileSelect.value : '';
      const url = document.getElementById('param-url').value.trim();

      if (!url) {
        showToast('URL is required', 'error');
        return;
      }

      // Generate custom script
      scriptContent = `#!/bin/bash
# Open link in Chrome
# Generated by Stream Deck Configurator

`;

      if (chromeProfile) {
        scriptContent += `google-chrome --profile-directory="${chromeProfile}" "${url}" &\n`;
      } else {
        scriptContent += `google-chrome "${url}" &\n`;
      }
    } else if (scriptType === 'play-macro') {
      // Generate macro player script
      scriptContent = `#!/bin/bash
# Play recorded macro
# Generated by Stream Deck Configurator

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MACRO_FILE="$PROJECT_DIR/macros/button-${num}.json"

if [ ! -f "$MACRO_FILE" ]; then
    echo "No macro recorded for button ${num}"
    exit 1
fi

python3 "$PROJECT_DIR/utils/macro-player.py" "$MACRO_FILE"
`;
    } else if (scriptType === 'dial-macro') {
      // Generate dial macro stepper script
      scriptContent = `#!/bin/bash
# Dial Macro Stepper - Control macro playback with dial
# Generated by Stream Deck Configurator

ACTION=$1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MACRO_FILE="$PROJECT_DIR/macros/dial-${num}.json"
STATE_FILE="/tmp/streamdeck-dial-${num}-macro-state.json"
CONTROLLER="$PROJECT_DIR/utils/dial-macro-controller.py"

case "$ACTION" in
    press)
        # If no macro exists, launch recorder
        if [ ! -f "$MACRO_FILE" ]; then
            echo "No macro recorded yet - launching recorder..."

            # Detect available terminal
            TERMINAL=""
            for term_cmd in konsole gnome-terminal xfce4-terminal xterm alacritty kitty terminator; do
                if command -v \\$term_cmd >/dev/null 2>&1; then
                    TERMINAL=\\$term_cmd
                    break
                fi
            done

            if [ -z "$TERMINAL" ]; then
                echo "Error: No terminal emulator found"
                exit 1
            fi

            # Launch recorder in terminal
            RECORDER="$PROJECT_DIR/utils/macro-recorder.py"
            if [ "$TERMINAL" = "konsole" ]; then
                konsole -e bash -c "python3 '\\$RECORDER' '\\$MACRO_FILE'; echo ''; echo 'Press ENTER to close...'; read" &
            elif [ "$TERMINAL" = "gnome-terminal" ]; then
                gnome-terminal -- bash -c "python3 '\\$RECORDER' '\\$MACRO_FILE'; echo ''; echo 'Press ENTER to close...'; read" &
            else
                \\$TERMINAL -e bash -c "python3 '\\$RECORDER' '\\$MACRO_FILE'; echo ''; echo 'Press ENTER to close...'; read" &
            fi

            echo "Recording terminal opened. Press ESC when done."
        else
            echo "Playing macro..."
            python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" play
        fi
        ;;
    hold)
        if [ -f "$MACRO_FILE" ]; then
            echo "Clearing macro..."
            # Reset state first
            if [ -f "$STATE_FILE" ]; then
                python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" reset
            fi
            # Delete the macro file
            rm -f "$MACRO_FILE" "$STATE_FILE"
            echo "Macro cleared! Press dial to record a new one."
        else
            echo "No macro to clear"
        fi
        ;;
    left)
        if [ ! -f "$MACRO_FILE" ]; then
            echo "No macro recorded yet. Press dial to record."
            exit 0
        fi
        echo "Step backward..."
        python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" backward
        ;;
    right)
        if [ ! -f "$MACRO_FILE" ]; then
            echo "No macro recorded yet. Press dial to record."
            exit 0
        fi
        echo "Step forward..."
        python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" forward
        ;;
    *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
esac
`;
    }

    // Save the custom script
    const destPath = `${dir}/${prefix}-${num}.sh`;
    const result = await window.api.writeFile(destPath, scriptContent);

    if (result.success) {
      // Make executable
      await window.api.makeExecutable(destPath);

      showToast('Script configured and assigned!', 'success');

      // Close modal
      closeScriptParametersModal();

      // Refresh the type-specific panel (no shared script input in the v2 UI).
      if (selectedElement) await showConfigPanel(selectedElement.type, selectedElement.num);

      // Give daemon time to detect the change
      await new Promise(resolve => setTimeout(resolve, 600));
    } else {
      showToast(`Failed to save: ${result.error}`, 'error');
    }

  } catch (error) {
    console.error('Apply parameters error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Close script parameters modal
function closeScriptParametersModal() {
  document.getElementById('script-params-modal').classList.add('hidden');
  pendingScriptAssignment = null;
}

// Show macro recorder modal
async function showMacroRecorderModal(scriptPath, macroType = 'button') {
  const { type, num } = selectedElement;
  const scriptType = macroType === 'dial' ? 'dial-macro' : 'play-macro';
  pendingScriptAssignment = { scriptPath, scriptType, macroType };

  const modal = document.getElementById('script-params-modal');
  const title = document.getElementById('params-title');
  const container = document.getElementById('params-container');
  const applyBtn = document.getElementById('save-params-btn');

  const elementText = type === 'button' ? `Button ${num}` : type === 'dial' ? `Dial ${num}` : `Touch Zone ${num}`;
  title.textContent = macroType === 'dial' ? 'Record Dial Macro' : 'Record Macro';
  container.innerHTML = '';

  // Create recording UI
  const recordingDiv = document.createElement('div');
  recordingDiv.className = 'space-y-4';

  let instructions = '';
  if (macroType === 'dial') {
    instructions = `
      <div class="text-sm text-gray-300 space-y-2">
        <p>Record a keyboard macro for <span class="font-bold text-blue-400">${elementText}</span></p>
        <ul class="list-disc list-inside text-gray-400 text-xs space-y-1 ml-2">
          <li>Click "Start Recording" below</li>
          <li>Type your keystrokes (modifiers like Ctrl, Shift, Alt are supported)</li>
          <li>Press ESC when done to stop recording</li>
        </ul>
        <div class="bg-blue-900/20 border border-blue-500/30 rounded p-3 mt-3">
          <div class="text-sm font-medium text-blue-300 mb-2">Dial Controls:</div>
          <ul class="list-disc list-inside text-blue-200 text-xs space-y-1 ml-2">
            <li><span class="font-medium">Press</span>: Play entire macro</li>
            <li><span class="font-medium">Hold</span>: Reset macro position</li>
            <li><span class="font-medium">Rotate Right</span>: Step forward (next keystroke)</li>
            <li><span class="font-medium">Rotate Left</span>: Step backward (undo keystroke)</li>
          </ul>
        </div>
      </div>
    `;
  } else {
    instructions = `
      <div class="text-sm text-gray-300 space-y-2">
        <p>Record a keyboard macro for <span class="font-bold text-blue-400">${elementText}</span></p>
        <ul class="list-disc list-inside text-gray-400 text-xs space-y-1 ml-2">
          <li>Click "Start Recording" below</li>
          <li>Type your keystrokes (modifiers like Ctrl, Shift, Alt are supported)</li>
          <li>Press ESC when done to stop recording</li>
          <li>The macro will be saved and assigned to the button</li>
        </ul>
      </div>
    `;
  }

  recordingDiv.innerHTML = `
    ${instructions}

    <div class="bg-[#1a1a1a] border border-[#232c3a] rounded p-3">
      <div id="recording-status" class="text-sm text-gray-400">
        Ready to record
      </div>
    </div>

    <button id="start-record-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors">
      Start Recording
    </button>
  `;

  container.appendChild(recordingDiv);

  // Hide apply button initially
  applyBtn.classList.add('hidden');

  // Show modal
  modal.classList.remove('hidden');

  // Handle start recording button
  document.getElementById('start-record-btn').addEventListener('click', async () => {
    const startBtn = document.getElementById('start-record-btn');
    const statusDiv = document.getElementById('recording-status');

    startBtn.disabled = true;
    startBtn.textContent = 'Recording...';
    startBtn.classList.add('opacity-50', 'cursor-not-allowed');

    statusDiv.innerHTML = '<span class="text-yellow-400"><span style="color:#ef4444">●</span> Recording... Press ESC to stop</span>';

    try {
      // Start recording with element type (button or dial)
      const result = await window.api.recordMacro(num, type);

      if (result.success) {
        statusDiv.innerHTML = '<span class="text-green-400">✓ Recording saved successfully!</span>';
        applyBtn.classList.remove('hidden');
        startBtn.textContent = 'Record Again';
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        statusDiv.innerHTML = `<span class="text-red-400">Error: ${result.error}</span>`;
        startBtn.textContent = 'Try Again';
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } catch (error) {
      statusDiv.innerHTML = `<span class="text-red-400">Error: ${error.message}</span>`;
      startBtn.textContent = 'Try Again';
      startBtn.disabled = false;
      startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });
}

// Filter actions by category
function filterActions(category) {
  loadActions(category);
}

// Show toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// Setup event listeners
// Open settings modal
async function openSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  try {
    // Load current autostart status
    const autostartResult = await window.api.checkAutostart();
    if (autostartResult.success) {
      const toggle = document.getElementById('autostart-toggle');
      if (toggle) {
        toggle.checked = autostartResult.enabled;
      }
    }

    // Try to load current brightness
    const brightnessPath = `${dirs.streamdeck}/.brightness`;
    const brightnessExists = await window.api.fileExists(brightnessPath);
    if (brightnessExists) {
      const brightnessResult = await window.api.readFile(brightnessPath);
      if (brightnessResult.success) {
        const brightnessHex = brightnessResult.content.trim();
        const brightness = Math.round((parseInt(brightnessHex, 16) / 255) * 100);
        const slider = document.getElementById('brightness-slider');
        const value = document.getElementById('brightness-value');
        if (slider) slider.value = brightness;
        if (value) value.textContent = brightness + '%';
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  modal.classList.remove('hidden');
}

// Close settings modal
function closeSettings() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// --- Profiles ----------------------------------------------------------------

async function loadProfiles() {
  const sel = document.getElementById('profile-selector');
  if (!sel) return;
  const res = await window.api.listProfiles();
  if (!res || !res.success) return;
  sel.innerHTML = '';
  for (const name of res.profiles) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name === 'default' ? 'Default' : name;
    if (name === res.active) opt.selected = true;
    sel.appendChild(opt);
  }
  const del = document.getElementById('delete-profile-btn');
  if (del) del.disabled = res.active === 'default';
}

async function switchToProfile(name) {
  const res = await window.api.switchProfile(name);
  if (!res || !res.success) { showToast(res?.error || 'Switch failed', 'error'); return; }
  // Element dirs are profile-aware; reload them and repaint for the new profile.
  dirs = await window.api.getDirectories();
  await renderDeckPreview();
  // The open element panel belongs to the old profile - close it.
  document.getElementById('element-panel')?.classList.add('hidden');
  selectedElement = null;
  await loadProfiles();
  showToast(`Profile: ${name === 'default' ? 'Default' : name}`, 'success');
}

function openNewProfileModal() {
  const input = document.getElementById('new-profile-name');
  if (input) input.value = '';
  document.getElementById('new-profile-modal')?.classList.remove('hidden');
  input?.focus();
}

function closeNewProfileModal() {
  document.getElementById('new-profile-modal')?.classList.add('hidden');
}

async function confirmNewProfile() {
  const name = (document.getElementById('new-profile-name')?.value || '').trim();
  if (!name) { showToast('Enter a profile name', 'info'); return; }
  const res = await window.api.createProfile(name);
  if (!res || !res.success) { showToast(res?.error || 'Create failed', 'error'); return; }
  closeNewProfileModal();
  await switchToProfile(name);
}

async function deleteCurrentProfile() {
  const name = document.getElementById('profile-selector')?.value;
  if (!name || name === 'default') { showToast('Cannot delete the default layout', 'info'); return; }
  if (!confirm(`Delete profile "${name}"? This removes profiles/${name}/ and its scripts.`)) return;
  const res = await window.api.deleteProfile(name);
  if (!res || !res.success) { showToast(res?.error || 'Delete failed', 'error'); return; }
  showToast(`Deleted ${name}`, 'success');
  await switchToProfile('default');
}

function setupEventListeners() {
  // Close panel button
  document.getElementById('close-element-panel')?.addEventListener('click', () => {
    const panel = document.getElementById('element-panel');
    panel.classList.remove('slide-in');
    panel.classList.add('slide-out');
    setTimeout(() => {
      panel.classList.add('hidden');
      panel.classList.remove('slide-out');
    }, 200);

    // Deselect element
    document.querySelectorAll('.deck-button, .deck-dial, .deck-touch-zone')
      .forEach(el => el.classList.remove('selected'));
    selectedElement = null;
  });

  // Save button
  document.getElementById('save-element-btn')?.addEventListener('click', saveElementConfig);

  // Profiles
  document.getElementById('profile-selector')?.addEventListener('change', (e) => switchToProfile(e.target.value));
  document.getElementById('add-profile-btn')?.addEventListener('click', openNewProfileModal);
  document.getElementById('delete-profile-btn')?.addEventListener('click', deleteCurrentProfile);
  document.getElementById('close-new-profile')?.addEventListener('click', closeNewProfileModal);
  document.getElementById('cancel-new-profile')?.addEventListener('click', closeNewProfileModal);
  document.getElementById('confirm-new-profile')?.addEventListener('click', confirmNewProfile);
  document.getElementById('new-profile-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'new-profile-modal') closeNewProfileModal();
  });
  document.getElementById('new-profile-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmNewProfile();
  });

  // Image buttons
  document.getElementById('browse-image-btn')?.addEventListener('click', browseImage);
  document.getElementById('icon-library-btn')?.addEventListener('click', showIconLibrary);
  document.getElementById('clear-image-btn')?.addEventListener('click', clearImage);

  // Icon library modal
  document.getElementById('close-icon-library')?.addEventListener('click', () => {
    document.getElementById('icon-library-modal').classList.add('hidden');
  });

  // Close modal when clicking outside
  document.getElementById('icon-library-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'icon-library-modal') {
      document.getElementById('icon-library-modal').classList.add('hidden');
    }
  });

  // Script buttons
  document.getElementById('browse-script-btn')?.addEventListener('click', browseScript);
  document.getElementById('edit-script-btn')?.addEventListener('click', openCodeEditor);
  document.getElementById('clear-script-btn')?.addEventListener('click', clearScript);

  // Code editor buttons
  document.getElementById('close-editor')?.addEventListener('click', closeCodeEditor);
  document.getElementById('cancel-editor-btn')?.addEventListener('click', closeCodeEditor);
  document.getElementById('save-editor-btn')?.addEventListener('click', saveCodeEditor);

  // Close editor when clicking outside
  document.getElementById('code-editor-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'code-editor-modal') {
      closeCodeEditor();
    }
  });

  // Script parameters modal buttons
  document.getElementById('close-params')?.addEventListener('click', closeScriptParametersModal);
  document.getElementById('cancel-params-btn')?.addEventListener('click', closeScriptParametersModal);
  document.getElementById('save-params-btn')?.addEventListener('click', applyScriptParameters);

  // Close parameters modal when clicking outside
  document.getElementById('script-params-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'script-params-modal') {
      closeScriptParametersModal();
    }
  });

  // Close button (window) - with confirmation
  document.getElementById('close-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Just close without confirmation for now
    window.api.closeWindow();
  });

  // Settings button
  document.getElementById('settings-btn')?.addEventListener('click', openSettings);
  document.getElementById('close-settings')?.addEventListener('click', closeSettings);
  document.getElementById('close-settings-btn')?.addEventListener('click', closeSettings);

  // Close settings when clicking outside
  document.getElementById('settings-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') {
      closeSettings();
    }
  });

  // Autostart toggle
  document.getElementById('autostart-toggle')?.addEventListener('change', async (e) => {
    try {
      const result = await window.api.toggleAutostart(e.target.checked);
      if (result.success) {
        showToast(`Autostart ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(`Failed to change autostart: ${result.error}`, 'error');
        e.target.checked = !e.target.checked;
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
      e.target.checked = !e.target.checked;
    }
  });

  // Brightness slider
  document.getElementById('brightness-slider')?.addEventListener('input', (e) => {
    document.getElementById('brightness-value').textContent = e.target.value + '%';
  });

  document.getElementById('brightness-slider')?.addEventListener('change', async (e) => {
    try {
      const brightness = parseInt(e.target.value);
      const brightnessHex = Math.round((brightness / 100) * 255).toString(16).padStart(2, '0');

      // Write brightness to a file that the daemon can read
      const brightnessPath = `${dirs.streamdeck}/.brightness`;
      const result = await window.api.writeFile(brightnessPath, brightnessHex);

      if (result.success) {
        showToast(`Brightness set to ${brightness}%`, 'success');
        // Daemon will detect the file change and apply brightness automatically
      } else {
        showToast(`Failed to set brightness: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    }
  });

  // Restart daemon button
  document.getElementById('restart-daemon-btn')?.addEventListener('click', async () => {
    try {
      const btn = document.getElementById('restart-daemon-btn');
      btn.disabled = true;
      btn.textContent = 'Restarting...';

      const result = await window.api.restartDaemon();

      if (result.success) {
        showToast('Daemon restarted successfully', 'success');
        btn.textContent = 'Restart Stream Deck Daemon';
      } else {
        showToast(`Failed to restart daemon: ${result.error}`, 'error');
        btn.textContent = 'Restart Stream Deck Daemon';
      }

      btn.disabled = false;
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
      const btn = document.getElementById('restart-daemon-btn');
      btn.textContent = 'Restart Stream Deck Daemon';
      btn.disabled = false;
    }
  });

  // View logs link
  document.getElementById('view-logs')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      // Open terminal with journalctl following the daemon logs
      const command = 'konsole -e bash -c "journalctl --user -u streamdeck -f" &';
      await window.api.execCommand(command);
    } catch (error) {
      showToast(`Error opening logs: ${error.message}`, 'error');
    }
  });

  // Script preview modal
  document.getElementById('close-script-preview')?.addEventListener('click', closeScriptPreview);
  document.getElementById('close-script-preview-btn')?.addEventListener('click', closeScriptPreview);

  // Close script preview when clicking outside
  document.getElementById('script-preview-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'script-preview-modal') {
      closeScriptPreview();
    }
  });

  // Search input
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    // TODO: Implement search functionality
    console.log('Search:', e.target.value);
  });

  // Action search
  document.getElementById('action-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const actionItems = document.querySelectorAll('.action-item');

    actionItems.forEach(item => {
      const title = item.querySelector('.action-title')?.textContent.toLowerCase() || '';
      const description = item.querySelector('.action-description')?.textContent.toLowerCase() || '';

      if (title.includes(query) || description.includes(query)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
      // Close script preview modal
      const scriptPreviewModal = document.getElementById('script-preview-modal');
      if (scriptPreviewModal && !scriptPreviewModal.classList.contains('hidden')) {
        closeScriptPreview();
        return;
      }

      // Close settings modal
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal && !settingsModal.classList.contains('hidden')) {
        closeSettings();
        return;
      }

      // Close icon library modal
      const iconModal = document.getElementById('icon-library-modal');
      if (iconModal && !iconModal.classList.contains('hidden')) {
        iconModal.classList.add('hidden');
        return;
      }

      // Close code editor modal
      const editorModal = document.getElementById('code-editor-modal');
      if (editorModal && !editorModal.classList.contains('hidden')) {
        closeCodeEditor();
        return;
      }

      // Close params modal
      const paramsModal = document.getElementById('script-params-modal');
      if (paramsModal && !paramsModal.classList.contains('hidden')) {
        closeScriptParametersModal();
        return;
      }

      // Close element panel
      const panel = document.getElementById('element-panel');
      if (!panel.classList.contains('hidden')) {
        document.getElementById('close-element-panel').click();
      }
    }

    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (selectedElement) {
        saveElementConfig();
      }
    }
  });
}

// Global error handler to prevent crashes
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showToast(`Error: ${event.error.message}`, 'error');
  event.preventDefault(); // Prevent window from closing
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast(`Error: ${event.reason}`, 'error');
  event.preventDefault();
});

// Log before window closes (for debugging)
window.addEventListener('beforeunload', (event) => {
  console.log('Window is closing');
  // Uncomment to prevent accidental closes:
  // event.preventDefault();
  // event.returnValue = '';
});

// Initialize CPU chart
function initCpuChart() {
  const canvas = document.getElementById('cpu-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Initialize with 30 data points (30 seconds of history at 1s intervals)
  cpuData = new Array(30).fill(0);

  cpuChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: cpuData.map((_, i) => ''),
      datasets: [{
        label: 'CPU %',
        data: cpuData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          display: true,
          min: 0,
          max: 100,
          ticks: {
            color: '#666',
            font: {
              size: 10
            },
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            color: '#232c3a',
            drawBorder: false
          }
        }
      }
    }
  });

  // Start updating CPU usage
  updateCpuUsage();
  setInterval(updateCpuUsage, 1000);
}

// Update CPU usage
async function updateCpuUsage() {
  try {
    const result = await window.api.getCpuUsage();

    if (result.success) {
      const usage = Math.max(0, Math.min(100, result.usage || 0));

      // Add new data point and remove oldest
      cpuData.shift();
      cpuData.push(usage);

      // Update chart
      if (cpuChart) {
        cpuChart.data.datasets[0].data = cpuData;
        cpuChart.update('none');
      }

      // Update percentage display
      const percentageEl = document.getElementById('cpu-percentage');
      if (percentageEl) {
        percentageEl.textContent = Math.round(usage) + '%';

        // Color code based on usage
        if (usage > 80) {
          percentageEl.className = 'text-xs font-bold text-red-400';
        } else if (usage > 50) {
          percentageEl.className = 'text-xs font-bold text-yellow-400';
        } else {
          percentageEl.className = 'text-xs font-bold text-blue-400';
        }
      }
    }
  } catch (error) {
    console.error('Error updating CPU usage:', error);
  }
}

let iconLibraryState = {
  type: null,
  num: null,
  allIcons: [],
  categories: new Set(),
  colors: new Set(),
  currentCategory: 'all',
  currentColor: 'all',
  searchTerm: ''
};

async function openIconLibrary(type, num) {
  iconLibraryState.type = type;
  iconLibraryState.num = num;
  
  const modal = document.getElementById('icon-library-modal');
  modal.classList.remove('hidden');
  
  await loadIconLibrary();
}

async function loadIconLibrary() {
  const loading = document.getElementById('icon-loading');
  const empty = document.getElementById('icon-empty');
  const grid = document.getElementById('icon-grid');
  
  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  grid.innerHTML = '';
  
  iconLibraryState.categories.clear();
  iconLibraryState.colors.clear();
  iconLibraryState.allIcons = [];
  
  try {
    const result = await window.api.listDirectoryRecursive(dirs.icons);
    
    if (result.success && result.files && result.files.length > 0) {
      iconLibraryState.allIcons = result.files
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg'))
        .map(f => {
          const parts = f.split('/');
          return {
            path: f,
            category: parts[0] || 'other',
            color: parts.length > 1 ? parts[1] : 'default',
            name: parts[parts.length - 1]
          };
        });
      
      iconLibraryState.allIcons.forEach(icon => {
        iconLibraryState.categories.add(icon.category);
        iconLibraryState.colors.add(icon.color);
      });
      
      console.log('Loaded icons:', iconLibraryState.allIcons.length);
      console.log('Categories:', Array.from(iconLibraryState.categories));
      console.log('Colors:', Array.from(iconLibraryState.colors));
      
      renderIconFilters();
      renderIconGrid();
      
      loading.classList.add('hidden');
    } else {
      loading.classList.add('hidden');
      empty.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading icons:', error);
    loading.classList.add('hidden');
    empty.classList.remove('hidden');
  }
}

// Color filters are rendered together with category filters in renderIconFilters();
// this stub exists so legacy call sites don't throw a ReferenceError.
function renderIconColorFilters() {}

function renderIconFilters() {
  const categoryContainer = document.getElementById('icon-category-filters');
  const colorContainer = document.getElementById('icon-color-filters');
  
  if (!categoryContainer || !colorContainer) return;
  
  categoryContainer.innerHTML = '';
  colorContainer.innerHTML = '';
  
  const btnClass = 'px-3 py-1.5 text-xs rounded transition-colors font-medium';
  const activeClass = 'bg-blue-600 text-white shadow-lg';
  const inactiveClass = 'bg-[#171d28] hover:bg-[#232c3a] text-gray-300 border border-[#232c3a]';
  
  const allCategoryBtn = document.createElement('button');
  allCategoryBtn.textContent = `All (${iconLibraryState.allIcons.length})`;
  allCategoryBtn.className = `${btnClass} ${iconLibraryState.currentCategory === 'all' ? activeClass : inactiveClass}`;
  allCategoryBtn.onclick = () => filterIconsByCategory('all');
  categoryContainer.appendChild(allCategoryBtn);
  
  const sortedCategories = Array.from(iconLibraryState.categories).sort();
  sortedCategories.forEach(cat => {
    const count = iconLibraryState.allIcons.filter(i => i.category === cat).length;
    if (count > 0) {
      const btn = document.createElement('button');
      btn.textContent = `${cat} (${count})`;
      btn.className = `${btnClass} ${iconLibraryState.currentCategory === cat ? activeClass : inactiveClass}`;
      btn.onclick = () => filterIconsByCategory(cat);
      categoryContainer.appendChild(btn);
    }
  });
  
  const allColorBtn = document.createElement('button');
  const colorFilteredIcons = iconLibraryState.currentCategory === 'all' 
    ? iconLibraryState.allIcons 
    : iconLibraryState.allIcons.filter(i => i.category === iconLibraryState.currentCategory);
  allColorBtn.textContent = `All (${colorFilteredIcons.length})`;
  allColorBtn.className = `${btnClass} ${iconLibraryState.currentColor === 'all' ? activeClass : inactiveClass}`;
  allColorBtn.onclick = () => filterIconsByColor('all');
  colorContainer.appendChild(allColorBtn);
  
  Array.from(iconLibraryState.colors).sort().forEach(color => {
    const count = colorFilteredIcons.filter(i => i.color === color).length;
    if (count > 0) {
      const btn = document.createElement('button');
      btn.textContent = `${color} (${count})`;
      btn.className = `${btnClass} ${iconLibraryState.currentColor === color ? activeClass : inactiveClass}`;
      btn.onclick = () => filterIconsByColor(color);
      colorContainer.appendChild(btn);
    }
  });
}

function filterIconsByCategory(category) {
  iconLibraryState.currentCategory = category;
  iconLibraryState.currentColor = 'all';
  renderIconFilters();
  renderIconGrid();
}

function filterIconsByColor(color) {
  iconLibraryState.currentColor = color;
  renderIconFilters();
  renderIconGrid();
}

function renderIconGrid() {
  const grid = document.getElementById('icon-grid');
  const searchInput = document.getElementById('icon-search');
  
  grid.innerHTML = '';
  
  let filtered = iconLibraryState.allIcons;
  
  if (iconLibraryState.currentCategory !== 'all') {
    filtered = filtered.filter(i => i.category === iconLibraryState.currentCategory);
  }
  
  if (iconLibraryState.currentColor !== 'all') {
    filtered = filtered.filter(i => i.color === iconLibraryState.currentColor);
  }
  
  if (searchInput.value.trim()) {
    const term = searchInput.value.toLowerCase();
    filtered = filtered.filter(i => i.name.toLowerCase().includes(term));
  }
  
  filtered.forEach(icon => {
    const iconEl = document.createElement('div');
    iconEl.className = 'aspect-square bg-[#171d28] rounded-lg border-2 border-[#232c3a] hover:border-purple-500 cursor-pointer transition-all duration-200 flex items-center justify-center p-3 hover:scale-105 hover:shadow-lg';
    iconEl.onclick = () => selectIcon(icon);
    
    const img = document.createElement('img');
    img.src = `${dirs.icons}/${icon.path}`;
    img.className = 'w-full h-full object-contain';
    img.style.filter = 'none';
    img.title = icon.name;
    
    iconEl.appendChild(img);
    grid.appendChild(iconEl);
  });
  
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-8 text-center text-gray-400 py-12">No icons found</div>';
  }
}

async function selectIcon(icon) {
  const { type, num } = iconLibraryState;
  
  try {
    const sourcePath = `${dirs.icons}/${icon.path}`;
    const ext = icon.path.split('.').pop();
    
    let destPath;
    if (type === 'button') {
      destPath = `${dirs.buttons}/button-${num}.${ext}`;
    } else if (type === 'touch') {
      destPath = `${dirs.touch}/touch-${num}.${ext}`;
    }
    
    await window.api.copyFile(sourcePath, destPath);
    
    showToast('Icon applied!', 'success');
    
    const modal = document.getElementById('icon-library-modal');
    modal.classList.add('hidden');
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    if (type === 'button') {
      await showButtonPanel(num);
    } else if (type === 'touch') {
      await showTouchPanel(num);
    }
    
    await renderDeckPreview();
  } catch (error) {
    console.error('Error selecting icon:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

document.getElementById('close-icon-modal')?.addEventListener('click', () => {
  document.getElementById('icon-library-modal').classList.add('hidden');
});

document.getElementById('icon-search')?.addEventListener('input', (e) => {
  renderIconGrid();
});

function setupDragAndDrop(element, type, num) {
  const dropZones = createDropZones(type, num);
  element.appendChild(dropZones);
  
  element.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('drag-hover');
  });
  
  element.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (!element.contains(e.relatedTarget)) {
      element.classList.remove('drag-hover', 'drag-over');
    }
  });
  
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('drag-over');
  });
  
  element.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-hover', 'drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileDrop(files[0], type, num, null);
    }
  });
  
  document.addEventListener('dragend', () => {
    element.classList.remove('drag-hover', 'drag-over');
  });
}

function createDropZones(type, num) {
  const container = document.createElement('div');
  container.className = 'drop-zones';
  
  const actions = getActionsForType(type);
  
  actions.forEach(action => {
    const zone = document.createElement('div');
    zone.className = 'drop-zone';
    zone.textContent = action.label;
    zone.dataset.action = action.key;
    zone.dataset.type = type;
    zone.dataset.num = num;
    
    zone.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    zone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.style.background = 'rgba(16, 185, 129, 0.95)';
    });
    
    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.style.background = 'rgba(14, 122, 254, 0.95)';
    });
    
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      zone.classList.add('active');
      zone.style.background = 'rgba(16, 185, 129, 0.95)';
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await handleFileDrop(files[0], type, num, action.key);
      }
      
      const parent = zone.closest('[data-type][data-num]');
      if (parent) {
        parent.classList.remove('drag-hover', 'drag-over');
      }
      
      setTimeout(() => {
        zone.classList.remove('active');
        zone.style.background = 'rgba(14, 122, 254, 0.95)';
      }, 500);
    });
    
    container.appendChild(zone);
  });
  
  return container;
}

function getActionsForType(type) {
  if (type === 'button') {
    return [
      { key: '', label: 'Press' },
      { key: '-longpress', label: 'Long' }
    ];
  } else if (type === 'dial') {
    return [
      { key: '-cw', label: 'CW' },
      { key: '-ccw', label: 'CCW' },
      { key: '-press', label: 'Press' },
      { key: '-longpress', label: 'Long' }
    ];
  } else if (type === 'touch') {
    return [
      { key: '', label: 'Tap' },
      { key: '-longpress', label: 'Long' },
      { key: '-swipe-up', label: '↑' },
      { key: '-swipe-down', label: '↓' },
      { key: '-swipe-left', label: '←' },
      { key: '-swipe-right', label: '→' }
    ];
  }
  return [];
}

async function handleFileDrop(file, type, num, actionKey) {
  console.log('File dropped:', file.path, 'on', type, num, 'action:', actionKey);
  
  const filePath = file.path;
  const fileName = file.name;
  
  let appInfo = null;
  
  if (fileName.endsWith('.desktop')) {
    appInfo = await parseDesktopFile(filePath);
  } else if (fileName.endsWith('.exe')) {
    appInfo = {
      name: fileName.replace('.exe', ''),
      exec: `wine "${filePath}"`,
      icon: null
    };
  } else if (file.type.startsWith('application/') || !file.type) {
    appInfo = {
      name: fileName,
      exec: `"${filePath}"`,
      icon: null
    };
  }
  
  if (appInfo) {
    await autoConfigureApp(appInfo, type, num, actionKey);
  } else {
    showToast('Unsupported file type', 'error');
  }
}

async function parseDesktopFile(filePath) {
  try {
    const result = await window.api.readFile(filePath);
    if (!result.success) return null;
    
    const content = result.content;
    const lines = content.split('\n');
    
    const appInfo = {
      name: null,
      exec: null,
      icon: null
    };
    
    for (const line of lines) {
      if (line.startsWith('Name=')) {
        appInfo.name = line.substring(5).trim();
      } else if (line.startsWith('Exec=')) {
        let exec = line.substring(5).trim();
        exec = exec.replace(/%[uUfF]/g, '');
        exec = exec.trim();
        appInfo.exec = exec;
      } else if (line.startsWith('Icon=')) {
        appInfo.icon = line.substring(5).trim();
      }
    }
    
    return appInfo;
  } catch (error) {
    console.error('Error parsing .desktop file:', error);
    return null;
  }
}

async function autoConfigureApp(appInfo, type, num, actionKey) {
  console.log('Auto-configuring:', appInfo);
  
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';
  const suffix = actionKey || '';
  
  try {
    const scriptPath = `${dir}/${prefix}-${num}${suffix}.sh`;
    const scriptContent = `#!/bin/bash\n${appInfo.exec}\n`;
    
    await window.api.writeFile(scriptPath, scriptContent);
    await window.api.makeExecutable(scriptPath);
    
    if (appInfo.icon) {
      await copyIconForApp(appInfo.icon, type, num);
    }
    
    if (appInfo.name && !actionKey) {
      const labelPath = `${dir}/${prefix}-${num}.txt`;
      await window.api.writeFile(labelPath, appInfo.name);
    }
    
    showToast(`${appInfo.name} configured!`, 'success');
    
    await new Promise(resolve => setTimeout(resolve, 600));
    await renderDeckPreview();
    
  } catch (error) {
    console.error('Error auto-configuring app:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function copyIconForApp(iconPath, type, num) {
  try {
    const dir = type === 'button' ? dirs.buttons : type === 'touch' ? dirs.touch : null;
    if (!dir) return;
    
    const prefix = type === 'button' ? 'button' : 'touch';
    
    if (iconPath.startsWith('/')) {
      if (await window.api.fileExists(iconPath)) {
        const ext = iconPath.split('.').pop();
        const destPath = `${dir}/${prefix}-${num}.${ext}`;
        await window.api.copyFile(iconPath, destPath);
        return;
      }
    }
    
    const iconDirs = [
      '/usr/share/icons/hicolor/128x128/apps',
      '/usr/share/icons/hicolor/256x256/apps',
      '/usr/share/pixmaps',
      `${process.env.HOME}/.local/share/icons`
    ];
    
    for (const iconDir of iconDirs) {
      for (const ext of ['.png', '.svg', '.xpm']) {
        const fullPath = `${iconDir}/${iconPath}${ext}`;
        if (await window.api.fileExists(fullPath)) {
          const destPath = `${dir}/${prefix}-${num}${ext}`;
          await window.api.copyFile(fullPath, destPath);
          return;
        }
      }
    }
  } catch (error) {
    console.error('Error copying icon:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
