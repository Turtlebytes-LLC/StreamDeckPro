===============================================================================
            STREAM DECK - 50 READY-TO-USE EXAMPLE SCRIPTS
===============================================================================

Copy any script to your actions directory and make it executable!

Example:
  cp examples/volume-up.sh dials/dial-1-cw.sh
  cp examples/workspace-next.sh touchscreen/touch-1-swipe-right.sh


VOLUME & MEDIA CONTROL (8 scripts)
===================================
volume-up.sh              - Increase volume +5%
volume-down.sh            - Decrease volume -5%
volume-mute.sh            - Toggle mute
brightness-up.sh          - Increase brightness +10%
brightness-down.sh        - Decrease brightness -10%
media-play-pause.sh       - Play/pause media
media-next.sh             - Next track
media-previous.sh         - Previous track


WINDOW MANAGEMENT (9 scripts)
==============================
window-maximize.sh        - Maximize current window
window-minimize.sh        - Minimize current window
window-left-half.sh       - Snap window to left half
window-right-half.sh      - Snap window to right half
window-close.sh           - Close current window (Alt+F4)
workspace-next.sh         - Switch to next workspace
workspace-prev.sh         - Switch to previous workspace
show-desktop.sh           - Show desktop / minimize all
app-switcher.sh           - Open application switcher (Alt+Tab)


SCREENSHOTS (4 scripts)
=======================
screenshot-full.sh        - Full screen screenshot
screenshot-area.sh        - Screenshot selected area
screenshot-window.sh      - Screenshot current window
screenshot-clip.sh        - Screenshot to clipboard


FLAMESHOT SCREENSHOTS (8 scripts)
===================================
flameshot-gui.sh          - Interactive area selection with editing tools
flameshot-full.sh         - Full screen to ~/Pictures/Screenshots
flameshot-clipboard.sh    - Capture area and copy to clipboard
flameshot-full-clipboard.sh - Full screen to clipboard (instant)
flameshot-delay-3s.sh     - 3 second delay (useful for menus)
flameshot-screen.sh       - Capture specific screen (multi-monitor)
flameshot-pin.sh          - Capture and pin screenshot on screen
flameshot-save-custom.sh  - Save with timestamp filename


SYSTEM ACTIONS (5 scripts)
===========================
lock-screen.sh            - Lock the screen
logout.sh                 - Logout
suspend.sh                - Suspend system
open-terminal.sh          - Open terminal
open-file-manager.sh      - Open file manager (Nautilus)


APPLICATIONS (3 scripts)
=========================
open-browser.sh           - Open default browser
open-calculator.sh        - Open calculator
open-settings.sh          - Open system settings


KEYBOARD AUTOMATION (13 scripts)
=================================
type-email.sh             - Type your email (edit script first!)
type-password-manager.sh  - Open password manager (Super+P)
paste-clipboard.sh        - Paste (Ctrl+V)
copy-clipboard.sh         - Copy (Ctrl+C)
undo.sh                   - Undo (Ctrl+Z)
redo.sh                   - Redo (Ctrl+Shift+Z)
save-file.sh              - Save file (Ctrl+S)
find-text.sh              - Find/search (Ctrl+F)
new-tab.sh                - New browser tab (Ctrl+T)
close-tab.sh              - Close browser tab (Ctrl+W)
refresh-page.sh           - Refresh page (F5)
zoom-in.sh                - Zoom in (Ctrl++)
zoom-out.sh               - Zoom out (Ctrl+-)


USAGE EXAMPLES:
===============

Volume Control on Dial 1:
  cp examples/volume-up.sh dials/dial-1-cw.sh
  cp examples/volume-down.sh dials/dial-1-ccw.sh
  cp examples/volume-mute.sh dials/dial-1-press.sh

Workspace Switching on Touchscreen Swipes:
  cp examples/workspace-next.sh touchscreen/touch-1-swipe-right.sh
  cp examples/workspace-prev.sh touchscreen/touch-1-swipe-left.sh

Window Management on Buttons:
  cp examples/window-maximize.sh buttons/button-3.sh
  cp examples/window-close.sh buttons/button-4.sh

Screenshots on Touchscreen Zones:
  cp examples/screenshot-full.sh touchscreen/touch-1.sh
  cp examples/screenshot-area.sh touchscreen/touch-2.sh

Flameshot on Buttons (with editing tools):
  cp examples/flameshot-gui.sh buttons/button-5.sh
  cp examples/flameshot-clipboard.sh buttons/button-6.sh
  cp examples/flameshot-delay-3s.sh buttons/button-7.sh
  cp examples/flameshot-pin.sh buttons/button-8.sh


ALL SCRIPTS ARE READY TO USE!
Just copy, restart the daemon, and test!
===============================================================================
