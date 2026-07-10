#!/bin/bash
#
# Unified Stream Deck status listener.
#
# Usage: status-listener.sh <kind> <zone>
#        status-listener.sh <kind>:<zone>     (systemd instance form)
#
#   kind = volume | mute | cpu
#   zone = touchscreen zone number (1-4)
#
# All paths are resolved relative to this script's location - no $HOME hardcodes.

set -u

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOUCH_DIR="$REPO_ROOT/touchscreen"
GENERATOR="$SCRIPT_DIR/generate-status-image.py"

# Accept "kind:zone" (systemd %i) or two positional args.
ARG1="${1:-}"
if [[ "$ARG1" == *:* ]]; then
    KIND="${ARG1%%:*}"
    ZONE="${ARG1##*:}"
else
    KIND="$ARG1"
    ZONE="${2:-}"
fi

if [[ -z "$KIND" || -z "$ZONE" ]]; then
    echo "Usage: status-listener.sh <volume|mute|cpu> <zone>" >&2
    exit 1
fi

TOUCH_IMAGE="$TOUCH_DIR/touch-${ZONE}.png"
mkdir -p "$TOUCH_DIR"

get_volume() {
    pactl get-sink-volume @DEFAULT_SINK@ 2>/dev/null | grep -oP '\d+%' | head -1 | tr -d '%'
}

is_muted() {
    pactl get-sink-mute @DEFAULT_SINK@ 2>/dev/null | grep -q "yes"
}

get_cpu() {
    local cpu1 cpu2 idle1 idle2 total1=0 total2=0 val
    cpu1=($(head -1 /proc/stat | cut -d' ' -f2-))
    sleep 0.2
    cpu2=($(head -1 /proc/stat | cut -d' ' -f2-))
    idle1=${cpu1[3]}
    idle2=${cpu2[3]}
    for val in "${cpu1[@]}"; do total1=$((total1 + val)); done
    for val in "${cpu2[@]}"; do total2=$((total2 + val)); done
    local diff_idle=$((idle2 - idle1))
    local diff_total=$((total2 - total1))
    if [ "$diff_total" -gt 0 ]; then
        echo $((100 * (diff_total - diff_idle) / diff_total))
    else
        echo 0
    fi
}

update_volume() {
    local volume
    volume=$(get_volume)
    [ -z "$volume" ] && volume=0
    if is_muted; then
        python3 "$GENERATOR" --kind volume --value "$volume" --out "$TOUCH_IMAGE" --muted
    else
        python3 "$GENERATOR" --kind volume --value "$volume" --out "$TOUCH_IMAGE"
    fi
}

update_mute() {
    if is_muted; then
        python3 "$GENERATOR" --kind mute --out "$TOUCH_IMAGE" --muted
    else
        python3 "$GENERATOR" --kind mute --out "$TOUCH_IMAGE"
    fi
}

LAST_CPU=""
update_cpu() {
    local cpu
    cpu=$(get_cpu)
    if [ -z "$LAST_CPU" ] || [ $((cpu - LAST_CPU)) -gt 2 ] || [ $((LAST_CPU - cpu)) -gt 2 ]; then
        LAST_CPU=$cpu
        python3 "$GENERATOR" --kind cpu --value "$cpu" --out "$TOUCH_IMAGE"
    fi
}

run_audio_loop() {
    local updater="$1"
    "$updater"   # initial render
    echo "Starting $KIND listener on zone $ZONE..."
    if command -v pactl &> /dev/null; then
        pactl subscribe 2>/dev/null | while read -r event; do
            if echo "$event" | grep -qE "sink|server"; then
                "$updater"
            fi
        done
    else
        echo "pactl not found, polling every 2 seconds..."
        while true; do
            "$updater"
            sleep 2
        done
    fi
}

case "$KIND" in
    volume)
        run_audio_loop update_volume
        ;;
    mute)
        run_audio_loop update_mute
        ;;
    cpu)
        echo "Starting cpu listener on zone $ZONE (interval: ${CPU_UPDATE_INTERVAL:-5}s)..."
        update_cpu
        while true; do
            update_cpu
            sleep "${CPU_UPDATE_INTERVAL:-5}"
        done
        ;;
    *)
        echo "Unknown kind: $KIND (expected volume|mute|cpu)" >&2
        exit 1
        ;;
esac
