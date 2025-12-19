# Stream Deck Plus - Complete Gesture Guide

## ALL SUPPORTED GESTURES

Your Stream Deck Plus now supports **EVERY possible gesture**!

### Buttons (8 total)
- **Press**: `button-N.sh`

### Dials (4 total)
Each dial supports 4 actions:
- **Rotate Clockwise**: `dial-N-cw.sh`
- **Rotate Counter-Clockwise**: `dial-N-ccw.sh`
- **Press** (quick): `dial-N-press.sh`
- **Long Press** (hold 0.5s+): `dial-N-longpress.sh`

### Touchscreen (4 zones)
Each zone (1-4) supports:
- **Tap**: `touch-N.sh`
- **Long Press**: `touch-N-longpress.sh`
- **Swipe Up**: `touch-N-swipe-up.sh`
- **Swipe Down**: `touch-N-swipe-down.sh`
- **Swipe Left**: `touch-N-swipe-left.sh`
- **Swipe Right**: `touch-N-swipe-right.sh`

Plus screen-wide gestures:
- **Long Swipe Left** (across screen): `longswipe-left.sh`
- **Long Swipe Right** (across screen): `longswipe-right.sh`

## Total Possible Actions

- Buttons: 8 actions
- Dials: 4 × 4 = 16 actions
- Touchscreen zones: 4 × 6 = 24 actions
- Long swipes: 2 actions

**TOTAL: 50 customizable actions!**

## Logging

Every single action is logged to: `~/streamdeck-actions/daemon.log`

Watch live:
```bash
tail -f ~/streamdeck-actions/daemon.log
```

Log includes:
- Which button/dial/zone was triggered
- What gesture was performed
- Which script was executed
- Any errors or warnings

## Examples

See 42 ready-to-use example scripts:
```bash
cat ~/streamdeck-actions/examples/README.txt
ls ~/streamdeck-actions/examples/
```

Copy any example to use it:
```bash
cp examples/volume-up.sh dials/dial-1-cw.sh
```

## Quick Setup Examples

### Volume Control (Dial 1)
```bash
cp examples/volume-up.sh dials/dial-1-cw.sh
cp examples/volume-down.sh dials/dial-1-ccw.sh
cp examples/volume-mute.sh dials/dial-1-press.sh
```

### Workspace Switching (Touchscreen Swipes)
```bash
cp examples/workspace-next.sh touchscreen/touch-1-swipe-right.sh
cp examples/workspace-prev.sh touchscreen/touch-1-swipe-left.sh
cp examples/show-desktop.sh touchscreen/touch-1-longpress.sh
```

### Window Management (Touchscreen Zones)
```bash
cp examples/window-maximize.sh touchscreen/touch-1-swipe-up.sh
cp examples/window-minimize.sh touchscreen/touch-1-swipe-down.sh
cp examples/window-left-half.sh touchscreen/touch-2-swipe-left.sh
cp examples/window-right-half.sh touchscreen/touch-2-swipe-right.sh
```

### Screenshots (Buttons)
```bash
cp examples/screenshot-full.sh buttons/button-5.sh
cp examples/screenshot-area.sh buttons/button-6.sh
cp examples/screenshot-window.sh buttons/button-7.sh
```

## Testing Gestures

All example gesture scripts (in the actual actions directories) show notifications, so you can test each gesture:

- Dial 1 long press → Shows "Dial 1 - Long Press!" notification
- Touch zone 1 swipe up → Shows "Zone 1 - Swipe Up!" notification
- Long swipe right → Shows "LONG SWIPE RIGHT!" notification

Try all gestures and watch the notifications + log file!
