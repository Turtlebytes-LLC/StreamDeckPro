# Troubleshooting Empty UI

If you're seeing an empty preview panel, follow these steps:

## 1. Relaunch with Dev Tools Open

I've enabled the developer console to help us debug. Relaunch the configurator:

```bash
./configure
```

You should now see two windows:
1. **Main window** - The configurator UI
2. **Dev Tools** - Console showing errors/logs

## 2. Check the Console Tab

In the Dev Tools window:
1. Click the "Console" tab
2. Look for any red error messages
3. Look for the initialization messages:
   - "Initializing Stream Deck Configurator..."
   - "Directories loaded: {buttons: '...', dials: '...', ...}"
   - "Device detected: {...}"
   - "Deck preview rendered"

## 3. Common Issues & Solutions

### Error: "window.api is not defined"
**Problem:** Preload script didn't load
**Solution:**
```bash
# Make sure preload.js exists
ls -la configurator-electron/preload.js

# Restart configurator
./configure
```

### Error: "Cannot read property 'buttons' of undefined"
**Problem:** Directories not loading
**Solution:** Check that the project paths are correct in main.js

### No errors, but still empty
**Problem:** JavaScript might be failing silently
**Solution:** Look for warnings (yellow text) in the console

## 4. Manual Test

Open the Dev Tools console and type:

```javascript
// Test if API is available
console.log('API available:', !!window.api);

// Test directories
window.api.getDirectories().then(d => console.log('Dirs:', d));

// Test file operations
window.api.fileExists('/home/zach2825/Nextcloud/Projects/Work/streamdeck-actions/buttons').then(e => console.log('Buttons dir exists:', e));
```

## 5. Send Me the Console Output

If you see errors in the console, share them with me and I can fix the issue!

## Quick Fix Attempt

Try this command to restart fresh:

```bash
# Kill any running instance
pkill -f electron

# Relaunch
./configure
```

---

**Next:** After you relaunch and check the console, let me know what errors you see!
