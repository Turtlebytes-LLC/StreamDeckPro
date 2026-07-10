#!/bin/bash
# Setup script to add status updater to crontab

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRON_LINE="* * * * * for i in {0..55..5}; do (sleep \$i; $SCRIPT_DIR/utils/update-status.sh) & done"

echo "🎛️  Stream Deck Status Updater Setup"
echo "===================================="
echo ""
echo "This will add a cron job that updates your Stream Deck button statuses every 5 seconds."
echo ""
echo "The following line will be added to your crontab:"
echo "$CRON_LINE"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if the cron job already exists
    if crontab -l 2>/dev/null | grep -q "update-status.sh"; then
        echo "⚠️  Status updater already in crontab. Skipping..."
    else
        # Add to crontab
        (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
        echo "✅ Status updater added to crontab!"
    fi

    # Run it once to initialize
    "$SCRIPT_DIR/utils/update-status.sh"
    echo "✅ Initial status updated"
    echo ""
    echo "Your Stream Deck buttons will now show live status updates!"
else
    echo "❌ Setup cancelled"
    echo ""
    echo "To manually add it later, run:"
    echo "  crontab -e"
    echo "Then add this line:"
    echo "  $CRON_LINE"
fi

echo ""
