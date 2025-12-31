#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_FILE="volume-status-listener.service"
SYSTEMD_DIR="$HOME/.config/systemd/user"

echo "🔊 Stream Deck Volume Status Listener Setup"
echo "============================================"
echo ""
echo "This will install a real-time listener that displays current volume"
echo "on touchscreen zone 1 with a visual bar indicator."
echo ""
echo "The listener will:"
echo "  - Monitor PulseAudio/PipeWire volume changes in real-time"
echo "  - Display a colored volume bar (green/yellow/red based on level)"
echo "  - Show MUTED status when audio is muted"
echo "  - Start automatically with your system"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

mkdir -p "$SYSTEMD_DIR"
mkdir -p "$HOME/streamdeck-actions/touchscreen"

echo "Installing service file..."
sed "s|%h|$HOME|g" "$SCRIPT_DIR/$SERVICE_FILE" > "$SYSTEMD_DIR/$SERVICE_FILE"

echo "Reloading systemd..."
systemctl --user daemon-reload

echo "Enabling and starting volume status listener..."
systemctl --user enable volume-status-listener.service
systemctl --user start volume-status-listener.service

if systemctl --user is-active --quiet volume-status-listener.service; then
    echo ""
    echo "Volume status listener is running!"
    echo ""
    echo "Touchscreen zone 1 now shows your system volume."
    echo "The zone still responds to tap/swipe gestures."
    echo ""
    echo "Useful commands:"
    echo "  - Check status: systemctl --user status volume-status-listener"
    echo "  - View logs: journalctl --user -u volume-status-listener -f"
    echo "  - Restart: systemctl --user restart volume-status-listener"
    echo "  - Stop: systemctl --user stop volume-status-listener"
    echo "  - Disable: systemctl --user disable volume-status-listener"
else
    echo ""
    echo "Service installed but not running. Check logs with:"
    echo "  journalctl --user -u volume-status-listener -n 50"
fi

echo ""
