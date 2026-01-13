#!/bin/bash
# Stop All System Monitors
# Stops all CPU, RAM, and disk monitoring scripts for buttons and touch zones

echo "Stopping all system monitors..."

STOPPED=0

# Find all monitor PID files
for pid_file in /tmp/streamdeck-*-monitor-*.pid /tmp/streamdeck-*-button-monitor-*.pid; do
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")

        # Extract monitor type from filename
        if [[ "$pid_file" =~ streamdeck-([^-]+)-(button-)?monitor ]]; then
            MONITOR_TYPE="${BASH_REMATCH[1]}"
            if [ -n "${BASH_REMATCH[2]}" ]; then
                MONITOR_TYPE="$MONITOR_TYPE button"
            fi
        else
            MONITOR_TYPE="unknown"
        fi

        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            echo "✓ Stopped $MONITOR_TYPE monitor (PID: $PID)"
            STOPPED=$((STOPPED + 1))
        fi
        rm "$pid_file"
    fi
done

if [ "$STOPPED" -eq 0 ]; then
    echo "No monitors were running"
else
    echo ""
    echo "Stopped $STOPPED monitor(s)"
fi
