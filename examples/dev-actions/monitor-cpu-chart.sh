#!/bin/bash
# CPU Usage Chart for Stream Deck Touch Zone
# Shows a sparkline chart with CPU history updated every 2 seconds

# Get the touch zone number from the script name
SCRIPT_NAME=$(basename "$0")
ZONE_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'touch-\K\d+')

# If called directly (not from daemon), use zone 1
if [ -z "$ZONE_NUM" ]; then
    ZONE_NUM=1
fi

# Project directory - detect based on where we are
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ "$SCRIPT_DIR" == */touchscreen ]]; then
    # Script is in touchscreen/ directory
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    TOUCH_DIR="$SCRIPT_DIR"
else
    # Script is in examples/dev-actions/ or elsewhere
    PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
    TOUCH_DIR="$PROJECT_DIR/touchscreen"
fi
IMAGE_FILE="$TOUCH_DIR/touch-$ZONE_NUM.png"
PID_FILE="/tmp/streamdeck-cpu-chart-monitor-$ZONE_NUM.pid"
DATA_FILE="/tmp/streamdeck-cpu-chart-data-$ZONE_NUM.txt"

# Check if monitor is already running for this zone
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        # Already running, kill it to restart
        kill "$OLD_PID" 2>/dev/null
        sleep 0.2
    fi
fi

# Initialize data file with zeros (30 data points = 1 minute of history)
if [ ! -f "$DATA_FILE" ]; then
    for i in {1..30}; do echo "0" >> "$DATA_FILE"; done
fi

# Function to get CPU usage
get_cpu_usage() {
    /usr/bin/top -bn2 -d 0.5 | /usr/bin/grep "Cpu(s)" | /usr/bin/tail -1 | /usr/bin/sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | /usr/bin/awk '{print 100 - $1}'
}

# Function to generate CPU chart image
generate_cpu_chart_image() {
    local cpu_percent=$1
    local cpu_int=$(printf "%.0f" "$cpu_percent")

    # Add new value to history and remove oldest
    echo "$cpu_int" >> "$DATA_FILE"
    /usr/bin/tail -n 30 "$DATA_FILE" > "$DATA_FILE.tmp"
    /usr/bin/mv "$DATA_FILE.tmp" "$DATA_FILE"

    # Read all values
    mapfile -t values < "$DATA_FILE"

    # Choose color based on current usage
    if [ "$cpu_int" -ge 80 ]; then
        LINE_COLOR="#ef4444"  # Red
        BG_COLOR="#1a0505"
        TEXT_COLOR="#ff6b6b"
    elif [ "$cpu_int" -ge 50 ]; then
        LINE_COLOR="#f59e0b"  # Orange
        BG_COLOR="#1a1005"
        TEXT_COLOR="#ffa726"
    else
        LINE_COLOR="#3b82f6"  # Blue
        BG_COLOR="#05091a"
        TEXT_COLOR="#60a5fa"
    fi

    # Image dimensions
    WIDTH=200
    HEIGHT=100
    CHART_HEIGHT=60
    PADDING_TOP=25
    PADDING_BOTTOM=15

    # Create base image with background and baseline
    /usr/bin/convert -size ${WIDTH}x${HEIGHT} xc:"$BG_COLOR" \
        -stroke '#1a1a1a' -strokewidth 1 \
        -draw "line 0,$((PADDING_TOP + CHART_HEIGHT)) $WIDTH,$((PADDING_TOP + CHART_HEIGHT))" \
        /tmp/cpu_chart_$ZONE_NUM.png

    # Draw bars for each data point
    POINT_WIDTH=$((WIDTH / 30))
    BAR_WIDTH=$((POINT_WIDTH - 1))

    for i in "${!values[@]}"; do
        value=${values[$i]}
        if [ "$value" -gt 0 ]; then
            x=$((i * POINT_WIDTH))
            bar_height=$((value * CHART_HEIGHT / 100))
            y=$((PADDING_TOP + CHART_HEIGHT - bar_height))

            # Draw filled bar with semi-transparent color
            /usr/bin/convert /tmp/cpu_chart_$ZONE_NUM.png \
                -fill "${LINE_COLOR}40" -stroke none \
                -draw "rectangle $x,$y $((x + BAR_WIDTH)),$((PADDING_TOP + CHART_HEIGHT))" \
                /tmp/cpu_chart_$ZONE_NUM.png
        fi
    done

    # Draw line connecting bar tops
    prev_x=-1
    prev_y=-1
    for i in "${!values[@]}"; do
        value=${values[$i]}
        x=$((i * POINT_WIDTH + POINT_WIDTH / 2))
        bar_height=$((value * CHART_HEIGHT / 100))
        y=$((PADDING_TOP + CHART_HEIGHT - bar_height))

        if [ $prev_x -ge 0 ]; then
            /usr/bin/convert /tmp/cpu_chart_$ZONE_NUM.png \
                -stroke "$LINE_COLOR" -strokewidth 2 -fill none \
                -draw "line $prev_x,$prev_y $x,$y" \
                /tmp/cpu_chart_$ZONE_NUM.png
        fi

        prev_x=$x
        prev_y=$y
    done

    # Add percentage text overlay above the chart
    /usr/bin/convert /tmp/cpu_chart_$ZONE_NUM.png \
        -gravity north -pointsize 16 -font DejaVu-Sans-Bold -fill "$TEXT_COLOR" \
        -annotate +0+5 "${cpu_int}%" \
        "$IMAGE_FILE"

    # Cleanup temp files
    /usr/bin/rm -f /tmp/cpu_chart_$ZONE_NUM.png
}

# Run in background
(
    # Save our PID
    echo $$ > "$PID_FILE"

    # Initial update
    CPU=$(get_cpu_usage)
    generate_cpu_chart_image "$CPU"

    # Update every 2 seconds
    while true; do
        /usr/bin/sleep 2
        CPU=$(get_cpu_usage)
        generate_cpu_chart_image "$CPU"
    done
) &

# Save background process PID
BG_PID=$!
echo $BG_PID > "$PID_FILE"

echo "CPU chart monitor started for touch zone $ZONE_NUM (PID: $BG_PID)"
echo "Updates every 2 seconds at: $IMAGE_FILE"
echo "History saved at: $DATA_FILE"
