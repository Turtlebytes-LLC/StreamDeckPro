#!/bin/bash
# Stop CPU Monitor
# Stops the CPU monitoring script for a touch zone

# Get the touch zone number from the script name
SCRIPT_NAME=$(basename "$0")
ZONE_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'touch-\K\d+')

# If called directly, stop all monitors
if [ -z "$ZONE_NUM" ]; then
    echo "Stopping all CPU monitors..."
    for pid_file in /tmp/streamdeck-cpu-monitor-*.pid; do
        if [ -f "$pid_file" ]; then
            PID=$(cat "$pid_file")
            if ps -p "$PID" > /dev/null 2>&1; then
                kill "$PID"
                echo "Stopped monitor (PID: $PID)"
            fi
            rm "$pid_file"
        fi
    done
else
    # Stop specific zone
    PID_FILE="/tmp/streamdeck-cpu-monitor-$ZONE_NUM.pid"

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            echo "CPU monitor stopped for touch zone $ZONE_NUM"
        else
            echo "Monitor not running for touch zone $ZONE_NUM"
        fi
        rm "$PID_FILE"
    else
        echo "No monitor found for touch zone $ZONE_NUM"
    fi
fi
