#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ACTIONS_DIR="$HOME/streamdeck-actions"

if [ ! -f "$ACTIONS_DIR/volume-listener-zone3.sh" ]; then
    echo "Running setup first..."
    "$SCRIPT_DIR/setup-volume-test.sh"
fi

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $VOLUME_PID 2>/dev/null
    kill $CPU_PID 2>/dev/null
    kill $DAEMON_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting Stream Deck daemon..."
cd "$ACTIONS_DIR"
python3 "$ACTIONS_DIR/streamdeck-daemon.py" &
DAEMON_PID=$!

sleep 2

if ! kill -0 $DAEMON_PID 2>/dev/null; then
    echo "ERROR: Daemon failed to start"
    exit 1
fi

echo "Starting volume listener (zone 3)..."
"$ACTIONS_DIR/volume-listener-zone3.sh" &
VOLUME_PID=$!

echo "Starting CPU monitor (zone 4)..."
"$ACTIONS_DIR/cpu-listener-zone4.sh" &
CPU_PID=$!

echo ""
echo "============================================"
echo "  Running! Press Ctrl+C to stop"
echo "============================================"
echo ""
echo "  Zone 3: Volume (Dial 3 to control)"
echo "  Zone 4: CPU Load (Tap to open monitor)"
echo ""

wait $DAEMON_PID
