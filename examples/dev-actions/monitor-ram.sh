#!/bin/bash
# RAM Usage Monitor for Stream Deck Touch Zone
# This script continuously updates a touch zone with live RAM usage

# Get the touch zone number from the script name
SCRIPT_NAME=$(basename "$0")
ZONE_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'touch-\K\d+')

# If called directly (not from daemon), use zone 2
if [ -z "$ZONE_NUM" ]; then
    ZONE_NUM=2
fi

# Project directory
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TOUCH_DIR="$PROJECT_DIR/touchscreen"
IMAGE_FILE="$TOUCH_DIR/touch-$ZONE_NUM.png"
PID_FILE="/tmp/streamdeck-ram-monitor-$ZONE_NUM.pid"

# Check if monitor is already running for this zone
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        kill "$OLD_PID" 2>/dev/null
        sleep 0.2
    fi
fi

# Function to get RAM usage
get_ram_usage() {
    free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}'
}

# Function to generate RAM image
generate_ram_image() {
    local ram_percent=$1

    # Choose color based on usage
    if [ "$ram_percent" -ge 80 ]; then
        COLOR="#ef4444"  # Red
    elif [ "$ram_percent" -ge 60 ]; then
        COLOR="#f59e0b"  # Yellow/Orange
    else
        COLOR="#10b981"  # Green
    fi

    # Create image with ImageMagick
    convert -size 200x100 xc:'#0a0a0a' \
        -gravity center \
        -fill "$COLOR" -pointsize 42 -font DejaVu-Sans-Bold \
        -annotate +0-8 "${ram_percent}%" \
        -fill '#888888' -pointsize 14 \
        -annotate +0+22 "RAM" \
        "$IMAGE_FILE"
}

# Run in background
(
    # Save our PID
    echo $$ > "$PID_FILE"

    # Initial update
    RAM=$(get_ram_usage)
    generate_ram_image "$RAM"

    # Update every 2 seconds (RAM changes slower than CPU)
    while true; do
        RAM=$(get_ram_usage)
        generate_ram_image "$RAM"
        sleep 2
    done
) &

# Save background process PID
echo $! > "$PID_FILE"

echo "RAM monitor started for touch zone $ZONE_NUM (PID: $(cat $PID_FILE))"
