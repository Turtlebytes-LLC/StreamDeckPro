#!/bin/bash
# Reload systemd configuration and start the Stream Deck daemon
# Use this after moving the project or updating autostart scripts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Stream Deck - Reload and Start"
echo "=========================================="
echo ""
echo "Project directory: $SCRIPT_DIR"
echo ""

# Stop any running instances
echo "Stopping any running Stream Deck processes..."
pkill -f streamdeck-daemon.py 2>/dev/null && echo "✓ Stopped running daemon" || echo "• No daemon was running"
systemctl --user stop streamdeck.service 2>/dev/null || true
sleep 1

# Reload systemd configuration
echo ""
echo "Reloading systemd user configuration..."
systemctl --user daemon-reload
echo "✓ Systemd reloaded"

# Check if service is enabled
echo ""
echo "Checking autostart configuration..."
if systemctl --user is-enabled streamdeck.service &>/dev/null; then
    echo "✓ Systemd service is enabled (will auto-start on login)"
else
    echo "• Systemd service is not enabled"
    echo "  To enable autostart: ./setup-autostart.sh"
fi

if [ -f "$HOME/.config/autostart/streamdeck.desktop" ]; then
    echo "✓ Desktop autostart entry exists"
else
    echo "• Desktop autostart entry not found"
    echo "  To enable autostart: ./setup-autostart.sh"
fi

# Start the daemon
echo ""
echo "Starting Stream Deck daemon..."
"$SCRIPT_DIR/start" &
DAEMON_PID=$!
sleep 2

# Check if it's running
if pgrep -f streamdeck-daemon.py > /dev/null; then
    echo "✓ Stream Deck daemon started successfully!"
    echo ""
    echo "Daemon is running. You can:"
    echo "  • Check status: pgrep -fa streamdeck"
    echo "  • View logs: tail -f $SCRIPT_DIR/daemon.log"
    echo "  • Stop daemon: pkill -f streamdeck-daemon.py"
    echo "  • Configure: $SCRIPT_DIR/configure"
else
    echo "⚠ Warning: Daemon may not have started properly"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if Stream Deck is connected: lsusb | grep 0fd9"
    echo "  2. Check USB permissions: ls -l /dev/hidraw*"
    echo "  3. Run USB setup: $SCRIPT_DIR/setup-udev-rules.sh"
    echo "  4. Check logs: cat $SCRIPT_DIR/daemon.log"
    exit 1
fi

# Show recent log
echo ""
echo "Recent log output:"
echo "---"
tail -20 "$SCRIPT_DIR/daemon.log" 2>/dev/null || echo "No log file yet"
echo "---"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Your Stream Deck is ready to use."
echo ""
echo "New features in this version:"
echo "  ✓ Automatic reconnection on KVM switch"
echo "  ✓ Better error handling"
echo "  ✓ Optimized performance"
echo ""
echo "Try switching your KVM and switching back - it will reconnect automatically!"
echo ""
