#!/bin/bash
# Deploy Power User Configuration
# Sets up buttons, dials, and touch zones for Ubuntu power users

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
ACTIONS_DIR="$SCRIPT_DIR"

echo "🚀 Deploying Power User Configuration..."

# Create directories
mkdir -p "$ACTIONS_DIR/buttons" "$ACTIONS_DIR/dials" "$ACTIONS_DIR/touchscreen"

# Copy generator scripts
cp "$SCRIPT_DIR/examples/power-user/generate-uptime-image.py" "$ACTIONS_DIR/buttons/"
cp "$SCRIPT_DIR/examples/power-user/generate-sysinfo-image.py" "$ACTIONS_DIR/buttons/"
chmod +x "$ACTIONS_DIR/buttons/"*.py

# ============= BUTTONS =============
echo "📱 Setting up buttons..."

# Button 1: Site Uptime Monitor
cat > "$ACTIONS_DIR/buttons/button-1.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
notify-send "Uptime Check" "Checking sites..." -t 1500
python3 generate-uptime-image.py
notify-send "Uptime Check" "Status updated!" -t 1500
EOF
echo "UPTIME" > "$ACTIONS_DIR/buttons/button-1.txt"

# Button 2: System Stats
cat > "$ACTIONS_DIR/buttons/button-2.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
python3 generate-sysinfo-image.py
EOF
echo "SYSTEM" > "$ACTIONS_DIR/buttons/button-2.txt"

# Button 3: htop
cat > "$ACTIONS_DIR/buttons/button-3.sh" << 'EOF'
#!/bin/bash
gnome-terminal --geometry=120x40 -- htop
EOF
echo "HTOP" > "$ACTIONS_DIR/buttons/button-3.txt"

# Button 4: Screenshot
cat > "$ACTIONS_DIR/buttons/button-4.sh" << 'EOF'
#!/bin/bash
flameshot gui --clipboard
EOF
echo "SCREEN" > "$ACTIONS_DIR/buttons/button-4.txt"

# Button 5: File Manager
cat > "$ACTIONS_DIR/buttons/button-5.sh" << 'EOF'
#!/bin/bash
nautilus --new-window ~ &
EOF
echo "FILES" > "$ACTIONS_DIR/buttons/button-5.txt"

# Button 6: Mute Toggle (works with PipeWire/wpctl and PulseAudio/pactl)
cat > "$ACTIONS_DIR/buttons/button-6.sh" << 'EOF'
#!/bin/bash
if command -v wpctl &>/dev/null; then
    wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle
    MUTED=$(wpctl get-volume @DEFAULT_AUDIO_SINK@ | grep -o "MUTED")
    [ -n "$MUTED" ] && notify-send "Volume" "Muted" -t 1000 || notify-send "Volume" "Unmuted" -t 1000
else
    pactl set-sink-mute @DEFAULT_SINK@ toggle
    MUTED=$(pactl get-sink-mute @DEFAULT_SINK@ | grep -o "yes\|no")
    [ "$MUTED" = "yes" ] && notify-send "Volume" "Muted" -t 1000 || notify-send "Volume" "Unmuted" -t 1000
fi
EOF
echo "MUTE" > "$ACTIONS_DIR/buttons/button-6.txt"

# Button 7: VS Code
cat > "$ACTIONS_DIR/buttons/button-7.sh" << 'EOF'
#!/bin/bash
code .
EOF
echo "CODE" > "$ACTIONS_DIR/buttons/button-7.txt"

# Button 8: Lock Screen
cat > "$ACTIONS_DIR/buttons/button-8.sh" << 'EOF'
#!/bin/bash
gnome-screensaver-command -l 2>/dev/null || loginctl lock-session
EOF
echo "LOCK" > "$ACTIONS_DIR/buttons/button-8.txt"

chmod +x "$ACTIONS_DIR/buttons/"*.sh

# ============= DIALS =============
echo "🎛️  Setting up dials..."

# Dial 1: Volume (PipeWire/wpctl + PulseAudio/pactl fallback)
cat > "$ACTIONS_DIR/dials/dial-1-cw.sh" << 'EOF'
#!/bin/bash
wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+ 2>/dev/null || pactl set-sink-volume @DEFAULT_SINK@ +5%
EOF
cat > "$ACTIONS_DIR/dials/dial-1-ccw.sh" << 'EOF'
#!/bin/bash
wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%- 2>/dev/null || pactl set-sink-volume @DEFAULT_SINK@ -5%
EOF
cat > "$ACTIONS_DIR/dials/dial-1-press.sh" << 'EOF'
#!/bin/bash
wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle 2>/dev/null || pactl set-sink-mute @DEFAULT_SINK@ toggle
EOF
cat > "$ACTIONS_DIR/dials/dial-1-longpress.sh" << 'EOF'
#!/bin/bash
pavucontrol 2>/dev/null || systemsettings kcm_pulseaudio 2>/dev/null || gnome-control-center sound &
EOF

# Dial 2: Brightness
cat > "$ACTIONS_DIR/dials/dial-2-cw.sh" << 'EOF'
#!/bin/bash
brightnessctl set +10% 2>/dev/null || xbacklight -inc 10
EOF
cat > "$ACTIONS_DIR/dials/dial-2-ccw.sh" << 'EOF'
#!/bin/bash
brightnessctl set 10%- 2>/dev/null || xbacklight -dec 10
EOF
cat > "$ACTIONS_DIR/dials/dial-2-press.sh" << 'EOF'
#!/bin/bash
brightnessctl set 50% 2>/dev/null || xbacklight -set 50
EOF
cat > "$ACTIONS_DIR/dials/dial-2-longpress.sh" << 'EOF'
#!/bin/bash
gnome-control-center display &
EOF

# Dial 3: Workspaces
cat > "$ACTIONS_DIR/dials/dial-3-cw.sh" << 'EOF'
#!/bin/bash
xdotool key super+Page_Down
EOF
cat > "$ACTIONS_DIR/dials/dial-3-ccw.sh" << 'EOF'
#!/bin/bash
xdotool key super+Page_Up
EOF
cat > "$ACTIONS_DIR/dials/dial-3-press.sh" << 'EOF'
#!/bin/bash
xdotool key super
EOF
cat > "$ACTIONS_DIR/dials/dial-3-longpress.sh" << 'EOF'
#!/bin/bash
xdotool key super+a
EOF

# Dial 4: Media
cat > "$ACTIONS_DIR/dials/dial-4-cw.sh" << 'EOF'
#!/bin/bash
xdotool key XF86AudioNext
EOF
cat > "$ACTIONS_DIR/dials/dial-4-ccw.sh" << 'EOF'
#!/bin/bash
xdotool key XF86AudioPrev
EOF
cat > "$ACTIONS_DIR/dials/dial-4-press.sh" << 'EOF'
#!/bin/bash
xdotool key XF86AudioPlay
EOF
cat > "$ACTIONS_DIR/dials/dial-4-longpress.sh" << 'EOF'
#!/bin/bash
spotify &
EOF

chmod +x "$ACTIONS_DIR/dials/"*.sh

# ============= TOUCHSCREEN =============
echo "📺 Setting up touchscreen zones..."

# Zone 1: Chrome
cat > "$ACTIONS_DIR/touchscreen/touch-1.sh" << 'EOF'
#!/bin/bash
google-chrome &
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-1-longpress.sh" << 'EOF'
#!/bin/bash
google-chrome --incognito &
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-1-swipe-up.sh" << 'EOF'
#!/bin/bash
xdotool key ctrl+t
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-1-swipe-down.sh" << 'EOF'
#!/bin/bash
xdotool key ctrl+w
EOF
echo "CHROME" > "$ACTIONS_DIR/touchscreen/touch-1.txt"

# Zone 2: Terminal
cat > "$ACTIONS_DIR/touchscreen/touch-2.sh" << 'EOF'
#!/bin/bash
gnome-terminal &
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-2-longpress.sh" << 'EOF'
#!/bin/bash
gnome-terminal --geometry=140x50 -- tmux new-session -A -s main
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-2-swipe-up.sh" << 'EOF'
#!/bin/bash
xdotool key ctrl+shift+t
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-2-swipe-down.sh" << 'EOF'
#!/bin/bash
xdotool key ctrl+shift+w
EOF
echo "TERM" > "$ACTIONS_DIR/touchscreen/touch-2.txt"

# Zone 3: Docker
cat > "$ACTIONS_DIR/touchscreen/touch-3.sh" << 'EOF'
#!/bin/bash
gnome-terminal --geometry=100x30 -- bash -c "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20; read -p 'Press enter...'"
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-3-longpress.sh" << 'EOF'
#!/bin/bash
gnome-terminal -- bash -c "docker-compose logs -f --tail=100"
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-3-swipe-up.sh" << 'EOF'
#!/bin/bash
docker-compose up -d && notify-send "Docker" "Started" -t 2000
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-3-swipe-down.sh" << 'EOF'
#!/bin/bash
docker-compose down && notify-send "Docker" "Stopped" -t 2000
EOF
echo "DOCKER" > "$ACTIONS_DIR/touchscreen/touch-3.txt"

# Zone 4: System
cat > "$ACTIONS_DIR/touchscreen/touch-4.sh" << 'EOF'
#!/bin/bash
gnome-control-center &
EOF
cat > "$ACTIONS_DIR/touchscreen/touch-4-longpress.sh" << 'EOF'
#!/bin/bash
gnome-system-monitor &
EOF
echo "SYSTEM" > "$ACTIONS_DIR/touchscreen/touch-4.txt"

# Long swipes
cat > "$ACTIONS_DIR/touchscreen/longswipe-left.sh" << 'EOF'
#!/bin/bash
xdotool key alt+Tab
EOF
cat > "$ACTIONS_DIR/touchscreen/longswipe-right.sh" << 'EOF'
#!/bin/bash
xdotool key alt+shift+Tab
EOF

chmod +x "$ACTIONS_DIR/touchscreen/"*.sh

# Generate initial images
echo "🖼️  Generating button images..."
cd "$ACTIONS_DIR/buttons"
python3 generate-uptime-image.py 2>/dev/null
python3 generate-sysinfo-image.py 2>/dev/null

echo ""
echo "✅ Power User configuration deployed!"
echo ""
echo "📋 Button Layout:"
echo "   [1] Uptime Monitor  [2] System Stats"
echo "   [3] htop            [4] Screenshot"
echo "   [5] Files           [6] Mute Toggle"
echo "   [7] VS Code         [8] Lock Screen"
echo ""
echo "🎛️  Dial Functions:"
echo "   Dial 1: Volume (rotate) / Mute (press) / PulseAudio (long)"
echo "   Dial 2: Brightness (rotate) / 50% (press) / Display Settings (long)"
echo "   Dial 3: Workspaces (rotate) / Overview (press) / App Grid (long)"
echo "   Dial 4: Media Track (rotate) / Play/Pause (press) / Spotify (long)"
echo ""
echo "📺 Touch Zones:"
echo "   [1] Chrome     - tap: open, long: incognito, swipe: new/close tab"
echo "   [2] Terminal   - tap: open, long: tmux, swipe: new/close tab"
echo "   [3] Docker     - tap: ps, long: logs, swipe: up/down containers"
echo "   [4] System     - tap: settings, long: monitor"
echo ""
echo "🔄 Restart daemon: pkill -f streamdeck-daemon && ./start"
