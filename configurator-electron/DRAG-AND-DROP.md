# Drag & Drop Application Configuration 🎯

## Revolutionary Feature!

Drop applications directly onto your Stream Deck and they auto-configure with icons, labels, and launch scripts!

## How It Works

### 1. **Drag from File Manager**
   - Open your file manager (Nautilus, Dolphin, Thunar, etc.)
   - Navigate to `/usr/share/applications/` (all installed apps)
   - Drag any `.desktop` file

### 2. **Hover Shows Dropzones**
   When you drag over a button/dial/touch zone, smart dropzones appear:
   
   **Buttons**: `Press` | `Long`
   **Dials**: `CW` | `CCW` | `Press` | `Long`
   **Touch Zones**: `Tap` | `Long` | `↑` | `↓` | `←` | `→`

### 3. **Drop to Auto-Configure**
   - Drop on main area → Configures "Press/Tap" action
   - Drop on specific zone → Configures that action
   - **Automatically**:
     - ✅ Extracts app icon → Sets as button image
     - ✅ Extracts app name → Sets as label
     - ✅ Creates launch script → Assigns to action

## Example Workflows

### Quick Setup: Firefox on Button 1
1. Open file manager
2. Go to `/usr/share/applications/`
3. Drag `firefox.desktop` 
4. Drop on Button 1
5. **Done!** Button now has Firefox icon, label, and launches Firefox on press

### Advanced: Multiple Actions for Chrome
1. Drag `google-chrome.desktop`
2. Hover over Button 2 → Dropzones appear
3. Drop on `Press` → Opens Chrome normally
4. Drag again, drop on `Long` → Opens Chrome incognito (edit script after)

### Dial Example: Volume Control Apps
1. Drag `pavucontrol.desktop` to Dial 1 `Press` → Opens volume mixer
2. Drag `spotify.desktop` to Dial 1 `Long` → Opens Spotify

## Supported File Types

### ✅ Linux Desktop Files (.desktop)
**Best support!** Auto-extracts:
- Application name
- Icon path
- Launch command

### ✅ Windows Executables (.exe)
Auto-creates Wine launcher

### ✅ Any Executable
Creates generic launch script

## Technical Details

### What Gets Created

When you drop `firefox.desktop` on Button 3:
- `buttons/button-3.sh` - Launch script
- `buttons/button-3.png` - Icon (if found)
- `buttons/button-3.txt` - Label ("Firefox")

### Desktop File Parsing
```
[Desktop Entry]
Name=Firefox          → Label
Icon=firefox          → Searches icon dirs
Exec=/usr/bin/firefox → Launch command
```

### Icon Search Locations
```
/usr/share/icons/hicolor/128x128/apps/
/usr/share/icons/hicolor/256x256/apps/
/usr/share/pixmaps/
~/.local/share/icons/
```

## Visual Feedback

### States
1. **Normal** - Regular button appearance
2. **Drag Hover** - Dropzones appear above button
3. **Drag Over** - Green glow, ready to drop
4. **Drop Active** - Zone pulses green
5. **Configured** - Shows icon and label

### Styling
- Dropzones: Blue pills with white text
- Active zone: Green pulse animation
- Drag over: Green border glow

## Tips & Tricks

### Find All Applications
```bash
ls /usr/share/applications/
```

### Test Without Dragging
You can still use the Browse/Icons buttons - drag & drop is just faster!

### Edit After Drop
Auto-configuration is a starting point:
1. Drop to quick-configure
2. Click button to open panel
3. Edit script/icon/label as needed

### Multiple Apps Per Button
- **Press**: Main app
- **Long Press**: Related app or same app with flags

Example:
- Press: `code` (VS Code)
- Long: `code --new-window` (New VS Code window)

## Keyboard Modifiers (Future)

Could add:
- Hold **Shift** while dropping → Configure as Long Press
- Hold **Ctrl** while dropping → Just set icon (no script)
- Hold **Alt** while dropping → Just set label

## Browser Integration (Future)

Could support:
- Drag from Chrome bookmarks
- Drag from Firefox bookmarks  
- Auto-create website launchers

## Troubleshooting

### Icon Not Showing?
- Some apps have icon names, not paths
- Icon search tries common directories
- You can manually set icon after drop

### Script Not Working?
- Check script permissions (should be executable)
- Edit script to add/remove arguments
- Some apps need environment variables

### Can't Find App?
```bash
find /usr/share/applications -name "*firefox*"
```

## Next Steps

Try it out:
1. `./configure` - Open configurator
2. Open file manager to `/usr/share/applications/`
3. Drag and drop! 🎉

This feature makes configuring your Stream Deck **10x faster**!
