# USB Permission Error - How to Fix

## What Happened

You got this error when trying to start the Stream Deck daemon:
```
StreamDeck.Transport.Transport.TransportError: Failed to write feature report (-1)
```

This means the daemon found your Stream Deck but couldn't write to it due to USB permissions.

## Quick Fix (Right Now!)

Run this command to fix it immediately:

```bash
cd /home/zach2825/Nextcloud/Projects/Work/streamdeck-actions
./fix-permissions-now.sh
```

This applies temporary permissions that will work until you reboot or replug the device.

**Then start the daemon:**
```bash
./start
```

## Permanent Fix (Recommended)

For a permanent solution that survives reboots and device replug:

```bash
cd /home/zach2825/Nextcloud/Projects/Work/streamdeck-actions
./setup-udev-rules.sh
```

This will:
1. Create udev rules for automatic USB permissions
2. Add you to the `plugdev` group
3. Apply permissions to currently connected devices

**After running setup-udev-rules.sh:**
- Log out and log back in (for group membership to take effect)
- Or run: `newgrp plugdev` to activate the group immediately
- Unplug and replug your Stream Deck (or just restart)

Then you'll never have permission issues again!

## What Was Changed

The daemon now handles USB permission errors gracefully:

**Before**: Would crash with a confusing error
**After**: Shows clear instructions on how to fix the issue

Updated files:
- `streamdeck-daemon.py` - Added error handling for device reset
- `start` - Added USB permission check before starting
- `fix-permissions-now.sh` - Quick fix script (NEW)
- `setup-udev-rules.sh` - Permanent fix script (already existed)

## Testing

After fixing permissions, test that it works:

```bash
# Start the daemon
./start

# In another terminal, watch the log
tail -f daemon.log

# You should see:
# "Searching for Stream Deck devices..."
# "Connected to: Stream Deck Plus"
# "Stream Deck Daemon Running"
```

## Why This Happens

Linux restricts access to USB HID devices for security. By default:
- Only root can write to `/dev/hidraw*` devices
- Regular users need to be in the right group (plugdev, dialout, etc.)
- udev rules grant permissions automatically when devices are plugged in

Without proper setup, you can see the device (lsusb shows it) but can't control it.

## Troubleshooting

### Still getting errors after fix-permissions-now.sh?

1. Make sure the script ran successfully (no errors)
2. Check permissions: `ls -l /dev/hidraw*`
3. Should show `crw-rw-rw-` (all users can read/write)
4. Try the permanent fix instead: `./setup-udev-rules.sh`

### Still getting errors after setup-udev-rules.sh?

1. Did you log out and back in? (Required for group membership)
2. Check if you're in plugdev group: `groups`
3. Check udev rules exist: `ls /etc/udev/rules.d/70-streamdeck.rules`
4. Unplug and replug your Stream Deck
5. Check device permissions: `ls -l /dev/hidraw*`

### How to verify everything is set up correctly:

```bash
# 1. Stream Deck is connected
lsusb | grep 0fd9
# Should show: Bus XXX Device XXX: ID 0fd9:XXXX Elgato...

# 2. You're in the right group
groups
# Should include: plugdev

# 3. Device has correct permissions
ls -l /dev/hidraw*
# Should show: crw-rw----+ 1 root plugdev ...
# Or: crw-rw-rw- for temporary fix

# 4. Daemon starts successfully
./start
# Should NOT show TransportError
```

## Additional Notes

- The quick fix (`fix-permissions-now.sh`) is temporary but works immediately
- The permanent fix (`setup-udev-rules.sh`) requires logout/login but is permanent
- You only need to run the permanent fix ONCE, ever
- After permanent fix, it works across reboots and device replug
- The permanent fix also works with KVM switches (permissions apply when reconnecting)

## Next Steps

1. Fix the permissions using one of the methods above
2. Start the daemon: `./start`
3. Test KVM switching (the main feature you wanted!)
4. Set up autostart if desired: `./setup-autostart.sh`

---

**The daemon is now much smarter about USB permissions and will guide you when issues occur!**
