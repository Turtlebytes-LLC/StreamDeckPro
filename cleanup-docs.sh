#!/bin/bash
# Cleanup duplicate and outdated documentation files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE_DIR="$SCRIPT_DIR/docs/archive"

mkdir -p "$ARCHIVE_DIR"

echo "🧹 Cleaning up duplicate and outdated documentation..."

# Root level - Remove duplicates
echo "📄 Archiving root level duplicates..."
mv "$SCRIPT_DIR/HOW-TO-SEE-CHANGES.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ HOW-TO-SEE-CHANGES.md"
mv "$SCRIPT_DIR/LAUNCH-NEW-UI.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ LAUNCH-NEW-UI.md"
mv "$SCRIPT_DIR/TROUBLESHOOT-UI.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ TROUBLESHOOT-UI.md"

# Configurator - Consolidate overlapping docs
echo "📄 Archiving configurator duplicates..."
mv "$SCRIPT_DIR/configurator-electron/FIXES-APPLIED.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ FIXES-APPLIED.md"
mv "$SCRIPT_DIR/configurator-electron/UI-IMPROVEMENTS.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ UI-IMPROVEMENTS.md"
mv "$SCRIPT_DIR/configurator-electron/OFFICIAL-UI-REDESIGN.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ OFFICIAL-UI-REDESIGN.md"
mv "$SCRIPT_DIR/configurator-electron/STREAM-DECK-PLUS-PREVIEW.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ STREAM-DECK-PLUS-PREVIEW.md"
mv "$SCRIPT_DIR/configurator-electron/SETUP-GUIDE.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ SETUP-GUIDE.md (keeping SETUP-CONFIGURATOR.md)"

# Docs folder - Check for duplicates
echo "📄 Archiving docs folder duplicates..."
mv "$SCRIPT_DIR/docs/FIXES-APPLIED.md" "$ARCHIVE_DIR/" 2>/dev/null && echo "  ✓ docs/FIXES-APPLIED.md (duplicate)"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📦 Archived files are in: docs/archive/"
echo ""
echo "📚 Keeping these essential docs:"
echo "  Root:"
echo "    - README.md (main documentation)"
echo "    - TESTING.md (testing guide)"
echo "    - SESSION-SUMMARY.md (session notes)"
echo "    - SINGLE-INSTANCE.md (single instance feature)"
echo "    - CONFIGURATOR-CONSOLIDATED.md (consolidation notes)"
echo ""
echo "  Configurator:"
echo "    - README.md (configurator readme)"
echo "    - COMPLETE-FIXES.md (comprehensive fix list)"
echo "    - ICON-LIBRARY-IMPLEMENTED.md (icon library docs)"
echo "    - SETUP-CONFIGURATOR.md (setup instructions)"
echo ""
echo "  Docs folder:"
echo "    - All original project docs preserved"
echo ""
echo "🗑️  To permanently delete archived files:"
echo "    rm -rf docs/archive/"
