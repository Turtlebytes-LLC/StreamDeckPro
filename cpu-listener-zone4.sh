#!/bin/bash
# CPU Monitor for Touch Zone 4 - Shows rolling line chart of CPU history
# Configurable update interval (default 2 seconds)

ACTIONS_DIR="$HOME/streamdeck-actions"
TOUCH_IMAGE="$ACTIONS_DIR/touchscreen/touch-4.png"
GENERATOR="$ACTIONS_DIR/generate-cpu-chart.py"

UPDATE_INTERVAL="${CPU_UPDATE_INTERVAL:-2}"

get_cpu() {
    # Get CPU usage from /proc/stat
    local cpu_line=$(head -1 /proc/stat)
    local cpu1=($(echo $cpu_line | cut -d' ' -f2-))
    sleep 0.2
    local cpu_line2=$(head -1 /proc/stat)
    local cpu2=($(echo $cpu_line2 | cut -d' ' -f2-))
    
    local idle1=${cpu1[3]}
    local idle2=${cpu2[3]}
    local total1=0
    local total2=0
    
    for val in "${cpu1[@]}"; do total1=$((total1 + val)); done
    for val in "${cpu2[@]}"; do total2=$((total2 + val)); done
    
    local diff_idle=$((idle2 - idle1))
    local diff_total=$((total2 - total1))
    
    if [ $diff_total -gt 0 ]; then
        local usage=$((100 * (diff_total - diff_idle) / diff_total))
        echo $usage
    else
        echo 0
    fi
}

LAST_CPU=""

update_if_changed() {
    local cpu=$(get_cpu)
    
    # Only update if changed by more than 2%
    if [ -z "$LAST_CPU" ] || [ $((cpu - LAST_CPU)) -gt 2 ] || [ $((LAST_CPU - cpu)) -gt 2 ]; then
        LAST_CPU=$cpu
        python3 "$GENERATOR" "$cpu" "$TOUCH_IMAGE"
        echo "CPU: $cpu%"
    fi
}

echo "CPU monitor starting (interval: ${UPDATE_INTERVAL}s)..."

# Initial update
update_if_changed

while true; do
    update_if_changed
    sleep $UPDATE_INTERVAL
done
