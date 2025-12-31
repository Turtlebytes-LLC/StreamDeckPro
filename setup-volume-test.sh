#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ACTIONS_DIR="$HOME/streamdeck-actions"

echo "============================================"
echo "  Volume Control Test Setup"
echo "  Touch Zone 3 + Dial 3"
echo "============================================"
echo ""

mkdir -p "$ACTIONS_DIR/buttons"
mkdir -p "$ACTIONS_DIR/dials"
mkdir -p "$ACTIONS_DIR/touchscreen"

if [ ! -f "$ACTIONS_DIR/streamdeck-daemon.py" ]; then
    echo "Installing daemon and scripts to $ACTIONS_DIR..."
    cp "$SCRIPT_DIR/streamdeck-daemon.py" "$ACTIONS_DIR/"
    cp "$SCRIPT_DIR/generate-volume-image.py" "$ACTIONS_DIR/"
    chmod +x "$ACTIONS_DIR/streamdeck-daemon.py"
    chmod +x "$ACTIONS_DIR/generate-volume-image.py"
fi

echo "Setting up Dial 3 for volume control..."

cat > "$ACTIONS_DIR/dials/dial-3-cw.sh" << 'EOF'
#!/bin/bash
pactl set-sink-volume @DEFAULT_SINK@ +5%
EOF

cat > "$ACTIONS_DIR/dials/dial-3-ccw.sh" << 'EOF'
#!/bin/bash
pactl set-sink-volume @DEFAULT_SINK@ -5%
EOF

cat > "$ACTIONS_DIR/dials/dial-3-press.sh" << 'EOF'
#!/bin/bash
pactl set-sink-mute @DEFAULT_SINK@ toggle
EOF

cat > "$ACTIONS_DIR/dials/dial-3-longpress.sh" << 'EOF'
#!/bin/bash
pavucontrol &
EOF

chmod +x "$ACTIONS_DIR/dials/dial-3-cw.sh"
chmod +x "$ACTIONS_DIR/dials/dial-3-ccw.sh"
chmod +x "$ACTIONS_DIR/dials/dial-3-press.sh"
chmod +x "$ACTIONS_DIR/dials/dial-3-longpress.sh"

echo "Setting up Touch Zone 3 for volume display..."

GENERATOR="$ACTIONS_DIR/generate-volume-image.py"
if [ ! -f "$GENERATOR" ]; then
    cp "$SCRIPT_DIR/generate-volume-image.py" "$GENERATOR"
    chmod +x "$GENERATOR"
fi

cat > "$ACTIONS_DIR/touchscreen/touch-3.sh" << 'EOF'
#!/bin/bash
pactl set-sink-mute @DEFAULT_SINK@ toggle
EOF
chmod +x "$ACTIONS_DIR/touchscreen/touch-3.sh"

cat > "$ACTIONS_DIR/touchscreen/touch-3-swipe-up.sh" << 'EOF'
#!/bin/bash
pactl set-sink-volume @DEFAULT_SINK@ +10%
EOF
chmod +x "$ACTIONS_DIR/touchscreen/touch-3-swipe-up.sh"

cat > "$ACTIONS_DIR/touchscreen/touch-3-swipe-down.sh" << 'EOF'
#!/bin/bash
pactl set-sink-volume @DEFAULT_SINK@ -10%
EOF
chmod +x "$ACTIONS_DIR/touchscreen/touch-3-swipe-down.sh"

cat > "$ACTIONS_DIR/volume-listener-zone3.sh" << 'EOF'
#!/bin/bash
ACTIONS_DIR="$HOME/streamdeck-actions"
TOUCH_IMAGE="$ACTIONS_DIR/touchscreen/touch-3.png"
GENERATOR="$ACTIONS_DIR/generate-volume-image.py"

get_volume() {
    pactl get-sink-volume @DEFAULT_SINK@ 2>/dev/null | grep -oP '\d+%' | head -1 | tr -d '%'
}

is_muted() {
    pactl get-sink-mute @DEFAULT_SINK@ 2>/dev/null | grep -q "yes"
}

update_volume_display() {
    local volume=$(get_volume)
    [ -z "$volume" ] && volume=0
    
    if is_muted; then
        python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE" muted
    else
        python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE"
    fi
}

update_volume_display

if command -v pactl &> /dev/null; then
    pactl subscribe 2>/dev/null | while read -r event; do
        if echo "$event" | grep -qE "sink|server"; then
            update_volume_display
        fi
    done
else
    while true; do
        update_volume_display
        sleep 2
    done
fi
EOF
chmod +x "$ACTIONS_DIR/volume-listener-zone3.sh"

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "What was configured:"
echo ""
echo "  DIAL 3:"
echo "    - Rotate CW:    Volume +5%"
echo "    - Rotate CCW:   Volume -5%"
echo "    - Press:        Toggle mute"
echo "    - Long press:   Open pavucontrol"
echo ""
echo "  TOUCH ZONE 3:"
echo "    - Displays:     Current volume bar"
echo "    - Tap:          Toggle mute"
echo "    - Swipe up:     Volume +10%"
echo "    - Swipe down:   Volume -10%"
echo ""
echo "============================================"
echo "  HOW TO RUN"
echo "============================================"
echo ""
echo "1. Start the daemon (in terminal 1):"
echo "   cd $ACTIONS_DIR && ./streamdeck-daemon.py"
echo ""
echo "2. Start volume listener (in terminal 2):"
echo "   $ACTIONS_DIR/volume-listener-zone3.sh"
echo ""
echo "Or run both together:"
echo "   $SCRIPT_DIR/run-volume-test.sh"
echo ""
