#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_DIR="$SCRIPT_DIR/.cleanup-archive"

mkdir -p "$CLEANUP_DIR"

echo "🧹 Comprehensive Cleanup"
echo "========================"
echo ""

echo "📦 1. Archiving backup files..."
mv "$SCRIPT_DIR/configure-electron.bak" "$CLEANUP_DIR/" 2>/dev/null && echo "  ✓ configure-electron.bak"

echo ""
echo "📦 2. Removing duplicate lock files..."
mv "$SCRIPT_DIR/configurator-electron/yarn.lock" "$CLEANUP_DIR/" 2>/dev/null && echo "  ✓ yarn.lock (using npm/package-lock.json)"

echo ""
echo "📦 3. Removing old development files..."
mv "$SCRIPT_DIR/configurator-electron/COMPLETE-SOURCE-CODE.txt" "$CLEANUP_DIR/" 2>/dev/null && echo "  ✓ COMPLETE-SOURCE-CODE.txt"

echo ""
echo "📦 4. Removing Nextcloud conflict files..."
find "$SCRIPT_DIR" -name "*conflicted*" -type f 2>/dev/null | while read -r file; do
    mv "$file" "$CLEANUP_DIR/" 2>/dev/null && echo "  ✓ $(basename "$file")"
done

echo ""
echo "📦 5. Checking .gitignore completeness..."
if ! grep -q "node_modules" "$SCRIPT_DIR/.gitignore" 2>/dev/null; then
    echo "node_modules/" >> "$SCRIPT_DIR/.gitignore"
    echo "  ✓ Added node_modules/ to .gitignore"
fi
if ! grep -q "dist/" "$SCRIPT_DIR/.gitignore" 2>/dev/null; then
    echo "dist/" >> "$SCRIPT_DIR/.gitignore"
    echo "  ✓ Added dist/ to .gitignore"
fi
if ! grep -q ".cleanup-archive" "$SCRIPT_DIR/.gitignore" 2>/dev/null; then
    echo ".cleanup-archive/" >> "$SCRIPT_DIR/.gitignore"
    echo "  ✓ Added .cleanup-archive/ to .gitignore"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Archived files: .cleanup-archive/"
echo "  - Old docs: docs/archive/"
echo "  - .gitignore: Updated"
echo ""
echo "💾 Disk space analysis:"
du -sh "$SCRIPT_DIR/configurator-electron/node_modules" 2>/dev/null | sed 's/^/  node_modules: /'
du -sh "$SCRIPT_DIR/configurator-electron/dist" 2>/dev/null | sed 's/^/  dist: /'
du -sh "$SCRIPT_DIR/.cleanup-archive" 2>/dev/null | sed 's/^/  cleanup-archive: /'
du -sh "$SCRIPT_DIR/docs/archive" 2>/dev/null | sed 's/^/  docs/archive: /'

echo ""
echo "🗑️  To permanently delete all archived files:"
echo "    rm -rf .cleanup-archive docs/archive"
