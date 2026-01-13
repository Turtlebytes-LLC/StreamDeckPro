# Launch Your New Stream Deck Configurator! 🎉

Your Stream Deck configurator now has a beautiful new UI that matches the official Windows Stream Deck software!

## What's New

The new UI features:
- ✨ **Official dark theme** - Matches Stream Deck's professional look
- 🎛️ **Live preview** - See your Stream Deck buttons, dials, and touchscreen zones
- 👆 **Click-to-configure** - Click any element to configure it instantly
- 🖼️ **Visual feedback** - See your images and labels in real-time
- 🎨 **Modern interface** - Clean, intuitive, professional design
- ⚡ **Fast and responsive** - No build step required!

---

## Quick Start

### 1. Launch the Configurator

```bash
cd ~/Nextcloud/Projects/Work/streamdeck-actions
./configure
```

That's it! The configurator will open with the new official-style UI.

### 2. First Launch (One-time Setup)

If this is your first time running the configurator, it will automatically install dependencies. This takes about 1-2 minutes.

You'll see:
```
Dependencies not installed. Running setup...
Installing packages...
✓ Dependencies installed!
Starting Stream Deck Configurator (Official Style UI)...
```

### 3. Using the Configurator

The window is divided into two panels:

**Left Panel - Live Preview:**
- Your Stream Deck with all 8 buttons
- 4 rotary dials
- 4 touchscreen zones
- Click any element to configure it!

**Right Panel - Configuration:**
- Device selector (Stream Deck Plus)
- Profile selector (Default)
- Search actions
- Available actions list

---

## How to Configure

### Configuring a Button

1. **Click a button** in the preview (left side)
2. A configuration panel slides in from the right
3. **Browse for image** - Click "Browse Image" to select an icon
4. **Assign script** - Click "Browse Script" to select an action
5. **Add label** - Type text to overlay on the button
6. **Adjust font size** - Change label font size (10-60)
7. **Set position** - Choose top, middle, or bottom for label
8. **Click "Save Changes"**

Your button updates immediately in the preview!

### Configuring a Dial

1. **Click a dial** in the preview
2. Configure all 4 dial actions:
   - **Rotate Clockwise** - Turn dial right
   - **Rotate Counter-Clockwise** - Turn dial left
   - **Press** - Quick press
   - **Long Press** - Hold for 0.5+ seconds
3. Click "Save Changes"

### Configuring Touchscreen Zones

1. **Click a touchscreen zone** in the preview
2. Configure 6 gestures per zone:
   - **Tap** - Quick touch
   - **Long Press** - Hold
   - **Swipe Up/Down/Left/Right** - Directional swipes
3. Add image and label (optional)
4. Click "Save Changes"

---

## Features

### Real-Time Updates

Changes take effect immediately - no need to restart the daemon!

- Change an image → Preview updates instantly
- Add a label → See it appear on the button
- Adjust font size → Preview reflects the change

### Keyboard Shortcuts

- **Esc** - Close configuration panel
- **Ctrl+S** - Save current configuration
- **Delete** - Clear selected element (coming soon)

### Toast Notifications

Get instant feedback for all actions:
- ✓ Configuration saved!
- ✓ Image assigned!
- ✓ Script assigned!
- ⚠ Error messages with helpful tips

---

## Example Workflow

Let's configure Button 1 to launch Firefox:

1. Launch configurator: `./configure`
2. Click "Button 1" in the preview
3. Click "Browse Image"
4. Select a Firefox icon (from `icons/` directory)
5. Click "Browse Script"
6. Navigate to `examples/open-browser.sh`
7. Type "Firefox" in the Label field
8. Set Font Size to 16
9. Set Position to "Bottom"
10. Click "Save Changes"

Done! Button 1 now shows the Firefox icon with "Firefox" label at the bottom.

---

## Troubleshooting

### "Dependencies not installed" message on every launch

This means npm isn't finding the node_modules directory. Run manually:

```bash
cd configurator-electron
./setup.sh
```

### Window doesn't open

Check if Electron is installed:

```bash
cd configurator-electron
npm list electron
```

If not found, reinstall:

```bash
npm install
```

### "Cannot find module" errors

Run the setup script:

```bash
cd configurator-electron
./setup.sh
```

### Preview doesn't show my buttons

Make sure the daemon is running:

```bash
ps aux | grep streamdeck-daemon
```

If not running:

```bash
./start
```

### Changes don't appear on Stream Deck

The daemon watches for file changes every 0.5 seconds. Wait a moment, or restart the daemon:

```bash
pkill -f streamdeck-daemon
./start
```

---

## UI Components

### Header Bar
- **StreamDeck** - Application title
- **Settings** - App settings (coming soon)
- **✕** - Close window

### Left Panel - Preview
- **Device Type Indicator** - Shows "Stream Deck Plus"
- **Buttons Grid** - 8 LCD buttons (2 rows × 4 columns)
- **Dials Grid** - 4 rotary dials
- **Touchscreen** - 4 touch zones
- **Search Bar** - Quick search (coming soon)
- **Category Pills** - Filter by action type

### Right Panel - Actions & Config
- **Device Selector** - Choose your Stream Deck model
- **Profile Selector** - Switch between profiles
- **Action Search** - Find actions quickly
- **Actions List** - Browse available scripts and examples

### Slide-Out Panel - Element Configuration
- **Image Preview** - Current image for selected element
- **Browse/Clear Image** - Manage element images
- **Script Assignment** - Assign bash scripts
- **Label Configuration** - Add text overlays
- **Font Size** - Adjust label size
- **Position** - Set label placement

---

## Tips & Tricks

### Organizing Your Setup

1. **Use categories** - Group similar actions together
2. **Consistent labeling** - Use clear, short labels
3. **Icon library** - Check the `icons/` directory for pre-made icons
4. **Example scripts** - Browse `examples/` for 128 ready-to-use scripts

### Best Practices

1. **Test scripts first** - Run scripts in terminal before assigning
2. **Keep it simple** - Short, focused actions work best
3. **Use images** - Visual cues are faster than text
4. **Label everything** - Even with images, labels help
5. **Save often** - Click Save after each change

### Advanced Usage

1. **Custom images** - Any PNG, JPG, or SVG works
2. **Font sizes** - 10-24 for small text, 24-40 for readable, 40-60 for large
3. **Position options** - Top for titles, Middle for centered, Bottom for labels
4. **Script permissions** - All scripts must be executable (`chmod +x`)

---

## What's Different from the Old UI?

### Old UI (index.html)
- Tab-based interface
- Separate views for buttons/dials/touchscreen
- No live preview
- Colorful gradients
- Configuration cards

### New UI (index-v2.html - Current)
- ✅ Unified live preview
- ✅ Click any element to configure
- ✅ Dark theme matching official software
- ✅ Real-time visual feedback
- ✅ Slide-out configuration panel
- ✅ Professional, clean design

---

## Architecture

The new UI uses:
- **Electron** - Desktop app framework
- **Tailwind CSS** - Modern styling (via CDN)
- **Vanilla JavaScript** - No frameworks, fast and simple
- **IPC Communication** - Secure file operations
- **Event-driven** - Responsive and interactive

**No build step required!** Just run `./configure` and go!

---

## Next Steps

1. **Configure your buttons** - Start with your most-used actions
2. **Explore examples** - Check `examples/` for inspiration
3. **Customize dials** - Great for volume, media, scrolling
4. **Set up touchscreen** - Quick-access commands at your fingertips
5. **Test everything** - Make sure all scripts work as expected

---

## Need Help?

- **Documentation**: See `docs/` directory for comprehensive guides
- **Examples**: Browse `examples/` for 128 ready-to-use scripts
- **Issues**: Check `TESTING.md` for troubleshooting daemon issues

---

## Enjoy Your New Configurator! 🎉

You now have a professional, modern configurator that makes setting up your Stream Deck a breeze!

**Quick launch**: `./configure`

Happy configuring! 🎛️
