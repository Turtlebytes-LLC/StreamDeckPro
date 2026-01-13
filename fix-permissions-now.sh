#!/bin/bash
# Quick fix for USB permissions - run this right now!

echo "========================================"
echo "Stream Deck - USB Permissions Quick Fix"
echo "========================================"
echo ""

# Check if Stream Deck is connected
if ! lsusb | grep -q "0fd9"; then
    echo "⚠ Warning: Stream Deck not detected via lsusb"
    echo "Make sure your Stream Deck is plugged in!"
    echo ""
fi

# Option 1: Quick temporary fix
echo "Applying temporary permissions fix..."
echo "(This will work until you reboot or replug the device)"
echo ""

if sudo chmod 666 /dev/hidraw* 2>/dev/null; then
    echo "✓ Temporary permissions applied to all hidraw devices"
    echo ""
    echo "Your Stream Deck should work now!"
    echo "Try running: ./start"
    echo ""
else
    echo "❌ Failed to set permissions. Make sure you have sudo access."
    echo ""
fi

# Option 2: Permanent fix
echo "=========================================="
echo ""
echo "For a PERMANENT fix, run:"
echo "  ./setup-udev-rules.sh"
echo ""
echo "This will:"
echo "  • Install udev rules for automatic permissions"
echo "  • Add your user to the plugdev group"
echo "  • Make permissions persist across reboots"
echo ""
echo "After running setup-udev-rules.sh:"
echo "  • Log out and log back in (for group membership)"
echo "  • Unplug and replug your Stream Deck"
echo "  • Permissions will be automatic forever!"
echo ""
echo "=========================================="
echo ""

# Check current permissions
echo "Current hidraw device permissions:"
ls -l /dev/hidraw* 2>/dev/null | head -10
echo ""

# Check if in plugdev group
if groups | grep -q plugdev; then
    echo "✓ You are in the plugdev group"
else
    echo "⚠ You are NOT in the plugdev group"
    echo "  Run ./setup-udev-rules.sh to fix this"
fi

echo ""
echo "To start the daemon now:"
echo "  ./start"
echo ""
