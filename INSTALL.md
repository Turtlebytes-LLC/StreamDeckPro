# Installation Guide

## Prerequisites

- **Elgato Stream Deck Plus** (required)
- **Linux** operating system (tested on Ubuntu 22.04+)
- **Python 3.8+**
- **pip3** (Python package manager)

## Quick Install

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/streamdeck-actions.git
cd streamdeck-actions

# 2. Install Python dependencies
# Try --user first (recommended):
pip3 install --user streamdeck

# If --user fails with "externally-managed-environment" error:
pip3 install --break-system-packages streamdeck

# 3. Install system dependencies (if not already installed)
sudo apt-get install xdotool

# 4. Make scripts executable
chmod +x start configure create-action streamdeck-daemon.py

# 5. Set up USB permissions for Stream Deck
sudo tee /etc/udev/rules.d/99-streamdeck.rules << EOF
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0080", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0063", MODE="0666"
EOF

# 6. Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# 7. Unplug and replug your Stream Deck

# 10. Start the daemon
./start
```

## Understanding pip Installation Methods

**Modern Linux distributions** (Ubuntu 23.04+, Debian 12+) protect system Python to prevent conflicts between system packages and pip packages. This causes "externally-managed-environment" errors.

### Method 1: --user (Preferred, if it works)

Installs to your home directory (`~/.local/lib/python3.x/site-packages`):

```bash
pip3 install --user streamdeck
```

**Benefits:**
- No root/sudo required
- Won't break system packages
- Per-user installations
- Easy to uninstall

### Method 2: --break-system-packages (If --user fails)

Some distributions block even `--user` installations. Override with:

```bash
pip3 install --break-system-packages streamdeck
```

**Why it's safe:**
- `streamdeck` is a pure Python library
- It doesn't conflict with system packages
- Only overrides pip's protection, not actual system files
- Won't break your OS

### Method 3: Virtual Environment (For Development)

If you're developing or prefer isolation:

```bash
python3 -m venv ~/streamdeck-venv
source ~/streamdeck-venv/bin/activate
pip install streamdeck

# Run from venv
~/streamdeck-venv/bin/python3 streamdeck-daemon.py
```

## Verify Installation

```bash
# Check if daemon is running
tail -f daemon.log

# Launch configuration UI
./configure
```

You should see the daemon detecting your Stream Deck and the configuration UI should open.

## Troubleshooting

### "No Stream Deck found"

1. Make sure your Stream Deck is plugged in
2. Verify USB permissions are set correctly
3. Try unplugging and replugging the device
4. Check `lsusb` to see if the device is detected

### "Module 'streamdeck' not found"

```bash
pip3 install --user streamdeck
```

### Permission Denied Errors

```bash
# Make sure scripts are executable
chmod +x start configure create-action streamdeck-daemon.py

# Verify user is in correct groups (if needed)
sudo usermod -a -G plugdev $USER
# Log out and back in for group changes to take effect
```

### Daemon Won't Start

```bash
# Check for errors
./streamdeck-daemon.py

# Check Python version
python3 --version  # Should be 3.8 or higher
```

## Running at Startup (Optional)

**Recommended:** Use the one-click auto-start button in the configuration UI!

```bash
./configure
# Click "🚀 Auto-Start: OFF" button in the header
```

Or use the scripts manually:

```bash
# Enable auto-start
./setup-autostart.sh

# Disable auto-start
./remove-autostart.sh
```

Both methods create desktop autostart entries and systemd services for maximum compatibility.

### Manual Setup (Alternative)

If you prefer to set up auto-start manually:

#### Using systemd

Create a systemd service file:

```bash
mkdir -p ~/.config/systemd/user/

cat > ~/.config/systemd/user/streamdeck.service << EOF
[Unit]
Description=Stream Deck Daemon
After=graphical.target

[Service]
Type=simple
ExecStart=$HOME/streamdeck-actions/streamdeck-daemon.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Enable and start the service
systemctl --user enable streamdeck.service
systemctl --user start streamdeck.service

# Check status
systemctl --user status streamdeck.service
```

### Using Autostart (Desktop Environment)

Create an autostart entry:

```bash
mkdir -p ~/.config/autostart/

cat > ~/.config/autostart/streamdeck.desktop << EOF
[Desktop Entry]
Type=Application
Name=Stream Deck Daemon
Exec=$HOME/streamdeck-actions/start
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

## Uninstallation

```bash
# Stop the daemon
pkill -f streamdeck-daemon.py

# Remove systemd service (if installed)
systemctl --user stop streamdeck.service
systemctl --user disable streamdeck.service
rm ~/.config/systemd/user/streamdeck.service

# Remove autostart entry (if installed)
rm ~/.config/autostart/streamdeck.desktop

# Remove the project directory
rm -rf ~/streamdeck-actions

# Remove Python packages (optional)
pip3 uninstall streamdeck
```

## Next Steps

- Read the [Quick Start Guide](QUICK-START.txt)
- Check out [example scripts](examples/README.txt)
- Launch the configuration UI: `./configure`
- Browse the [documentation](README.md)

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review existing [GitHub Issues](https://github.com/YOUR_USERNAME/streamdeck-actions/issues)
3. Create a new issue with details about your problem
