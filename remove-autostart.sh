#!/bin/bash
# Remove Stream Deck auto-start on login
# This script removes both desktop entry and systemd service
#
# Called by: Configuration UI "Auto-Start" button
# Manual usage: ./remove-autostart.sh
#
# CUSTOMIZE THIS SCRIPT FOR YOUR SYSTEM:
# - Add cleanup for additional auto-start methods if you added them
# - Modify paths if you changed the auto-start locations

AUTOSTART_FILE="$HOME/.config/autostart/streamdeck.desktop"
SYSTEMD_SERVICE="$HOME/.config/systemd/user/streamdeck.service"

echo "=========================================="
echo "Stream Deck Auto-Start Removal"
echo "=========================================="
echo ""

# Stop and disable systemd service if running
if systemctl --user is-enabled streamdeck.service &>/dev/null; then
    echo "Stopping and disabling systemd service..."
    systemctl --user stop streamdeck.service
    systemctl --user disable streamdeck.service
    echo "✓ Systemd service disabled"
else
    echo "• Systemd service not enabled"
fi

# Remove systemd service file
if [ -f "$SYSTEMD_SERVICE" ]; then
    rm "$SYSTEMD_SERVICE"
    systemctl --user daemon-reload
    echo "✓ Removed systemd service file"
else
    echo "• Systemd service file not found"
fi

# Remove desktop autostart entry
if [ -f "$AUTOSTART_FILE" ]; then
    rm "$AUTOSTART_FILE"
    echo "✓ Removed desktop autostart entry"
else
    echo "• Desktop autostart entry not found"
fi

echo ""
echo "=========================================="
echo "Auto-start removed successfully!"
echo "=========================================="
echo ""
echo "The Stream Deck daemon will no longer start automatically on login."
echo ""
echo "To re-enable auto-start, run:"
echo "  $( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/setup-autostart.sh"
echo ""
