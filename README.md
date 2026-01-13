# 🎛️ Stream Deck Plus - Complete Action System

> Transform your Elgato Stream Deck Plus into a powerful automation tool with 50 customizable actions, beautiful UI configuration, and macro recording capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

## 🎉 What's New - January 2026

**Complete Configurator v2 Redesign!**

- 🎨 **Official Stream Deck Style UI** - Beautiful dark theme matching the official software
- 🖼️ **Icon Library with 2000+ Icons** - Browse by category and color with instant preview
- 👀 **Script Preview** - View any script before assigning it with syntax highlighting
- ⚡ **Instant Brightness Control** - Adjust brightness without restarting daemon
- ⚙️ **Settings Panel** - One place for autostart, brightness, and daemon controls
- 🎛️ **Dial Macro Stepper** - Record macros and step through them keystroke-by-keystroke
- 📊 **Live System Monitoring** - Real-time CPU charts on touch zones
- ✨ **Polished UI** - Smooth animations, gradients, and professional design

**Reliability Improvements:**

- ✅ **Auto-reconnects on KVM switch** - No more manual restarts!
- ✅ **USB re-plug detection** - Unplug/replug works automatically
- ✅ **Robust error recovery** - Never crashes, always recovers
- ✅ **Fixed autostart** - Works reliably on X11 and Wayland
- ✅ **Optimized performance** - 80% reduction in overhead
- ✅ **One-click USB permissions setup** - Automated configuration

**[→ Launch new UI](configurator-electron/SETUP-CONFIGURATOR.md)** | **[→ Test improvements](TESTING.md)** | **[→ See all changes](docs/FIXES-APPLIED.md)**

## ✨ Features

### Configurator v2
- **🎨 Official-Style Interface** - Dark theme matching Elgato's official software
- **🖼️ Icon Library** - 2000+ icons with category and color filters
- **👀 Script Preview** - View any script contents before assigning
- **⚡ Live Brightness** - Adjust Stream Deck brightness instantly
- **⚙️ Settings Panel** - Autostart, brightness, daemon controls in one place
- **📊 System Monitoring** - Live CPU charts with sparklines
- **✨ Beautiful Animations** - Smooth transitions and hover effects

### Actions & Automation
- **50 Customizable Actions** - 8 LCD buttons, 16 dial actions (4 dials × 4 gestures), 24 touchscreen gestures, 2 long swipes
- **135+ Ready-to-Use Scripts** - General actions, developer tools, and system utilities
- **Dial Macro Stepper** - Record macros and step through them keystroke-by-keystroke
- **Custom Images & Labels** - Personalize every button and touchscreen zone
- **Hot-Reload Support** - Changes take effect immediately without restarting
- **Complete Logging** - Track every action with journalctl integration
- **Zero Configuration** - No JSON, no complex setup - just bash scripts!

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Turtlebytes-LLC/StreamDeckPro.git
cd streamdeck-actions

# Install Python dependencies
pip3 install --user streamdeck

# Make scripts executable
chmod +x start configure create-action streamdeck-daemon.py

# Start the daemon
./start
```

### Launch Configurator v2

```bash
./configure
```

**The new configurator offers:**
- 🎯 Visual Stream Deck preview with buttons, dials, and touchscreen
- 📜 Browse 135+ example scripts with instant preview
- 🖼️ Icon library with 2000+ icons, filterable by category and color
- ⚙️ Settings panel for brightness, autostart, and daemon control
- 🎛️ Dial macro stepper for advanced keyboard automation
- 📊 Live system monitoring (CPU, RAM, disk)
- ✨ Beautiful, responsive interface with smooth animations

## 📋 Supported Gestures

### LCD Buttons (8)
- Press → Execute script

### Rotary Dials (4 dials × 4 actions = 16)
- Rotate clockwise
- Rotate counter-clockwise
- Press (quick tap)
- Long press (hold 0.5s+)

### Touchscreen (4 zones × 6 gestures = 24)
- Tap
- Long press
- Swipe up/down/left/right

### Screen-Wide Gestures (2)
- Long swipe left (across entire screen)
- Long swipe right (across entire screen)

**Total: 50 customizable actions!**

## 📚 Example Scripts Included (135+)

### General Actions (57 scripts)
- **Volume & Media Control** (8) - Volume up/down/mute, play/pause, next/previous track, mic toggle
- **Window Management** (12) - Maximize, minimize, tile left/right, show desktop, switch workspaces
- **Screenshots** (4) - Full screen, area, window capture
- **Flameshot Screenshots** (8) - GUI, clipboard, delay, pin, custom save
- **System Actions** (5) - Lock, logout, suspend, brightness
- **Applications** (4) - Browser, terminal, file manager, quick notes
- **System Info** (3) - CPU/RAM/disk display, system notifications
- **Keyboard Automation** (13) - Common shortcuts and text snippets

### Developer Actions (78 scripts)
- **Navigation** (12) - Arrow keys, page up/down, home/end
- **Code Editing** (14) - Duplicate line, delete line, format, comment
- **Code Navigation** (8) - Go to definition, find references, rename
- **Search & Replace** (4) - Find, replace, multi-cursor
- **IDE Interface** (7) - Terminal, sidebar, command palette
- **Debugging** (9) - Start, stop, step over/into, breakpoints
- **Git Commands** (7) - Status, add, commit, push, pull
- **NPM/Docker/Python** (9) - Common development commands
- **Build Tools** (2) - Make, build commands
- **Terminal** (3) - Clear, navigate, list files
- **Macro System** (4) - Dial macro stepper, recorder, player, controller

### Power User Actions
- **Dial Macro Stepper** - Record keyboard macros and step through keystroke-by-keystroke
- **System Monitoring** - Live CPU/RAM/disk charts on touch zones
- **Custom Workflows** - Chain multiple scripts together

## 🎨 Customization

### File Structure

```
streamdeck-actions/
├── buttons/              # 8 button scripts + images + labels
│   ├── button-1.sh       # Script to execute
│   ├── button-1.png      # Custom image (120×120)
│   └── button-1.txt      # Label text
├── dials/                # 4 dials × 4 actions each
│   ├── dial-1-cw.sh      # Rotate clockwise
│   ├── dial-1-ccw.sh     # Rotate counter-clockwise
│   ├── dial-1-press.sh   # Press
│   └── dial-1-longpress.sh
├── touchscreen/          # 4 zones × 6 gestures + 2 long swipes
│   ├── touch-1.sh        # Tap
│   ├── touch-1-longpress.sh
│   ├── touch-1-swipe-up.sh
│   ├── touch-1.png       # Zone image (200×100)
│   ├── touch-1.txt       # Zone label
│   ├── longswipe-left.sh
│   └── longswipe-right.sh
└── examples/             # 120 ready-to-use scripts
    ├── volume-up.sh
    ├── media-play-pause.sh
    └── dev-actions/      # 78 developer scripts
        ├── arrow-up.sh
        ├── git-status.sh
        └── ...
```

### Creating Custom Actions

**Using Configurator v2 (Recommended):**
1. Run `./configure` to launch the configurator
2. Click any button, dial, or touch zone to select it
3. Browse example scripts in the actions list or click "Browse" to select your own
4. Click "View" to preview any script before assigning
5. Add an icon from the 2000+ icon library with category and color filters
6. Optionally add a label and customize font size/position
7. Click "Save Changes" - updates apply instantly!

**Manual Method:**
1. Create a bash script in the appropriate directory (`buttons/`, `dials/`, `touchscreen/`)
2. Make it executable: `chmod +x your-script.sh`
3. Optionally add images (.png/.jpg) and labels (.txt)
4. The daemon automatically detects changes (hot-reload)

**Example Custom Script:**
```bash
#!/bin/bash
# Launch VS Code in current project
cd ~/Projects/my-project
code .
```

## 🎯 Use Cases

### For Developers
- Quick access to Git commands
- IDE shortcuts at your fingertips
- Build and deploy with one button
- Debug controls on dials
- Terminal commands on touchscreen

### For Creators
- Media playback control
- Scene switching
- Audio mixing
- Screenshot tools
- Application launching

### For Power Users
- Window management
- Virtual desktop switching
- Volume and brightness control
- Custom keyboard macros
- System commands

## 🔧 Advanced Features

### 🎨 Configurator v2 - Professional Interface

The completely redesigned configurator brings a polished, professional experience:

**Visual Design:**
- Official Stream Deck style dark theme
- Smooth animations and transitions
- Gradient effects on buttons, dials, and touch zones
- Live preview of your Stream Deck layout

**Icon Library:**
- 2000+ professional icons
- Filter by category (apps, dev, media, system, utils, etc.)
- Filter by color (blue, red, green, cyan, and more)
- Instant preview before applying

**Script Management:**
- View any script contents with the "View" button
- Syntax-highlighted preview in readonly modal
- Browse 135+ example scripts
- Organize by categories

**Settings Panel:**
- Toggle autostart with one click
- Adjust brightness with live preview (no daemon restart needed)
- Restart daemon when needed
- View daemon logs with one click

### ⚡ Instant Brightness Control

Adjust your Stream Deck's brightness in real-time without restarting the daemon! The configurator includes a smooth slider that updates brightness instantly through file monitoring.

### 🎬 Dial Macro Stepper - The Game Changer

**Record. Replay. Step Through. One keystroke at a time.**

The dial macro stepper is a sophisticated keyboard automation system:

#### What Makes It Special

✨ **Full Keyboard Capture with Suppression**
- Records every keystroke including system shortcuts (Ctrl+Alt+T, etc.)
- Suppresses keystrokes during recording so they don't trigger
- Real-time display shows each key as it's recorded
- Perfect for complex workflows with modifiers and navigation

🎯 **Step-Through Playback**
- **Turn dial right**: Execute next keystroke
- **Turn dial left**: Undo previous keystroke (intelligent reverse)
- **Press dial**: Play entire macro at once
- **Hold dial**: Clear macro and start fresh
- State persistence tracks your position through the macro

⚡ **Smart Recording Workflow**
- First press on empty macro → Opens recorder terminal
- Subsequent press → Plays the recorded macro
- Terminal shows real-time feedback during recording
- Cross-platform terminal detection (konsole, gnome-terminal, xterm, etc.)

🔔 **Visual Position Tracking**
- Know exactly which step you're on
- Step forward/backward through complex macros
- Undo individual keystrokes by turning left
- Auto-reset after completion

#### How to Use

1. **Record a macro**:
   - Press the dial → Terminal opens for recording
   - Type your workflow - all keystrokes captured and suppressed
   - Press ESC → Recording stops and saves

2. **Replay the macro**:
   - Press dial → Full playback
   - Turn right → Execute next keystroke
   - Turn left → Undo previous keystroke

3. **Clear and record new**:
   - Hold dial → Clears macro, next press will re-open recorder

#### Real-World Example

Record opening a terminal and running commands:
```
Ctrl+Alt+T → Opens terminal
cd ~/Projects → Navigate to folder
git status → Check repo status
```

Then step through it one command at a time, or play it all at once!

#### Technical Details

Implementation files in `examples/dev-actions/`:
- `dial-macro-stepper.sh` - Main controller script
- `utils/macro-recorder.py` - Records with pynput (suppression enabled)
- `utils/macro-player.py` - Plays back with xdotool
- `utils/dial-macro-controller.py` - Step-through state management

Uses pynput for keystroke capture with suppression, xdotool for reliable system shortcut playback.

### 📊 Live System Monitoring

Display real-time system metrics directly on your Stream Deck touchscreen!

**CPU Monitoring:**
- Live CPU usage chart with sparkline visualization
- Updates every 0.5 seconds
- Percentage display with color coding (blue/yellow/red based on load)
- Auto-starts with daemon
- Runs in background without affecting performance

**How to Use:**
Assign `monitor-cpu-chart.sh` to any touch zone for instant CPU visualization. The chart automatically updates and persists across daemon restarts.

**Technical Implementation:**
- ImageMagick for dynamic chart generation
- Automatic cleanup of old monitor processes
- State persistence in `/tmp`
- Color-coded based on CPU load

### 🖼️ Icon Library - 2000+ Professional Icons

The configurator includes a comprehensive icon library with smart filtering:

**Filtering System:**
- **Category filters**: All Actions, Media, Window, System, Apps, Developer
- **Color filters**: All, Blue, Red, Green, Cyan, and more
- **Combined filtering**: Select both category and color for precise results
- **Live preview**: See icons before applying them

**Icon Organization:**
- Nested directory structure: `icons/category/color/icon.png`
- Automatic icon detection and loading
- Support for PNG, JPG, and SVG formats
- Fast recursive directory scanning

**Usage:**
1. Click the "Icons" button when configuring any element
2. Filter by category and/or color
3. Click any icon to apply it instantly
4. Changes take effect immediately

### ⚡ Hot-Reload & Live Updates

Changes to scripts, images, and labels are detected automatically:
- 0.5-second file polling interval
- No daemon restart needed
- Instant visual updates on Stream Deck
- Brightness changes apply immediately

### 🔍 Script Preview

Before assigning any script, view its contents:
- Click "View" on any action in the list
- Readonly modal with syntax highlighting
- See exactly what the script does
- Close with ESC or click outside

### 📝 Comprehensive Logging

Track every action with systemd journal integration:
```bash
journalctl --user -u streamdeck -f
```

Or view logs directly from the configurator's Settings panel with one click.

## 📖 Documentation

### Getting Started
- **[TESTING.md](TESTING.md)** - Test all the new improvements (KVM switch, USB re-plug, etc.)
- **[docs/START-HERE.md](docs/START-HERE.md)** - Quick start guide
- **[docs/QUICK-START.txt](docs/QUICK-START.txt)** - 5-minute setup guide

### Improvements & Changes
- **[docs/TODAYS-ACCOMPLISHMENTS.md](docs/TODAYS-ACCOMPLISHMENTS.md)** - Summary of all improvements
- **[docs/FIXES-APPLIED.md](docs/FIXES-APPLIED.md)** - Detailed technical changes
- **[docs/WHATS-NEW.md](docs/WHATS-NEW.md)** - Update summary

### Comprehensive Guides
- **[docs/ALL-GESTURES.md](docs/ALL-GESTURES.md)** - Complete gesture reference
- **[docs/COMPLETE-SYSTEM.txt](docs/COMPLETE-SYSTEM.txt)** - System overview
- **[docs/MEMORY.md](docs/MEMORY.md)** - Configuration patterns and notes
- **[docs/INSTALL.md](docs/INSTALL.md)** - Installation guide

### USB & Setup
- **[docs/USB-PERMISSIONS.md](docs/USB-PERMISSIONS.md)** - USB permission setup
- **[docs/USB-ERROR-FIX.md](docs/USB-ERROR-FIX.md)** - Troubleshooting USB issues

### Configurator UI
- **[configurator-electron/OFFICIAL-UI-REDESIGN.md](configurator-electron/OFFICIAL-UI-REDESIGN.md)** - New UI design
- **[configurator-electron/STREAM-DECK-PLUS-PREVIEW.md](configurator-electron/STREAM-DECK-PLUS-PREVIEW.md)** - Preview component guide

## 🤝 Contributing

Contributions are warmly welcomed! This project thrives on community input and I'd love your help making it better. Here are some areas where contributions would be especially valuable:

### 🎯 High-Priority Contributions

**📜 New Example Scripts**
- Share your favorite automation scripts
- Add scripts for specific applications or workflows
- Expand the developer tools collection
- Create scripts for creative workflows (audio, video, graphics)

**🎨 Better Icon Usage**
- Improve icon selection and organization
- Create themed icon sets
- Better default icons for common actions
- Icon recommendations for specific use cases

**🔧 System Integration**
- Improve the auto-start mechanism
- Better desktop environment integration
- More robust daemon management
- System tray integration

**🐧 Multi-Distro Support**
- **Arch Linux support** - Package for AUR, test compatibility
- **Fedora/RHEL** - Adapt scripts for RPM-based systems
- **Other distros** - Ensure compatibility across the Linux ecosystem
- Testing and validation on different distributions

### 💡 Other Welcome Contributions

- Bug fixes and stability improvements
- Performance optimizations
- Documentation updates and clarifications
- UI/UX improvements for the configuration tool
- Feature suggestions and enhancements

### 📝 How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Test your changes (especially if adding distro-specific code)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

**Note:** This project currently works well on Ubuntu/Linux but hasn't been extensively tested on other distributions. If you use Arch, Fedora, or another distro and can help test and adapt the scripts, your contribution would be invaluable!

## 💖 Support This Project

If you find this project useful, please consider supporting its development:

- ⭐ **Star this repository** on GitHub
- 🐛 **Report bugs** and suggest features via Issues
- 🔀 **Contribute** code or example scripts
- ☕ **Buy me a coffee** [Donation Link Here]
- 💬 **Share** with others who might find it useful

Your support helps keep this project maintained and improved!

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the Elgato Stream Deck Plus
- Uses the excellent [python-elgato-streamdeck](https://github.com/abcminiuser/python-elgato-streamdeck) library
- Inspired by the need for simple, script-based automation

## 📧 Contact

- Issues: [GitHub Issues](https://github.com/Turtlebytes-LLC/StreamDeckPro/issues)
- Discussions: [GitHub Discussions](https://github.com/Turtlebytes-LLC/StreamDeckPro/discussions)

---

**Made with ❤️ for automation enthusiasts**
