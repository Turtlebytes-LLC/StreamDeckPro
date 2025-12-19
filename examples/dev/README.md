# Intelligent Macro System - Advanced Example

This directory contains the complete implementation of the intelligent macro recording system for Dial 1.

## Overview

This is the most advanced example in the entire project - a full-featured macro recorder with intelligent reverse playback, step-through control, and real-time keyboard monitoring.

## Files

### `dial-1-press.sh` - Recording & Playback Engine
The heart of the system. Handles three states:
- **Idle → Recording**: Press once to start monitoring keyboard with xinput
- **Recording → Recorded**: Press again to stop and save the macro
- **Recorded → Playback**: Press to replay the entire macro sequence

Features:
- Real-time keyboard monitoring using `xinput test`
- Intelligent keysym detection supporting all keyboard layouts
- Modifier tracking (Ctrl, Shift, Alt, Super)
- Proper keydown/keyup sequences for modifier combinations
- Arrow keys, navigation keys, and special characters all supported
- Debug logging for troubleshooting

### `dial-1-cw.sh` - Step Forward
Turn dial clockwise to step through the macro one command at a time.

Features:
- Executes individual xdotool commands from the macro
- Shows current position (e.g., "Step 5/13")
- 3-second timeout auto-resets position
- Prevents execution at the end boundary
- Updates a single notification (no spam!)

### `dial-1-ccw.sh` - Intelligent Reverse Playback
Turn dial counter-clockwise to undo commands intelligently.

This is what makes the system special - instead of blindly using Ctrl+Z, it analyzes each command and reverses it appropriately:

**Smart Reversals:**
- Regular keys (letters, numbers) → BackSpace
- Left arrow → Right arrow
- Right arrow → Left arrow
- Up arrow → Down arrow
- Down arrow → Up arrow
- Home → End
- End → Home
- Enter → BackSpace (deletes newline)
- Space/Tab → BackSpace
- Modifier combos (Ctrl+C, etc.) → Ctrl+Z

Features:
- Intelligent per-command reversal
- Shows current position as you step backward
- 3-second timeout auto-resets position
- Prevents execution at the start boundary

### `dial-1-longpress.sh` - Clear Macro
Hold dial for 0.5+ seconds to clear the macro and reset to idle state.

Features:
- Removes all temporary files
- Resets state to "idle"
- Confirmation notification

## How It Works

### Recording Phase
1. User presses dial → state changes to "recording"
2. Script detects keyboard device (prefers Corsair, falls back to AT Translated)
3. Starts background process running `xinput test` on keyboard
4. Monitors all key press/release events in real-time
5. Tracks held modifiers (Ctrl, Shift, Alt, Super) separately
6. When regular key pressed with modifiers → generates proper xdotool sequence
7. Writes commands to `/tmp/streamdeck-dial1-macro.sh`
8. User presses dial again → stops recording, kills background process

### Playback Phase
1. User presses dial → executes the generated macro script
2. All xdotool commands run in sequence with 50ms delays

### Step-Through Phase
1. User turns dial → CW or CCW script runs
2. Reads current position from `/tmp/streamdeck-dial1-position`
3. Checks if position file is >3 seconds old → resets if so
4. Executes/reverses single command
5. Updates position file (triggers filesystem modification time)
6. Shows notification with current position

## Technical Details

### Dependencies
- `xinput` - X11 input device monitoring
- `xdotool` - X11 keyboard automation
- `xmodmap` - Keyboard mapping queries
- `notify-send` - Desktop notifications

### Temporary Files
- `/tmp/streamdeck-dial1-state` - Current state (idle/recording/recorded)
- `/tmp/streamdeck-dial1-macro.sh` - Generated executable macro script
- `/tmp/streamdeck-dial1-events.txt` - Human-readable event log
- `/tmp/streamdeck-dial1-position` - Current playback position (0-N)
- `/tmp/streamdeck-dial1-recording-pid` - PID of recording process
- `/tmp/streamdeck-dial1-debug.log` - Debug output

### Keyboard Detection Logic
1. Look for "CORSAIR" slave keyboard (gaming keyboard)
2. Fall back to "AT Translated" (standard keyboard)
3. Fall back to any slave keyboard

### Keysym Mapping
The script handles xmodmap output columns correctly:
```bash
# Try column 4 first (normal key)
keysym=$(xmodmap -pke | grep "keycode *$keycode " | awk '{print $4}')

# Fall back to column 6 if empty (alternate mapping)
if [ -z "$keysym" ] || [ "$keysym" = "NoSymbol" ]; then
    keysym=$(xmodmap -pke | grep "keycode *$keycode " | awk '{print $6}')
fi
```

This ensures arrow keys, navigation keys, and special keys are captured properly.

### Notification System
Uses the `synchronous` hint to update a single notification:
```bash
notify-send "Macro Step ▶" "$EVENT ($POSITION/$TOTAL)" -t 500 \
  --hint=string:synchronous:macro-step
```

## Use Cases

### Code Refactoring
Record: Select variable name → Ctrl+C → Ctrl+H → Ctrl+V → type new name → Enter
Replay: Instantly rename all occurrences

### Repetitive Data Entry
Record: Fill out form fields with Tab navigation
Replay: Auto-fill multiple forms

### Documentation
Record: Type boilerplate → format → add code block
Replay: Generate consistent documentation sections

### Testing
Record: Open app → navigate to feature → test scenario
Replay: Automated test execution

## Customization Ideas

- Add mouse click recording
- Save multiple named macros
- Macro chaining (run macro A then B)
- Conditional logic (if/then)
- Loop support (repeat N times)
- Macro library with import/export

## Debugging

Enable debug logging by checking `/tmp/streamdeck-dial1-debug.log`:
```bash
tail -f /tmp/streamdeck-dial1-debug.log
```

Shows:
- State transitions
- Keyboard device detection
- Key press/release events
- Keysym lookups
- Modifier tracking
- Command generation

## Credits

Built with love for productivity enthusiasts who refuse to do repetitive tasks manually!
