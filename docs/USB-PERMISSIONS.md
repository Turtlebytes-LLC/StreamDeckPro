# USB Permissions Setup for Stream Deck

## Problem

Stream Deck devices connect as USB HID devices that require proper permissions to access. Without proper permissions, you may see:
- "Permission denied" errors in the daemon log
- The daemon failing to connect to the device
- Needing to run the daemon as root (not recommended)

## Solution: udev Rules

udev rules allow your regular user account to access Stream Deck devices automatically when they're plugged in.

## Installation

### Quick Setup (Recommended)

Run the setup script:

```bash
./setup-udev-rules.sh
```

This will:
1. Create the udev rules file
2. Reload udev rules
3. Apply permissions to currently connected devices

### Manual Setup

If you prefer to set it up manually:

#### 1. Create the udev rules file

```bash
sudo nano /etc/udev/rules.d/70-streamdeck.rules
```

#### 2. Add the following content:

```
# Elgato Stream Deck devices
# This allows all users in the 'plugdev' group to access Stream Deck devices

# Stream Deck Mini
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0063", MODE="0666", GROUP="plugdev"

# Stream Deck Original
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0060", MODE="0666", GROUP="plugdev"

# Stream Deck MK.2
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", MODE="0666", GROUP="plugdev"

# Stream Deck XL
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006c", MODE="0666", GROUP="plugdev"

# Stream Deck Plus
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", MODE="0666", GROUP="plugdev"

# Stream Deck Pedal
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", MODE="0666", GROUP="plugdev"

# Stream Deck Neo
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="009a", MODE="0666", GROUP="plugdev"

# Alternative: Grant access via hidraw interface
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev"
```

#### 3. Ensure you're in the plugdev group

```bash
sudo usermod -a -G plugdev $USER
```

**Important**: You may need to log out and log back in for group membership to take effect.

#### 4. Reload udev rules

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

#### 5. Unplug and replug your Stream Deck

Or, to apply permissions to currently connected devices without unplugging:

```bash
sudo chmod 666 /dev/hidraw*
```

Note: The chmod command only applies to currently connected devices. The udev rules ensure permissions are set correctly automatically when devices are plugged in.

## Verification

Check if your Stream Deck is accessible:

```bash
# List USB devices and look for Elgato (0fd9)
lsusb | grep 0fd9

# Check hidraw permissions
ls -l /dev/hidraw*

# Test the daemon
./start
```

You should see output like:
```
Searching for Stream Deck devices...
Connected to: Stream Deck Plus
```

## Troubleshooting

### Still getting "Permission denied"?

1. Verify you're in the plugdev group:
   ```bash
   groups $USER
   ```
   You should see `plugdev` in the output.

2. If not, add yourself and log out/in:
   ```bash
   sudo usermod -a -G plugdev $USER
   ```

3. Check udev rules were loaded:
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

4. Verify the rules file exists:
   ```bash
   ls -l /etc/udev/rules.d/70-streamdeck.rules
   ```

### Temporary fix while troubleshooting

If you need immediate access:

```bash
sudo chmod 666 /dev/hidraw*
```

**Warning**: This is temporary and will reset on reboot or when devices are replugged. Use udev rules for a permanent solution.

## KVM Switch Considerations

The daemon now includes automatic reconnection support. When you switch your KVM:

1. The daemon detects the USB device disconnected
2. It attempts to reconnect every 2 seconds
3. When you switch back, it automatically reconnects
4. All displays are restored

**Important**: For KVM switching to work smoothly:
- Ensure udev rules are installed (so permissions are correct when device reconnects)
- The daemon should be running before you switch the KVM
- After switching back, allow 2-3 seconds for automatic reconnection

## Security Notes

**Mode 0666**: This grants read/write access to all users. This is generally safe for input devices like Stream Deck on single-user systems.

**Alternative (More Restrictive)**: If you prefer to restrict access only to your user:

```
MODE="0660", GROUP="plugdev"
```

This requires users to be in the `plugdev` group (which is standard for desktop Linux users).

## Distribution-Specific Notes

### Ubuntu/Debian
- The `plugdev` group exists by default
- Your user is typically already in this group
- Desktop users usually have automatic device access

### Arch Linux
- You may need to create the `plugdev` group:
  ```bash
  sudo groupadd plugdev
  sudo usermod -a -G plugdev $USER
  ```
- Or use `uucp` group instead (replace `plugdev` with `uucp` in rules)

### Fedora/RHEL
- Consider using `dialout` group instead of `plugdev`
- Or create `plugdev` group as shown above

## See Also

- [Python StreamDeck Library](https://github.com/abcminiuser/python-elgato-streamdeck)
- [Arch Wiki - udev](https://wiki.archlinux.org/title/Udev)
- [Elgato Stream Deck](https://www.elgato.com/stream-deck)
