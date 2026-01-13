#!/bin/bash
# Disk Usage Monitor for Stream Deck Button
# This script continuously updates a button with disk usage for root partition
# Updates every 5 seconds

# Get the button number from the script name
SCRIPT_NAME=$(basename "$0")
BUTTON_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'button-\K\d+')

# If called directly (not from daemon), use button 3
if [ -z "$BUTTON_NUM" ]; then
    BUTTON_NUM=3
fi

# Project directory
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUTTONS_DIR="$PROJECT_DIR/buttons"
IMAGE_FILE="$BUTTONS_DIR/button-$BUTTON_NUM.png"
PID_FILE="/tmp/streamdeck-disk-button-monitor-$BUTTON_NUM.pid"

# Check if monitor is already running for this button
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

# Function to generate disk button image
generate_disk_button_image() {
    local disk_percent=$1

    # Choose color based on usage
    if [ "$disk_percent" -ge 90 ]; then
        COLOR="#ef4444"  # Red
        BG_COLOR="#2a0a0a"
    elif [ "$disk_percent" -ge 75 ]; then
        COLOR="#f59e0b"  # Orange
        BG_COLOR="#2a1a0a"
    else
        COLOR="#8b5cf6"  # Purple
        BG_COLOR="#1a0a2a"
    fi

    # Create square button image (120x120 for Stream Deck Plus)
    convert -size 120x120 xc:"$BG_COLOR" \
        -gravity center \
        -fill "$COLOR" -pointsize 48 -font DejaVu-Sans-Bold \
        -annotate +0-10 "${disk_percent}%" \
        -fill '#666666' -pointsize 16 \
        -annotate +0+28 "DISK" \
        "$IMAGE_FILE"
}

# Run in background
(
    # Save our PID
    echo $$ > "$PID_FILE"

    # Initial update
    DISK=$(get_disk_usage)
    generate_disk_button_image "$DISK"

    # Update every 5 seconds
    while true; do
        sleep 5
        DISK=$(get_disk_usage)
        generate_disk_button_image "$DISK"
    done
) &

# Save background process PID
BG_PID=$!
echo $BG_PID > "$PID_FILE"

echo "Disk monitor started for button $BUTTON_NUM (PID: $BG_PID)"
echo "Updates every 5 seconds at: $IMAGE_FILE"
