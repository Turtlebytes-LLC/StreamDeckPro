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

    // Load categories
    loadCategories();
    console.log('Categories loaded');

    // Load actions list
    loadActions();
    console.log('Actions loaded');

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
          <div class="empty-state-icon">⚠️</div>
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

  // Update title
  const typeNames = { button: 'Button', dial: 'Dial', touch: 'Touch Zone' };
  title.textContent = `${typeNames[type]} ${num}`;

  // Load current configuration
  await loadElementConfig(type, num);

  // Show panel with animation
  panel.classList.remove('hidden');
  panel.classList.add('slide-in');
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
    imagePreview.innerHTML = '<span style="font-size: 48px;">🎛️</span>';
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
            <div class="text-4xl mb-2">📁</div>
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
        <div class="text-4xl mb-2">🖼️</div>
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
    iconItem.className = 'aspect-square bg-[#2b2b2b] rounded border-2 border-[#3a3a3a] hover:border-blue-500 cursor-pointer transition-all flex items-center justify-center overflow-hidden p-2';

    try {
      const imageResult = await window.api.readImageBase64(iconPath);
      if (imageResult.success) {
        const img = document.createElement('img');
        img.src = imageResult.data;
        img.className = 'w-full h-full object-contain';
        iconItem.appendChild(img);
      } else {
        iconItem.innerHTML = '<span class="text-2xl">📄</span>';
      }
    } catch (error) {
      iconItem.innerHTML = '<span class="text-2xl">❌</span>';
    }

    iconItem.title = file;
    iconItem.addEventListener('click', () => selectIcon(iconPath));

    iconGrid.appendChild(iconItem);
  }

  modal.classList.remove('hidden');
}

// Render icon category filters
function renderIconFilters() {
  const filterContainer = document.getElementById('icon-filters');
  if (!filterContainer) return;

  filterContainer.innerHTML = '';

  // Add "All" button
  const allBtn = document.createElement('button');
  allBtn.textContent = `All (${allIcons.length})`;
  allBtn.className = currentIconCategory === 'all' ?
    'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white' :
    'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
  allBtn.addEventListener('click', () => {
    document.querySelectorAll('#icon-filters button').forEach(b => {
      b.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
    });
    allBtn.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white';
    showIconLibrary('all', null);
  });
  filterContainer.appendChild(allBtn);

  // Add category buttons
  const sortedCategories = Array.from(iconCategories).sort();
  for (const cat of sortedCategories) {
    const count = allIcons.filter(f => f.startsWith(cat + '/')).length;
    const btn = document.createElement('button');
    btn.textContent = `${cat} (${count})`;
    btn.className = currentIconCategory === cat ?
      'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white' :
      'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
    btn.addEventListener('click', () => {
      document.querySelectorAll('#icon-filters button').forEach(b => {
        b.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
      });
      btn.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white';
      showIconLibrary(cat, null);
    });
    filterContainer.appendChild(btn);
  }
}

// Render icon color filters
function renderIconColorFilters() {
  const filterContainer = document.getElementById('icon-color-filters');
  if (!filterContainer) return;

  filterContainer.innerHTML = '';

  // Calculate counts for each color across current category
  let colorsToShow = iconColors;
  if (currentIconCategory !== 'all') {
    // Only show colors available in current category
    colorsToShow = new Set();
    allIcons.forEach(file => {
      if (file.startsWith(currentIconCategory + '/')) {
        const parts = file.split('/');
        if (parts.length > 2) {
          colorsToShow.add(parts[1]);
        }
      }
    });
  }

  // Add "All" button
  const allBtn = document.createElement('button');
  const allCount = currentIconCategory === 'all' ? allIcons.length :
                   allIcons.filter(f => f.startsWith(currentIconCategory + '/')).length;
  allBtn.textContent = `All (${allCount})`;
  allBtn.className = currentIconColor === 'all' ?
    'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white' :
    'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
  allBtn.addEventListener('click', () => {
    document.querySelectorAll('#icon-color-filters button').forEach(b => {
      b.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
    });
    allBtn.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white';
    showIconLibrary(null, 'all');
  });
  filterContainer.appendChild(allBtn);

  // Add color buttons
  const sortedColors = Array.from(colorsToShow).sort();
  for (const color of sortedColors) {
    let count = 0;
    if (currentIconCategory === 'all') {
      count = allIcons.filter(f => {
        const parts = f.split('/');
        return parts.length > 2 && parts[1] === color;
      }).length;
    } else {
      count = allIcons.filter(f => {
        const parts = f.split('/');
        return f.startsWith(currentIconCategory + '/') && parts.length > 2 && parts[1] === color;
      }).length;
    }

    const btn = document.createElement('button');
    btn.textContent = `${color} (${count})`;
    btn.className = currentIconColor === color ?
      'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white' :
      'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
    btn.addEventListener('click', () => {
      document.querySelectorAll('#icon-color-filters button').forEach(b => {
        b.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-[#2b2b2b] hover:bg-[#3a3a3a]';
      });
      btn.className = 'px-3 py-1.5 text-xs rounded transition-colors bg-blue-600 text-white';
      showIconLibrary(null, color);
    });
    filterContainer.appendChild(btn);
  }
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

      // Update script input
      document.getElementById('element-script').value = destPath;

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

    // Update script input
    document.getElementById('element-script').value = 'No script assigned';
  } catch (error) {
    console.error('Clear script error:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
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

      // Update script input
      document.getElementById('element-script').value = currentScriptPath;

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
              icon: '📜',
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
                icon: '💻',
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
            icon: '🔘',
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
            icon: '⚙️',
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
            icon: '👆',
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
          <div class="empty-state-icon">🔍</div>
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
        <div class="action-icon">${action.icon}</div>
        <div class="action-info">
          <div class="action-title">${action.title}</div>
          <div class="action-description">${action.description}</div>
        </div>
        <button class="preview-script-btn px-3 py-1.5 bg-[#2b2b2b] hover:bg-[#3a3a3a] rounded text-xs transition-colors border border-[#3a3a3a]">
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
        <div class="empty-state-icon">❌</div>
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
  const dir = type === 'button' ? dirs.buttons : type === 'dial' ? dirs.dials : dirs.touch;
  const prefix = type === 'button' ? 'button' : type === 'dial' ? 'dial' : 'touch';

  try {
    const destPath = `${dir}/${prefix}-${num}.sh`;

    await window.api.copyFile(scriptPath, destPath);

    // Make script executable
    const makeExecResult = await window.api.makeExecutable(destPath);
    if (!makeExecResult.success) {
      console.warn('Could not make script executable:', makeExecResult.error);
    }

    showToast('Script assigned!', 'success');

    // Update script input in config panel
    document.getElementById('element-script').value = destPath;

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
        class="w-full bg-[#2b2b2b] border border-[#3a3a3a] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
        class="w-full bg-[#2b2b2b] border border-[#3a3a3a] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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

      // Update script input in config panel
      document.getElementById('element-script').value = destPath;

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
          <div class="text-sm font-medium text-blue-300 mb-2">🎛️ Dial Controls:</div>
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

    <div class="bg-[#1a1a1a] border border-[#3a3a3a] rounded p-3">
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

    statusDiv.innerHTML = '<span class="text-yellow-400">🔴 Recording... Press ESC to stop</span>';

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
            color: '#3a3a3a',
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
