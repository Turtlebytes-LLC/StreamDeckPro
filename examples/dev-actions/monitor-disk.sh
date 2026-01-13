#!/bin/bash
# Disk Usage Monitor for Stream Deck Touch Zone
# This script continuously updates a touch zone with disk usage for root partition

# Get the touch zone number from the script name
SCRIPT_NAME=$(basename "$0")
ZONE_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'touch-\K\d+')

# If called directly (not from daemon), use zone 3
if [ -z "$ZONE_NUM" ]; then
    ZONE_NUM=3
fi

# Project directory
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TOUCH_DIR="$PROJECT_DIR/touchscreen"
IMAGE_FILE="$TOUCH_DIR/touch-$ZONE_NUM.png"
PID_FILE="/tmp/streamdeck-disk-monitor-$ZONE_NUM.pid"

# Check if monitor is already running for this zone
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        kill "$OLD_PID" 2>/dev/null
        sleep 0.2
    fi
fi

# Function to get disk usage
get_disk_usage() {
    df -h / | tail -1 | awk '{print $5}' | sed 's/%//'
}

# Function to generate disk image
generate_disk_image() {
    local disk_percent=$1

    # Choose color based on usage
    if [ "$disk_percent" -ge 90 ]; then
        COLOR="#ef4444"  # Red
    elif [ "$disk_percent" -ge 75 ]; then
        COLOR="#f59e0b"  # Yellow/Orange
    else
        COLOR="#8b5cf6"  # Purple
    fi

    # Create image with ImageMagick
    convert -size 200x100 xc:'#0a0a0a' \
        -gravity center \
        -fill "$COLOR" -pointsize 42 -font DejaVu-Sans-Bold \
        -annotate +0-8 "${disk_percent}%" \
        -fill '#888888' -pointsize 14 \
        -annotate +0+22 "DISK" \
        "$IMAGE_FILE"
}

# Run in background
(
    # Save our PID
    echo $$ > "$PID_FILE"

    # Initial update
    DISK=$(get_disk_usage)
    generate_disk_image "$DISK"

    # Update every 5 seconds (disk changes slowly)
    while true; do
        DISK=$(get_disk_usage)
        generate_disk_image "$DISK"
        sleep 5
    done
) &

# Save background process PID
echo $! > "$PID_FILE"

echo "Disk monitor started for touch zone $ZONE_NUM (PID: $(cat $PID_FILE))"
