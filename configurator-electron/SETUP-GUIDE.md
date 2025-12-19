# Complete Setup Guide - Electron Configurator

## Quick Start (First Time Setup)

### 1. Install Node.js (if not already installed)

```bash
# Check if you have Node.js
node --version
npm --version

# If not installed, install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Dependencies

```bash
cd configurator-electron
./setup.sh
```

This will install all required packages (~200MB):
- electron
- vite
- tailwindcss
- postcss
- autoprefixer

### 3. Launch the Configurator

**Option A: From configurator-electron directory**
```bash
./start.sh
```

**Option B: From parent directory**
```bash
cd /home/zach2825/streamdeck-actions
./configure-electron
```

## Development Mode (For Testing/Development)

If you want to make changes to the UI:

**Terminal 1 - Start Vite dev server:**
```bash
cd configurator-electron
npm run dev
```

**Terminal 2 - Launch Electron:**
```bash
cd configurator-electron
export NODE_ENV=development
npm start
```

In development mode:
- Changes to HTML/CSS/JS reload automatically
- Dev tools are open by default
- Connected to http://localhost:5173

## Features Implemented

### Core Functionality
- ✅ All 8 button configurations
- ✅ All 4 dials with 4 actions each (CW, CCW, Press, Long Press)
- ✅ All 4 touchscreen zones with 6 gestures each
- ✅ Long swipe gestures (left/right)

### UI Features
- ✅ Modern Tailwind CSS styling
- ✅ Dark theme optimized for Stream Deck workflow
- ✅ Tabbed interface (Buttons, Dials, Touchscreen)
- ✅ Image previews (thumbnails)
- ✅ Icon selector with 4000+ icons
  - Category filtering (utils, apps, media, dev, system, creative, brand)
  - Color filtering (blue, red, green, orange, purple, pink, teal)
  - Search functionality

### Actions
- ✅ Browse scripts from filesystem
- ✅ Remove scripts (revert to default)
- ✅ Browse images
- ✅ Select icons from library
- ✅ Remove images
- ✅ Set labels with text
- ✅ Configure label position (top/middle/bottom)
- ✅ Set font size per button/zone
- ✅ Set all font sizes at once
- ✅ Edit scripts in default editor
- ✅ Export configuration (tar.gz)
- ✅ Import configuration (tar.gz)
- ✅ Toggle auto-start

### Keyboard Shortcuts
- ✅ Ctrl+W / Ctrl+Q / Escape - Close window
- ✅ Ctrl+1/2/3 - Switch tabs
- ✅ Ctrl+E - Export config
- ✅ Ctrl+I - Import config

## Features Not Yet Implemented

These features show "Feature coming soon" alerts:
- ⚠️ Example script selector (shows file browser instead)
- ⚠️ Key recorder (shows file browser instead)

You can still achieve these by:
- **Examples**: Browse to `/home/zach2825/streamdeck-actions/examples/` manually
- **Recording**: Use the Python configurator (`./configure`) for key recording

## Architecture

```
main.js          → Electron main process, IPC handlers
preload.js       → Security bridge, exposes window.api
index.html       → UI structure, tabs, modal
src/styles.css   → Tailwind styles
src/renderer.js  → All UI logic (1400+ lines)
```

## Troubleshooting

### "npm: command not found"
Install Node.js first (see step 1 above)

### "Dependencies not installed"
Run `./setup.sh` from the configurator-electron directory

### Window doesn't open
Check if port 5173 is in use (development mode only):
```bash
lsof -i :5173
```

### Icons don't load
Make sure you've downloaded icons:
```bash
cd /home/zach2825/streamdeck-actions
./download-icons.sh utils    # Download utility icons
./download-icons.sh          # Or download all icons
```

### Changes don't appear
The daemon caches file changes. Switch tabs or press F5 to reload the UI.

## Comparing to Python Version

**Electron Version:**
- ✅ Modern Tailwind styling
- ✅ Sleek dark theme
- ✅ Smooth animations
- ❌ ~200MB installed size
- ❌ 2-3 second startup time
- ❌ Requires Node.js

**Python/Tkinter Version (./configure):**
- ✅ Complete feature parity (includes Examples & Key Recorder)
- ✅ 2MB size
- ✅ Instant startup
- ✅ No dependencies to install
- ❌ Less modern styling (but still good!)

Both versions work with the same daemon and config files, so you can use either!

## Next Steps

1. **Try it out**: `./start.sh`
2. **Configure a button**: Click Browse → Select a script
3. **Add an icon**: Click Icons → Pick one
4. **Set a label**: Type text → Click Set
5. **Export your config**: Click Export button

The Electron app saves all changes to the same files as the Python version, so your Stream Deck will reflect changes immediately (or after switching tabs).

Enjoy your modern, Tailwind-styled configurator!
