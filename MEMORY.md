# Stream Deck Configuration Memory

This file contains the current configuration of this Stream Deck system to help recreate or modify button/dial/touch actions.

## System Overview

- **Device:** Elgato Stream Deck Plus
- **OS:** Linux (Ubuntu-based)
- **Chrome Profiles:** Multiple profiles can be configured (Default, Profile 1, Profile 2, etc.)
  - Find your profiles in `~/.config/google-chrome/`
  - Each profile directory contains a `Preferences` file with account info

## Example Configuration Patterns

### Buttons (8 total)

**Example: Open Chrome new tab in specific profile**
- Label: "Chrome Personal"
- Position: middle
- Command: `google-chrome --profile-directory="Default" --new-tab`

**Example: Open website in work profile**
- Label: "Work Site"
- Icon: Custom icon (120x120)
- Command: `google-chrome --profile-directory="Profile 2" "https://example.com"`

**Example: Open web app in default profile**
- Label: "ChatGPT"
- Icon: Custom image
- Command: `google-chrome --profile-directory="Default" https://chatgpt.com`

### Dials (4 total, each with 4 actions)

#### Dial 1: Media Controls
- **Press:** Play/Pause media
  - Command: `xdotool key XF86AudioPlay`
- **Long Press:** Toggle mute
  - Command: `xdotool key XF86AudioMute`

#### Dial 2: Volume Controls
- **Press:** Toggle mute/unmute
  - Command: `xdotool key XF86AudioMute`
- **Clockwise:** Raise volume
  - Command: `xdotool key XF86AudioRaiseVolume`
- **Counter-clockwise:** Lower volume
  - Command: `xdotool key XF86AudioLowerVolume`

### Touchscreen Zones (4 total, each with 6 gestures)

#### Touch Zone 1: Media Controls
- **Tap:** Play/Pause
  - Label: "Play/Pause"
  - Command: `xdotool key XF86AudioPlay`
- **Swipe Left:** Previous track
  - Command: `xdotool key XF86AudioPrev`
- **Swipe Right:** Next track
  - Command: `xdotool key XF86AudioNext`

**Example: Mute Status (Dynamic)**
- **Tap:** Toggle mute/unmute
  - Label: "Muted" or "Unmuted" (dynamic, updated by update-status.sh)
  - Command: `xdotool key XF86AudioMute` + triggers status update
  - Note: Status updater can run every 5 seconds via cron for live status

## Dynamic Status Updates

The system includes a status updater (`update-status.sh`) that:
- Checks system mute status every 5 seconds (via cron)
- Updates Touch Zone 2 label to show "Muted" or "Unmuted"
- Automatically runs when mute toggle buttons are pressed
- Uses `pactl` (PulseAudio/PipeWire) or `amixer` (ALSA) to detect status

**Setup:** Run `./setup-status-updater.sh` to enable automatic status updates

## Icon Sources

Icons are downloaded from Tabler Icons (MIT licensed) using:
```bash
./download-icons.sh <category>
```

Custom icons are converted using:
```bash
python3 convert-icon.py input.svg output.png [color]
```

## File Structure

```
buttons/
├── button-N.sh          # Script to execute
├── button-N.png         # Optional image (120x120)
├── button-N.txt         # Optional label text
├── button-N-position.txt # Optional: "top", "middle", "bottom"
└── button-N-fontsize.txt # Optional: font size (1-99)

dials/
├── dial-N-cw.sh         # Clockwise rotation
├── dial-N-ccw.sh        # Counter-clockwise rotation
├── dial-N-press.sh      # Quick press
└── dial-N-longpress.sh  # Long press (0.5s+)

touchscreen/
├── touch-N.sh           # Tap action
├── touch-N-longpress.sh # Long press
├── touch-N-swipe-up.sh
├── touch-N-swipe-down.sh
├── touch-N-swipe-left.sh
├── touch-N-swipe-right.sh
├── touch-N.png          # Optional image (200x100)
├── touch-N.txt          # Optional label
├── touch-N-position.txt # Optional: "top", "middle", "bottom"
└── touch-N-fontsize.txt # Optional: font size
```

## Common Patterns

### Opening Chrome with Specific Profile

First, find your Chrome profiles:
```bash
# List available profiles
ls ~/.config/google-chrome/

# Find which profile contains a specific email
grep -l "your.email@example.com" ~/.config/google-chrome/*/Preferences
```

Then use the profile directory name:
```bash
google-chrome --profile-directory="Profile 2" https://example.com
google-chrome --profile-directory="Default" --new-tab
```

### Media Keys (System Shortcuts)
```bash
xdotool key XF86AudioPlay        # Play/Pause
xdotool key XF86AudioNext        # Next track
xdotool key XF86AudioPrev        # Previous track
xdotool key XF86AudioMute        # Toggle mute
xdotool key XF86AudioRaiseVolume # Volume up
xdotool key XF86AudioLowerVolume # Volume down
```

### Text Positioning
Create `*-position.txt` with one of: `top`, `middle`, `bottom`

## Notes for AI Assistants

When asked to create new buttons/dials/touches:
1. Create executable .sh scripts with proper shebang (`#!/bin/bash`)
2. Add descriptive .txt labels when appropriate
3. Use xdotool for keyboard shortcuts and media controls
4. For Chrome profiles, check ~/.config/google-chrome/*/Preferences for email addresses
5. Use convert-icon.py for custom icons (SVG to PNG conversion)
6. Remember: buttons are 120x120, touch zones are 200x100
7. All user scripts are in .gitignore and won't be committed
