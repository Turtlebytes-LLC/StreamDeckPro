# Stream Deck Electron Configurator

A modern Electron-based configuration UI for Stream Deck with Tailwind CSS styling.

## Status

⚠️ **PARTIAL IMPLEMENTATION** - This Electron app has the complete structure but requires the renderer.js to be completed.

### What's Complete:
- ✅ Full Electron setup (main.js, preload.js, package.json)
- ✅ Tailwind CSS configuration
- ✅ Complete HTML structure with all tabs
- ✅ IPC handlers for all file operations
- ✅ Vite build configuration

### What Needs Completion:
- ⚠️ renderer.js implementation (started but needs full features)

The original Tkinter configurator (configure-ui.py) is **2779 lines** and fully functional. This Electron version would require approximately **2000+ lines** of JavaScript to achieve feature parity.

## Quick Start

### Install Dependencies

```bash
cd configurator-electron
chmod +x setup.sh
./setup.sh
```

### Run in Development Mode

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
export NODE_ENV=development
npm start
```

### Build for Production

```bash
npm run build
npm start
```

## Architecture

```
configurator-electron/
├── main.js           # Electron main process
├── preload.js        # IPC bridge (security layer)
├── index.html        # Main UI structure
├── src/
│   ├── styles.css    # Tailwind styles
│   └── renderer.js   # UI logic (NEEDS COMPLETION)
├── package.json      # Dependencies
├── vite.config.js    # Build config
└── tailwind.config.js
```

## Completing the Implementation

To finish this Electron app, you need to complete `src/renderer.js` with:

1. **State Management** - Track current configs for all buttons/dials/touch zones
2. **Tab Rendering** - Functions to render all 8 buttons, 4 dials, 4 touch zones + gestures
3. **Event Handlers** - Button clicks for all actions (browse, edit, remove, etc.)
4. **Icon Selector** - Modal with category/color filtering and icon grid
5. **File Operations** - Read/write configs, images, scripts
6. **Export/Import** - Tar archive creation/extraction
7. **Keyboard Shortcuts** - Ctrl+1/2/3, Ctrl+E, Ctrl+I, etc.

### Referencing the Original

The Python configurator at `../configure-ui.py` contains all the logic you need. Key sections to port:

- Lines 185-430: Buttons tab
- Lines 490-610: Dials tab
- Lines 640-920: Touchscreen tab
- Lines 2170-2430: Icon selector
- Lines 1400-1600: Export/import

## Why Use the Tkinter Version Instead?

**Recommendation:** Stick with the original Tkinter configurator (`../configure-ui.py`).

**Reasons:**
1. **Complete** - All 2779 lines are implemented and tested
2. **Lightweight** - 2MB vs 200MB for Electron
3. **Fast** - Instant startup vs 2-3 seconds
4. **Modern** - Recent improvements made it look great
5. **Maintained** - Already has all your custom features

**When to use Electron:**
- You absolutely must have Tailwind CSS styling
- You want to distribute as a standalone app package
- You're willing to invest 8-10 hours completing the implementation

## Converting Back

If you want to abandon this Electron version:

```bash
cd ..
./configure  # Use the original Tkinter version
```

The Tkinter version has all features working:
- ✅ Mouse wheel scrolling
- ✅ Keyboard shortcuts
- ✅ Image previews
- ✅ Icon selector with 4000+ icons
- ✅ Drag and drop
- ✅ Export/Import
- ✅ All remove buttons
- ✅ Font size controls

## License

Same as parent project
