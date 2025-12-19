#!/bin/bash
# Setup script for Stream Deck Mute Status Listener
# This creates a real-time event listener for instant mute status updates

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_FILE="mute-status-listener.service"
SYSTEMD_DIR="$HOME/.config/systemd/user"

echo "🎤 Stream Deck Mute Status Listener Setup"
echo "=========================================="
echo ""
echo "This will install a real-time listener that updates your mute button instantly"
echo "when you mute/unmute (no more 5-second delay!)."
echo ""
echo "The listener will:"
echo "  • Monitor PulseAudio/PipeWire events in real-time"
echo "  • Update your Stream Deck mute button immediately"
echo "  • Start automatically with your system"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled"
    exit 0
fi

# Create systemd user directory if it doesn't exist
mkdir -p "$SYSTEMD_DIR"

# Copy service file
echo "📋 Installing service file..."
cp "$SCRIPT_DIR/$SERVICE_FILE" "$SYSTEMD_DIR/"

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl --user daemon-reload

# Enable and start the service
echo "🚀 Enabling and starting mute status listener..."
systemctl --user enable mute-status-listener.service
systemctl --user start mute-status-listener.service

# Check status
if systemctl --user is-active --quiet mute-status-listener.service; then
    echo "✅ Mute status listener is running!"
    echo ""
    echo "Your Stream Deck mute button will now update instantly!"
    echo ""
    echo "Useful commands:"
    echo "  • Check status: systemctl --user status mute-status-listener"
    echo "  • View logs: journalctl --user -u mute-status-listener -f"
    echo "  • Restart: systemctl --user restart mute-status-listener"
    echo "  • Stop: systemctl --user stop mute-status-listener"
    echo "  • Disable: systemctl --user disable mute-status-listener"
else
    echo "⚠️  Service installed but not running. Check logs with:"
    echo "  journalctl --user -u mute-status-listener -n 50"
fi

echo ""
