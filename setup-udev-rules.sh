#!/bin/bash
# Setup udev rules for Stream Deck USB device access
# This grants permission to access Stream Deck devices without root

set -e

RULES_FILE="/etc/udev/rules.d/70-streamdeck.rules"

echo "=========================================="
echo "Stream Deck USB Permissions Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠ Warning: Running as root. This is fine, but the user to add to plugdev group should be specified."
    if [ -z "$SUDO_USER" ]; then
        echo "Error: Could not detect original user. Please run with: sudo ./setup-udev-rules.sh"
        exit 1
    fi
    TARGET_USER="$SUDO_USER"
else
    echo "This script needs sudo privileges to create udev rules."
    echo "You will be prompted for your password."
    echo ""
    TARGET_USER="$USER"

    # Re-execute with sudo if not root
    exec sudo bash "$0" "$@"
fi

echo "Target user: $TARGET_USER"
echo ""

# Ensure plugdev group exists
if ! getent group plugdev > /dev/null 2>&1; then
    echo "Creating plugdev group..."
    groupadd plugdev
    echo "✓ Created plugdev group"
else
    echo "✓ plugdev group already exists"
fi

# Add user to plugdev group
if id -nG "$TARGET_USER" | grep -qw plugdev; then
    echo "✓ User $TARGET_USER is already in plugdev group"
else
    echo "Adding $TARGET_USER to plugdev group..."
    usermod -a -G plugdev "$TARGET_USER"
    echo "✓ Added $TARGET_USER to plugdev group"
    echo "⚠ Note: You may need to log out and log back in for group membership to take effect"
fi

echo ""
echo "Creating udev rules file: $RULES_FILE"

# Create udev rules
cat > "$RULES_FILE" << 'EOF'
# Elgato Stream Deck devices
# This allows all users in the 'plugdev' group to access Stream Deck devices
# Vendor ID: 0fd9 (Elgato)

# Stream Deck Mini (Product ID: 0063)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0063", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0063", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Stream Deck Original (Product ID: 0060)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0060", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0060", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Stream Deck MK.2 (Product ID: 006d)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Stream Deck XL (Product ID: 006c)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006c", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006c", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Stream Deck Plus (Product ID: 0084)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Stream Deck Pedal (Product ID: 0086)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Stream Deck Neo (Product ID: 009a)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="009a", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="009a", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Catch-all for any Elgato Stream Deck device (current and future models)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev", TAG+="uaccess"
EOF

echo "✓ Created udev rules file"
echo ""

# Reload udev rules
echo "Reloading udev rules..."
udevadm control --reload-rules
echo "✓ Reloaded udev rules"
echo ""

# Trigger udev to apply rules to existing devices
echo "Applying rules to currently connected devices..."
udevadm trigger
sleep 1
echo "✓ Triggered udev"
echo ""

# Check if any Stream Deck devices are connected
echo "Checking for Stream Deck devices..."
if lsusb | grep -q "0fd9"; then
    echo "✓ Found Stream Deck device(s):"
    lsusb | grep "0fd9"
    echo ""
    echo "Applying permissions to hidraw devices..."
    # Apply permissions immediately to any existing hidraw devices
    chmod 666 /dev/hidraw* 2>/dev/null || true
    echo "✓ Permissions applied"
else
    echo "• No Stream Deck devices currently connected"
    echo "  Permissions will be applied automatically when you plug in your device"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "What was done:"
echo "  ✓ Created udev rules for all Stream Deck models"
echo "  ✓ Added $TARGET_USER to plugdev group"
echo "  ✓ Reloaded udev rules"
echo "  ✓ Applied permissions to connected devices"
echo ""
echo "Next steps:"
if ! id -nG "$TARGET_USER" | grep -qw plugdev; then
    echo "  1. Log out and log back in (for group membership to take effect)"
    echo "  2. Plug in your Stream Deck (or unplug and replug if already connected)"
    echo "  3. Run: ./start"
else
    echo "  1. Unplug and replug your Stream Deck (if connected)"
    echo "  2. Run: ./start"
fi
echo ""
echo "To verify permissions:"
echo "  ls -l /dev/hidraw*"
echo "  lsusb | grep 0fd9"
echo ""
