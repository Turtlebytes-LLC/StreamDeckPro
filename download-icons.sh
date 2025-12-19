#!/bin/bash
# Download free, open-source icons for Stream Deck
# Uses Tabler Icons - 4000+ MIT-licensed icons
# https://github.com/tabler/tabler-icons

show_help() {
    cat << EOF
Stream Deck Icon Downloader
Downloads and converts Tabler Icons (4000+ free MIT-licensed icons)

USAGE:
    ./download-icons.sh [OPTIONS] [CATEGORY] [COLOR]

OPTIONS:
    --help              Show this help message
    --outline           Use outline style icons (default)
    --filled            Use filled style icons
    test                Convert only 20 icons for testing

CATEGORIES:
    all                 All 4000+ icons (default)
    utils               Utilities: settings, adjustments, toggle (~140 icons)
    apps                Applications: browser, terminal, folder (~278 icons)
    media               Media: play, pause, music, video (~239 icons)
    dev                 Development: code, git, terminal (~214 icons)
    system              System: power, lock, wifi, battery (~167 icons)
    creative            Creative: brush, palette, photo (~90 icons)
    brand               Brand logos: GitHub, Twitter, Google, etc. (~370 icons)

COLORS:
    blue, red, green, orange, purple, pink, teal, indigo,
    cyan, yellow, lime, amber, brown, grey, black, white
    Or use custom hex colors like #FF5722

NAMING CONVENTION:
    Outline icons: heart-o.png, heart-red-o.png (with -o suffix)
    Filled icons:  heart.png, heart-red.png (no suffix)

    Icons are colored (not backgrounds):
    - Colored icon on black background
    - Outline: just stroke/outline in color
    - Filled: solid shapes in color

EXAMPLES:
    ./download-icons.sh                     # All outline icons in blue (heart-o.png)
    ./download-icons.sh test                # 20 outline test icons (star-o.png)
    ./download-icons.sh --filled            # All filled icons in blue (heart.png)
    ./download-icons.sh utils               # Utility outline icons (settings-o.png)
    ./download-icons.sh apps red            # App outline icons in red (folder-red-o.png)
    ./download-icons.sh brand test          # 20 brand icons (brand-github-o.png)
    ./download-icons.sh media test green    # 20 media icons (play-green-o.png)
    ./download-icons.sh --filled dev purple # Filled dev icons (code-purple.png)

EOF
    exit 0
}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ICONS_DIR="$SCRIPT_DIR/icons"
TEMP_DIR="/tmp/streamdeck-icons-download"

# Create category subdirectories
create_category_dirs() {
    mkdir -p "$ICONS_DIR/utils"
    mkdir -p "$ICONS_DIR/apps"
    mkdir -p "$ICONS_DIR/media"
    mkdir -p "$ICONS_DIR/dev"
    mkdir -p "$ICONS_DIR/system"
    mkdir -p "$ICONS_DIR/creative"
    mkdir -p "$ICONS_DIR/brand"
    mkdir -p "$ICONS_DIR/other"
}

# Parse arguments
TEST_MODE=""
COLOR=""
CATEGORY="all"
STYLE="outline"

# Known categories
CATEGORIES="all utils apps media dev system creative brand"

# Known colors
KNOWN_COLORS="blue red green orange purple pink teal indigo cyan yellow lime amber brown grey black white"

for arg in "$@"; do
    if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
        show_help
    elif [ "$arg" = "--outline" ]; then
        STYLE="outline"
    elif [ "$arg" = "--filled" ]; then
        STYLE="filled"
    elif [ "$arg" = "test" ]; then
        TEST_MODE="test"
    elif echo "$CATEGORIES" | grep -wq "$arg"; then
        CATEGORY="$arg"
    elif echo "$KNOWN_COLORS" | grep -wq "$arg"; then
        COLOR="$arg"
    elif [[ "$arg" =~ ^#[0-9A-Fa-f]{6}$ ]]; then
        COLOR="$arg"
    else
        # Assume it's a color if not recognized
        COLOR="$arg"
    fi
done

# Function to determine which category folder an icon belongs to
get_icon_category() {
    local icon_name="$1"

    # Check each category in order
    if echo "$icon_name" | grep -qE "^brand-"; then
        echo "brand"
    elif echo "$icon_name" | grep -qE "(adjustments|settings|toggle|switch|slider|control|gear|cog|tool|wrench|screwdriver|gauge|meter|dashboard|panel|options|preferences|config)"; then
        echo "utils"
    elif echo "$icon_name" | grep -qE "(browser|chrome|firefox|safari|terminal|console|shell|folder|file|directory|window|app|application|finder|explorer|inbox|mail|calendar|clock|calculator)"; then
        echo "apps"
    elif echo "$icon_name" | grep -qE "(play|pause|stop|forward|rewind|skip|music|audio|sound|volume|speaker|headphone|microphone|mic|video|camera|film|movie|photo|picture|image|player|playlist|record)"; then
        echo "media"
    elif echo "$icon_name" | grep -qE "(code|git|github|gitlab|terminal|console|debug|bug|database|sql|api|json|xml|html|css|js|javascript|python|node|npm|docker|kubernetes|server|cloud|deploy|build|compile|test)"; then
        echo "dev"
    elif echo "$icon_name" | grep -qE "(power|shutdown|restart|sleep|lock|unlock|wifi|bluetooth|network|ethernet|battery|charging|cpu|memory|disk|monitor|screen|brightness|keyboard|mouse|usb|printer|scan)"; then
        echo "system"
    elif echo "$icon_name" | grep -qE "(brush|paint|palette|color|draw|pencil|pen|eraser|edit|crop|rotate|resize|filter|layer|select|transform|photo|image|design|art|creative|typography|text|font)"; then
        echo "creative"
    else
        echo "other"
    fi
}

# Function to check if an icon matches the selected category
matches_category() {
    local icon_name="$1"

    # If downloading all, always match
    if [ "$CATEGORY" = "all" ]; then
        return 0
    fi

    # Get the icon's natural category
    icon_cat=$(get_icon_category "$icon_name")

    # Check if it matches the requested category
    if [ "$icon_cat" = "$CATEGORY" ]; then
        return 0
    else
        return 1
    fi
}

echo "=========================================="
echo "Stream Deck Icon Downloader"
echo "=========================================="
echo ""
echo "Downloading Tabler Icons (4000+ free MIT-licensed icons)..."
echo ""

# Check for required tools
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found!"
    echo ""
    echo "Install it with:"
    echo "  sudo apt-get install imagemagick"
    echo ""
    exit 1
fi

# Create icons directory and category subdirectories
mkdir -p "$ICONS_DIR"
create_category_dirs

# Download or update the icon repository
if [ -d "$TEMP_DIR" ]; then
    echo "📦 Updating existing icon repository..."
    cd "$TEMP_DIR"
    git pull
else
    echo "📦 Cloning Tabler Icons repository..."
    git clone --depth 1 https://github.com/tabler/tabler-icons.git "$TEMP_DIR"
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to download icons"
    exit 1
fi

cd "$TEMP_DIR"

if [ -n "$COLOR" ]; then
    COLOR_NAME="$COLOR"
    echo ""
    echo "🎨 Color: $COLOR"
else
    COLOR_NAME="blue"
fi

echo ""
echo "🎨 Style: $STYLE"
echo "📁 Category: $CATEGORY"

if [ "$TEST_MODE" = "test" ]; then
    echo ""
    echo "🧪 TEST MODE: Converting only 20 icons for testing"
    echo ""
    MAX_ICONS=20
else
    echo ""
    echo "🔄 Converting SVG icons to PNG (120x120 for buttons)..."
    if [ "$CATEGORY" != "all" ]; then
        echo "   Filtering by category: $CATEGORY"
    fi
    echo "   This may take a few minutes..."
    echo ""
    MAX_ICONS=999999
fi

# Find all SVG files in the icons directory
svg_count=0
converted_count=0
skipped_count=0
category_match_count=0

# Convert SVGs to PNGs at 120x120 (for Stream Deck buttons)
for svg_file in icons/$STYLE/*.svg; do
    # Get filename without path and extension
    filename=$(basename "$svg_file" .svg)

    # Check if icon matches the selected category
    if ! matches_category "$filename"; then
        ((skipped_count++))
        continue
    fi

    ((category_match_count++))
    ((svg_count++))

    # Stop if we hit the test limit
    if [ $svg_count -gt $MAX_ICONS ]; then
        break
    fi

    # Build filename with style suffix and color
    # Outline icons get "-o" suffix, filled icons have no suffix
    if [ "$STYLE" = "outline" ]; then
        style_suffix="-o"
    else
        style_suffix=""
    fi

    # Append color to filename if not blue (default)
    if [ "$COLOR_NAME" = "blue" ]; then
        output_filename="${filename}${style_suffix}.png"
    else
        output_filename="${filename}-${COLOR_NAME}${style_suffix}.png"
    fi

    # Determine category folder for this icon
    icon_category=$(get_icon_category "$filename")

    # Create category/color subdirectory
    color_dir="$ICONS_DIR/${icon_category}/${COLOR_NAME}"
    mkdir -p "$color_dir"

    # Output PNG file in category/color subdirectory
    # Remove color suffix from filename since it's in the folder name
    if [ "$STYLE" = "outline" ]; then
        simple_filename="${filename}-o.png"
    else
        simple_filename="${filename}.png"
    fi

    png_file="$color_dir/${simple_filename}"

    # Only convert if PNG doesn't exist or SVG is newer
    if [ ! -f "$png_file" ] || [ "$svg_file" -nt "$png_file" ]; then
        # Use Python script with cairosvg for proper SVG rendering
        # Pass color as third argument
        "$SCRIPT_DIR/convert-icon.py" "$svg_file" "$png_file" "$COLOR_NAME" >/dev/null 2>&1

        if [ $? -eq 0 ]; then
            ((converted_count++))

            # Show progress in test mode
            if [ "$TEST_MODE" = "test" ]; then
                echo "   ✓ $output_filename"
            elif [ $((converted_count % 100)) -eq 0 ]; then
                echo "   Converted $converted_count icons..."
            fi
        else
            if [ "$TEST_MODE" = "test" ]; then
                echo "   ✗ Failed: $output_filename"
            fi
        fi
    fi
done

echo ""
echo "=========================================="
echo "✓ Icon download complete!"
echo "=========================================="
echo ""
echo "Statistics:"
if [ "$CATEGORY" != "all" ]; then
    echo "  • Category: $CATEGORY"
    echo "  • Icons matching category: $category_match_count"
    echo "  • Icons skipped (not in category): $skipped_count"
fi
echo "  • Icons processed: $svg_count"
echo "  • Icons converted to PNG: $converted_count"
echo "  • Icons directory: $ICONS_DIR"
if [ "$CATEGORY" != "all" ]; then
    echo "  • Saved to: $ICONS_DIR/$CATEGORY/$COLOR_NAME/"
else
    echo "  • Icons organized by category and color in subdirectories"
fi
echo ""
echo "Icons are now available in the configuration UI!"
echo "Click the '🎨 Icons' button when setting button or touchscreen images."
echo ""
echo "Icon Organization:"
echo "  • Icons organized by: category → color → icon"
echo "  • Example: icons/utils/blue/settings-o.png"
echo "  • Example: icons/media/red/play-o.png"
echo "  • This keeps thousands of icons organized and easy to browse!"
echo ""
if [ "$CATEGORY" != "all" ]; then
    echo "Tip: To download more categories, run this script again with a different category."
    echo "Available: all, utils, apps, media, dev, system, creative, brand"
    echo ""
fi
echo "These icons are from Tabler Icons (https://tabler-icons.io/)"
echo "Licensed under MIT - Free to use for any purpose"
echo ""
echo "To update icons in the future, run this script again."
echo ""
