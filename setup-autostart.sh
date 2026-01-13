#!/bin/bash
# Setup Stream Deck to auto-start on login
# This script works for Ubuntu and most Linux desktop environments
#
# Called by: Configuration UI "Auto-Start" button
# Manual usage: ./setup-autostart.sh
#
# CUSTOMIZE THIS SCRIPT FOR YOUR SYSTEM:
# - Change paths if you moved the streamdeck-actions directory
# - Modify the systemd service for custom environment variables
# - Add/remove auto-start methods as needed for your distro

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AUTOSTART_DIR="$HOME/.config/autostart"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"

echo "=========================================="
echo "Stream Deck Auto-Start Setup"
echo "=========================================="
echo ""

# Method 1: Desktop Entry (Works for most desktop environments)
echo "Setting up desktop autostart entry..."
mkdir -p "$AUTOSTART_DIR"

cat > "$AUTOSTART_DIR/streamdeck.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Stream Deck Daemon
Comment=Elgato Stream Deck automation daemon
Exec=$SCRIPT_DIR/start
Icon=input-gaming
Terminal=false
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
X-KDE-autostart-after=panel
Categories=Utility;
EOF

chmod +x "$AUTOSTART_DIR/streamdeck.desktop"
echo "✓ Created desktop autostart entry: $AUTOSTART_DIR/streamdeck.desktop"
echo ""

# Method 2: systemd user service (Optional, more robust)
echo "Setting up systemd user service (optional)..."
mkdir -p "$SYSTEMD_USER_DIR"

# Detect current display and session variables
CURRENT_DISPLAY="${DISPLAY:-:0}"
CURRENT_WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}"
CURRENT_XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
CURRENT_DBUS_SESSION="${DBUS_SESSION_BUS_ADDRESS:-}"
CURRENT_XDG_RUNTIME="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

cat > "$SYSTEMD_USER_DIR/streamdeck.service" << EOF
[Unit]
Description=Stream Deck Daemon
After=graphical-session.target
Wants=graphical-session.target

[Service]
Type=simple
ExecStart=$SCRIPT_DIR/streamdeck-daemon.py
Restart=on-failure
RestartSec=5
# Environment variables for desktop integration
Environment=DISPLAY=$CURRENT_DISPLAY
Environment=XAUTHORITY=$CURRENT_XAUTHORITY
Environment=XDG_RUNTIME_DIR=$CURRENT_XDG_RUNTIME
# Support for Wayland
$([ -n "$CURRENT_WAYLAND_DISPLAY" ] && echo "Environment=WAYLAND_DISPLAY=$CURRENT_WAYLAND_DISPLAY" || echo "# No Wayland display detected")
# DBus session for notifications and desktop integration
$([ -n "$CURRENT_DBUS_SESSION" ] && echo "Environment=DBUS_SESSION_BUS_ADDRESS=$CURRENT_DBUS_SESSION" || echo "# DBus will be auto-detected")

[Install]
WantedBy=default.target
EOF

echo "✓ Created systemd service: $SYSTEMD_USER_DIR/streamdeck.service"
echo ""
echo "Environment variables configured:"
echo "  DISPLAY: $CURRENT_DISPLAY"
[ -n "$CURRENT_WAYLAND_DISPLAY" ] && echo "  WAYLAND_DISPLAY: $CURRENT_WAYLAND_DISPLAY"
echo "  XDG_RUNTIME_DIR: $CURRENT_XDG_RUNTIME"
[ -n "$CURRENT_DBUS_SESSION" ] && echo "  DBUS_SESSION_BUS_ADDRESS: (detected)"
echo ""

# Enable systemd service
systemctl --user daemon-reload
systemctl --user enable streamdeck.service

echo "=========================================="
echo "Auto-start configured successfully!"
echo "=========================================="
echo ""
echo "Two methods have been configured:"
echo "  1. Desktop autostart entry (primary)"
echo "  2. systemd user service (backup, with proper environment)"
echo ""
echo "The Stream Deck daemon will now start automatically on login."
echo ""
echo "Features:"
echo "  ✓ Automatic reconnection on KVM switch or USB disconnect"
echo "  ✓ Proper environment variables for notifications and desktop integration"
echo "  ✓ Auto-restart on failure"
echo ""
echo "To verify systemd service:"
echo "  systemctl --user status streamdeck.service"
echo ""
echo "To start immediately:"
echo "  systemctl --user start streamdeck.service"
echo ""
echo "To disable auto-start, run:"
echo "  $SCRIPT_DIR/remove-autostart.sh"
echo ""
