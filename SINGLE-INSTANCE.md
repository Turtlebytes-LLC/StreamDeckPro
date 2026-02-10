# Single Instance Configurator ✅

## What's Implemented

The configurator now runs as a **single instance** only. No more duplicate windows!

### How It Works

**Two-Level Protection**:

1. **Script Level** (`./configure`):
   - Creates a lock file (`.configurator.lock`)
   - Checks if another instance is running
   - If running, brings existing window to front
   - If not running, launches new instance

2. **Application Level** (`main.js`):
   - Uses Electron's `requestSingleInstanceLock()`
   - Prevents multiple Electron processes
   - Focuses existing window if you try to launch again

### Usage

Just run:
```bash
./configure
```

If the configurator is already open:
- ✅ Shows message: "Stream Deck Configurator is already running"
- ✅ Brings existing window to front (if `wmctrl` is installed)
- ✅ No duplicate windows created

### Try It

1. Run `./configure` - Opens configurator
2. Run `./configure` again - Focuses existing window, no duplicate!
3. Close configurator - Next `./configure` opens fresh

### Technical Details

**Lock File**: `.configurator.lock` in project root
- Contains process ID
- Cleaned up automatically on exit
- Removed if stale (process no longer running)

**Electron Single Instance**:
- Uses `app.requestSingleInstanceLock()`
- Second instance quits immediately
- First instance receives focus

**Window Management**:
- Restores if minimized
- Brings to front
- Shows if hidden

### Benefits

- ✅ No confusion from multiple windows
- ✅ Better resource usage
- ✅ Cleaner workflow
- ✅ Automatic focus on existing window

Enjoy your single-instance configurator! 🎛️
