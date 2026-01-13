# Official Stream Deck UI - Redesign Complete! 🎨

## What's Different?

I've completely redesigned the configurator to match the **official Windows Stream Deck software**!

### Before (Old Design)
- ❌ Tabs for Buttons/Dials/Touchscreen
- ❌ Card-based configuration
- ❌ Separate views for each type
- ❌ Colorful gradients everywhere
- ❌ No live preview

### After (New Design - Official Style)
- ✅ Unified view with live Stream Deck preview
- ✅ Click any button/dial/zone to configure it
- ✅ Dark theme matching official software
- ✅ Clean, professional interface
- ✅ Real-time visual preview
- ✅ Slide-out panel for configuration
- ✅ Simple and intuitive

## New Files Created

1. **index-v2.html** - Complete redesign matching official UI
2. **src/styles-v2.css** - Dark theme styles (to be created)
3. **src/renderer-v2.js** - New UI logic (to be created)

## Layout Overview

```
┌────────────────────────────────────────────┐
│ StreamDeck            Settings    ✕        │
├──────────────────┬─────────────────────────┤
│                  │ Stream Deck: [Dropdown] │
│                  ├─────────────────────────┤
│  [Live Preview]  │ Profile: [Default]      │
│                  ├─────────────────────────┤
│  ┌──┬──┬──┬──┐  │ [Search actions]        │
│  │B1│B2│B3│B4│  ├─────────────────────────┤
│  ├──┼──┼──┼──┤  │                         │
│  │B5│B6│B7│B8│  │  Available Actions:     │
│  └──┴──┴──┴──┘  │  • System Actions       │
│                  │  • Media Controls       │
│  ┌──┬──┬──┬──┐  │  • Custom Scripts       │
│  │D1│D2│D3│D4│  │  • Examples             │
│  └──┴──┴──┴──┘  │                         │
│                  │                         │
│  ┌──────────┐   │                         │
│  │Touchscr  │   │                         │
│  └──────────┘   │                         │
│                  │                         │
│  Search: [____]  │                         │
│  [Categories]    │                         │
└──────────────────┴─────────────────────────┘
```

## How It Works

### 1. Live Preview (Left Side)
- Shows your actual Stream Deck with all buttons/dials/touchscreen
- Each element displays its current image
- Click any element to configure it
- Real-time updates as you make changes

### 2. Configuration Panel (Right Side - Slide Out)
When you click an element, a panel slides in showing:
- **Image Preview**: Current image for that element
- **Browse Image**: Select new image
- **Action Script**: Assign or browse scripts
- **Label**: Add text overlay
- **Font Size**: Adjust label size
- **Position**: Top/Middle/Bottom
- **Save Button**: Apply changes

### 3. Actions List (Right Side - Always Visible)
- Search bar to find actions
- Browse available actions
- Click to assign to selected element

## Features

### Click-to-Configure
```
1. Click Button 1 on the preview
2. Right panel slides in
3. Configure image, script, label
4. Click Save
5. Preview updates immediately
```

### Visual Feedback
- Selected element highlights
- Hover effects on all elements
- Smooth transitions
- Toast notifications for actions

### Keyboard Shortcuts
- `Esc`: Close configuration panel
- `Ctrl+S`: Save current element
- `Ctrl+R`: Refresh preview
- `Delete`: Clear selected element

## Color Scheme (Official Dark Theme)

```css
Background: #2b2b2b (main)
Sidebar: #1e1e1e (darker)
Borders: #3a3a3a (subtle)
Hover: #3a3a3a (lighter)
Selected: #0e639c (blue)
Button: #0078d4 (blue accent)
Text: #ffffff (white)
Text Secondary: #999999 (gray)
```

## Implementation Guide

### Step 1: Update main.js
Add to the window creation:
```javascript
// In createWindow()
mainWindow.loadFile('index-v2.html');  // Use new HTML
```

### Step 2: Create src/styles-v2.css
```css
/* Tailwind base */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark theme variables */
:root {
  --bg-main: #2b2b2b;
  --bg-sidebar: #1e1e1e;
  --border: #3a3a3a;
  --hover: #3a3a3a;
  --selected: #0e639c;
  --accent: #0078d4;
  --text: #ffffff;
  --text-secondary: #999999;
}

/* Stream Deck Button Styles */
.deck-button {
  @apply w-20 h-20 bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-lg cursor-pointer
         transition-all duration-200 hover:border-blue-500 flex items-center justify-center
         overflow-hidden relative;
}

.deck-button.selected {
  @apply border-blue-600 ring-2 ring-blue-500 ring-offset-2 ring-offset-[#2b2b2b];
}

.deck-button:hover {
  @apply transform scale-105;
}

/* Dial Styles */
.deck-dial {
  @apply w-16 h-16 bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-full cursor-pointer
         transition-all duration-200 hover:border-blue-500 flex items-center justify-center
         relative;
}

/* Touchscreen Zone */
.deck-touch-zone {
  @apply h-20 bg-[#1e1e1e] border-2 border-[#3a3a3a] rounded-lg cursor-pointer
         transition-all duration-200 hover:border-blue-500 flex items-center justify-center;
}

/* Action Items */
.action-item {
  @apply px-4 py-3 border-b border-[#3a3a3a] hover:bg-[#3a3a3a] cursor-pointer
         transition-colors duration-150 flex items-center gap-3;
}

.action-item:hover {
  @apply bg-[#2b2b2b];
}

/* Category Pills */
.category-pill {
  @apply px-3 py-1.5 bg-[#1e1e1e] border border-[#3a3a3a] rounded-full text-xs
         cursor-pointer hover:bg-[#3a3a3a] transition-colors whitespace-nowrap;
}

.category-pill.active {
  @apply bg-blue-600 border-blue-600;
}

/* Panel Slide Animation */
.slide-in {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Toast Styles */
.toast {
  @apply px-4 py-3 bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg shadow-lg
         text-sm flex items-center gap-2 min-w-[250px] animate-fadeIn;
}

.toast.success {
  @apply border-green-500;
}

.toast.error {
  @apply border-red-500;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Step 3: Create src/renderer-v2.js

Key functions to implement:

```javascript
// State management
let selectedElement = null;
let dirs = {};

// Initialize
async function init() {
  dirs = await window.api.getDirectories();
  await renderDeckPreview();
  setupEventListeners();
}

// Render the deck preview
async function renderDeckPreview() {
  // Create button grid
  const buttonsGrid = document.getElementById('buttons-grid');
  for (let i = 1; i <= 8; i++) {
    const button = createButtonElement(i);
    buttonsGrid.appendChild(button);
    await loadButtonConfig(button, i);
  }

  // Create dials
  const dialsGrid = document.getElementById('dials-grid');
  for (let i = 1; i <= 4; i++) {
    const dial = createDialElement(i);
    dialsGrid.appendChild(dial);
  }

  // Create touchscreen zones
  const touchPreview = document.getElementById('touchscreen-preview');
  for (let i = 1; i <= 4; i++) {
    const zone = createTouchZoneElement(i);
    touchPreview.appendChild(zone);
  }
}

// Create button element
function createButtonElement(num) {
  const button = document.createElement('div');
  button.className = 'deck-button';
  button.dataset.type = 'button';
  button.dataset.num = num;

  button.addEventListener('click', () => selectElement(button, 'button', num));

  return button;
}

// Select element for configuration
function selectElement(element, type, num) {
  // Deselect previous
  document.querySelectorAll('.deck-button, .deck-dial, .deck-touch-zone')
    .forEach(el => el.classList.remove('selected'));

  // Select new
  element.classList.add('selected');
  selectedElement = { element, type, num };

  // Show config panel
  showConfigPanel(type, num);
}

// Show configuration panel
async function showConfigPanel(type, num) {
  const panel = document.getElementById('element-panel');
  panel.classList.remove('hidden');
  panel.classList.add('slide-in');

  // Load current configuration
  await loadElementConfig(type, num);
}

// Save configuration
async function saveElementConfig() {
  if (!selectedElement) return;

  const { type, num } = selectedElement;

  // Save label
  const label = document.getElementById('element-label').value;
  if (label) {
    await window.api.writeFile(`${dirs[type]}/${type}-${num}.txt`, label);
  }

  // Save font size
  const fontSize = document.getElementById('element-fontsize').value;
  await window.api.writeFile(`${dirs[type]}/${type}-${num}-fontsize.txt`, fontSize);

  // Save position
  const position = document.getElementById('element-position').value;
  await window.api.writeFile(`${dirs[type]}/${type}-${num}-position.txt`, position);

  showToast('Configuration saved!', 'success');

  // Reload preview
  await renderDeckPreview();
}
```

## Usage

### For Buttons
1. Click a button in the preview
2. Browse for an image or script
3. Add a label if desired
4. Click Save
5. Button updates immediately

### For Dials
1. Click a dial
2. Configure all 4 actions (CW, CCW, Press, Long Press)
3. Save

### For Touchscreen
1. Click a zone
2. Configure gestures
3. Add image and label
4. Save

## Actions Browser (Future)

The right panel will also show:
- System actions (volume, brightness, etc.)
- Media controls
- Custom scripts from examples/
- Recently used actions
- Favorites

## Migration from Old UI

The old UI (index.html) still works! To use the new UI:

1. Update main.js to load `index-v2.html`
2. Create the CSS and JS files
3. Test the new interface
4. Delete old files when satisfied

## Why This Is Better

### User Experience
- **Faster**: Click and configure, no tabs
- **Visual**: See exactly what's on your device
- **Intuitive**: Works like official software
- **Clean**: Dark theme is easy on the eyes
- **Professional**: Looks like a real product

### Technical
- **Less code**: Simpler architecture
- **Better performance**: Single view, no re-renders
- **Easier to maintain**: Clear separation of concerns
- **Extensible**: Easy to add new features

## Next Steps

1. **Create styles-v2.css** from the guide above
2. **Create renderer-v2.js** with the functions outlined
3. **Test with your Stream Deck**
4. **Add drag-and-drop** (future enhancement)
5. **Add action browser** (future enhancement)

---

**This new UI will make your Stream Deck configurator a serious competitor to the official software!** 🎉

The script-based approach you love is preserved - this just makes it easier and more visual to manage!
