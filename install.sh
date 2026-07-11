#!/bin/bash
#
# StreamDeckPro installer - one script for setup, autostart, listeners, and diagnostics.
#
#   ./install.sh              guided setup (interactive)
#   ./install.sh all --yes    full non-interactive setup
#   ./install.sh deps         install python dependencies
#   ./install.sh udev         install USB udev rules (needs sudo)
#   ./install.sh autostart    enable login autostart (systemd user unit only)
#   ./install.sh listeners    install status-listener units
#   ./install.sh doctor       diagnose without changing anything
#   ./install.sh uninstall    remove autostart, listeners, and legacy units
#   ./install.sh help         show this help
#
set -u

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
AUTOSTART_DIR="$HOME/.config/autostart"
UDEV_RULES_FILE="/etc/udev/rules.d/70-streamdeck.rules"
DESKTOP_ENTRY="$AUTOSTART_DIR/streamdeck.desktop"
SERVICE_FILE="$SYSTEMD_USER_DIR/streamdeck.service"
LISTENER_TEMPLATE="$SYSTEMD_USER_DIR/streamdeck-listener@.service"

# Default listener instances installed by `listeners` / guided setup.
DEFAULT_LISTENERS="cpu:4"

ASSUME_YES=0

# --- output helpers ----------------------------------------------------------

if [ -t 1 ]; then
    C_GREEN=$'\033[0;32m'; C_RED=$'\033[0;31m'; C_YELLOW=$'\033[0;33m'
    C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
    C_GREEN=; C_RED=; C_YELLOW=; C_BOLD=; C_RESET=
fi

pass() { echo "  ${C_GREEN}PASS${C_RESET} $1"; }
fail() { echo "  ${C_RED}FAIL${C_RESET} $1"; }
warn() { echo "  ${C_YELLOW}WARN${C_RESET} $1"; }
info() { echo "$1"; }
step() { echo ""; echo "${C_BOLD}$1${C_RESET}"; }

# ask <prompt> -> returns 0 for yes, 1 for no. Non-interactive yes with --yes.
ask() {
    local prompt="$1"
    if [ "$ASSUME_YES" -eq 1 ]; then
        return 0
    fi
    local reply
    read -r -p "$prompt [y/N] " reply
    case "$reply" in
        [yY]|[yY][eE][sS]) return 0 ;;
        *) return 1 ;;
    esac
}

# --- checks ------------------------------------------------------------------

deps_ok() {
    python3 -c "import StreamDeck, PIL" >/dev/null 2>&1
}

udev_ok() {
    [ -f "$UDEV_RULES_FILE" ]
}

device_visible() {
    lsusb 2>/dev/null | grep -q "0fd9"
}

daemon_running() {
    pgrep -f "streamdeckpro" >/dev/null 2>&1 || pgrep -f "streamdeck-daemon.py" >/dev/null 2>&1
}

# --- actions -----------------------------------------------------------------

do_deps() {
    step "Installing Python dependencies"
    if deps_ok; then
        pass "StreamDeck and Pillow already importable"
        return 0
    fi
    info "Running: python3 -m pip install --user streamdeck pillow"
    if python3 -m pip install --user streamdeck pillow; then
        pass "dependencies installed"
    else
        fail "pip install failed - on externally-managed Python try: python3 -m pip install --user --break-system-packages streamdeck pillow"
        return 1
    fi
}

do_udev() {
    step "Installing USB udev rules (requires sudo)"
    if [ "$(id -u)" -ne 0 ]; then
        info "Elevating with sudo..."
        sudo bash "$0" _udev_root "$USER"
        return $?
    fi
    _udev_root "$SUDO_USER"
}

_udev_root() {
    local target_user="${1:-$SUDO_USER}"
    [ -z "$target_user" ] && target_user="$USER"

    if ! getent group plugdev >/dev/null 2>&1; then
        groupadd plugdev
    fi
    if ! id -nG "$target_user" | grep -qw plugdev; then
        usermod -a -G plugdev "$target_user"
        info "Added $target_user to plugdev (log out/in for it to take effect)"
    fi

    cat > "$UDEV_RULES_FILE" << 'EOF'
# Elgato Stream Deck devices - allow plugdev group access (vendor 0fd9)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev", TAG+="uaccess"
EOF

    udevadm control --reload-rules
    udevadm trigger
    chmod 666 /dev/hidraw* 2>/dev/null || true
    pass "udev rules installed at $UDEV_RULES_FILE"
}

do_autostart() {
    step "Configuring login autostart (systemd user unit only)"
    mkdir -p "$SYSTEMD_USER_DIR"

    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Stream Deck Daemon
After=graphical-session.target
Wants=graphical-session.target

[Service]
Type=simple
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/python3 -m streamdeckpro
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF
    pass "installed $SERVICE_FILE"

    # Remove the legacy desktop-entry autostart so only one instance launches.
    if [ -f "$DESKTOP_ENTRY" ]; then
        rm -f "$DESKTOP_ENTRY"
        pass "removed legacy desktop autostart entry"
    fi

    # Import the live session environment so notifications/display work.
    systemctl --user import-environment DISPLAY WAYLAND_DISPLAY XAUTHORITY \
        DBUS_SESSION_BUS_ADDRESS XDG_RUNTIME_DIR 2>/dev/null || true

    systemctl --user daemon-reload
    systemctl --user enable streamdeck.service
    pass "autostart enabled (start now with: systemctl --user start streamdeck.service)"
}

do_listeners() {
    step "Installing status-listener units"
    mkdir -p "$SYSTEMD_USER_DIR"

    sed "s#/home/[^ ]*/listeners/status-listener.sh#$SCRIPT_DIR/listeners/status-listener.sh#" \
        "$SCRIPT_DIR/listeners/streamdeck-listener@.service" > "$LISTENER_TEMPLATE"
    pass "installed $LISTENER_TEMPLATE"

    systemctl --user daemon-reload
    for inst in $DEFAULT_LISTENERS; do
        systemctl --user enable --now "streamdeck-listener@${inst}.service" 2>/dev/null \
            && pass "enabled streamdeck-listener@${inst}" \
            || warn "could not enable streamdeck-listener@${inst}"
    done
    info "Enable more with: systemctl --user enable --now streamdeck-listener@volume:1.service"
}

do_uninstall() {
    step "Removing autostart, listeners, and legacy units"

    systemctl --user disable --now streamdeck.service 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    rm -f "$DESKTOP_ENTRY"
    pass "removed daemon autostart"

    # Disable any enabled listener instances and the template.
    for unit in $(systemctl --user list-units --all --no-legend 'streamdeck-listener@*' 2>/dev/null | awk '{print $1}'); do
        systemctl --user disable --now "$unit" 2>/dev/null || true
    done
    rm -f "$LISTENER_TEMPLATE"

    # Legacy pre-phase-1 listener units.
    systemctl --user disable --now volume-status-listener mute-status-listener 2>/dev/null || true

    systemctl --user daemon-reload
    pass "uninstall complete (udev rules left in place; remove manually if desired)"
}

do_doctor() {
    echo "${C_BOLD}StreamDeckPro doctor${C_RESET}"
    local failures=0

    step "1. Python dependencies"
    if deps_ok; then pass "StreamDeck + Pillow importable"
    else fail "missing - fix: ./install.sh deps"; failures=$((failures+1)); fi

    step "2. USB udev rules"
    if udev_ok; then pass "$UDEV_RULES_FILE present"
    else fail "not installed - fix: ./install.sh udev"; failures=$((failures+1)); fi

    step "3. Elgato device on USB"
    if device_visible; then pass "device visible (vendor 0fd9)"
    else warn "no Elgato device on USB - plug it in"; fi

    step "4. Device accessible"
    if daemon_running; then
        pass "a running daemon currently holds the device"
    elif device_visible; then
        if python3 - "$SCRIPT_DIR" << 'PYEOF' >/dev/null 2>&1
import sys
from StreamDeck.DeviceManager import DeviceManager
decks = DeviceManager().enumerate()
if not decks:
    sys.exit(1)
d = decks[0]; d.open(); d.close()
PYEOF
        then pass "device opens cleanly"
        else fail "device present but cannot open - fix: ./install.sh udev then replug"; failures=$((failures+1)); fi
    else
        warn "skipped (no device attached)"
    fi

    step "5. Daemon status"
    if daemon_running; then pass "daemon is running"
    else info "  daemon not running (start with: ./start or systemctl --user start streamdeck.service)"; fi

    step "6. Autostart configuration"
    if systemctl --user is-enabled streamdeck.service >/dev/null 2>&1; then
        pass "systemd autostart enabled"
    else
        info "  autostart not enabled (enable with: ./install.sh autostart)"
    fi
    if [ -f "$DESKTOP_ENTRY" ]; then
        fail "stale desktop autostart entry (double-launch risk) - fix: ./install.sh autostart"
        failures=$((failures+1))
    else
        pass "no stale desktop autostart entry"
    fi

    step "7. Legacy listener units"
    if systemctl --user list-unit-files 'volume-status-listener*' 'mute-status-listener*' --no-legend 2>/dev/null | grep -q .; then
        fail "stale legacy listener units present - fix: ./install.sh uninstall"
        failures=$((failures+1))
    else
        pass "no stale legacy listener units"
    fi

    echo ""
    if [ "$failures" -eq 0 ]; then
        echo "${C_GREEN}All checks passed.${C_RESET}"
        return 0
    fi
    echo "${C_RED}$failures check(s) failed - run the suggested fixes above.${C_RESET}"
    return 1
}

do_guided() {
    echo "${C_BOLD}=== StreamDeckPro guided setup ===${C_RESET}"
    info "Each step asks before changing anything. Press Enter to skip."

    step "Step 1/5: Python dependencies"
    if deps_ok; then
        pass "already installed"
    elif ask "Install StreamDeck + Pillow via pip?"; then
        do_deps
    else
        warn "skipped"
    fi

    step "Step 2/5: USB udev rules"
    if udev_ok; then
        pass "already installed"
    elif ask "Install udev rules (needs sudo)?"; then
        do_udev
    else
        warn "skipped"
    fi

    step "Step 3/5: Device check"
    if device_visible; then pass "Elgato device detected"; else warn "no device detected (you can attach it later)"; fi

    step "Step 4/5: Login autostart"
    if ask "Enable autostart at login (systemd user unit)?"; then
        do_autostart
    else
        warn "skipped"
    fi

    step "Step 5/5: Status listeners"
    if ask "Install status-listener units ($DEFAULT_LISTENERS)?"; then
        do_listeners
    else
        warn "skipped"
    fi

    echo ""
    echo "${C_BOLD}Setup finished. Run './install.sh doctor' any time to check health.${C_RESET}"
}

# --- profiles ----------------------------------------------------------------

# do_profile [list|create <name>|use <name>] - manage layout profiles.
# The 'default' profile is the legacy top-level buttons/dials/touchscreen dirs;
# named profiles live under profiles/<name>/ with the same structure.
do_profile() {
    local action="${1:-list}"
    local name="${2:-}"
    local profiles_dir="$SCRIPT_DIR/profiles"
    local profile_file="$SCRIPT_DIR/.profile"

    case "$action" in
        list)
            step "Profiles"
            local active="default"
            [ -f "$profile_file" ] && active="$(tr -d '[:space:]' < "$profile_file")"
            [ -z "$active" ] && active="default"
            local marker
            for p in default $( [ -d "$profiles_dir" ] && find "$profiles_dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort ); do
                if [ "$p" = "$active" ]; then marker="* "; else marker="  "; fi
                info "$marker$p"
            done
            ;;
        create)
            [ -z "$name" ] && { fail "usage: ./install.sh profile create <name>"; return 1; }
            [ "$name" = "default" ] && { fail "'default' is the top-level layout; pick another name"; return 1; }
            mkdir -p "$profiles_dir/$name/buttons" "$profiles_dir/$name/dials" "$profiles_dir/$name/touchscreen"
            pass "created profile '$name' at profiles/$name/"
            info "Switch to it with: ./install.sh profile use $name"
            ;;
        use)
            [ -z "$name" ] && { fail "usage: ./install.sh profile use <name>"; return 1; }
            if [ "$name" != "default" ] && [ ! -d "$profiles_dir/$name" ]; then
                fail "no such profile: $name (create it first)"; return 1
            fi
            printf '%s' "$name" > "$profile_file"
            pass "active profile is now '$name' (daemon hot-reloads)"
            ;;
        export)
            [ -z "$name" ] && { fail "usage: ./install.sh profile export <name> [file.sdpack]"; return 1; }
            python3 -m streamdeckpro.sharing export "$name" "${3:-$name.sdpack}"
            ;;
        import)
            [ -z "$name" ] && { fail "usage: ./install.sh profile import <file.sdpack> [--as name]"; return 1; }
            shift 2
            python3 -m streamdeckpro.sharing import "$name" "$@"
            ;;
        *)
            fail "unknown profile action: $action (use list|create|use|export|import)"; return 1 ;;
    esac
}

show_help() {
    cat << EOF
StreamDeckPro installer

Usage: ./install.sh [subcommand] [--yes]

Subcommands:
  (none)      guided interactive setup
  deps        install Python dependencies (streamdeck, pillow)
  udev        install USB udev rules (requires sudo)
  autostart   enable login autostart via a single systemd user unit
  listeners   install and enable status-listener units
  all         run deps, udev, autostart, listeners (use --yes for non-interactive)
  uninstall   remove autostart, listeners, and legacy units
  doctor      diagnose the setup without changing anything
  profile     manage layout profiles: profile [list|create <name>|use <name>|export <name>|import <file>]
  help        show this message
EOF
}

# --- dispatch ----------------------------------------------------------------

# Parse --yes anywhere.
ARGS=()
for a in "$@"; do
    if [ "$a" = "--yes" ] || [ "$a" = "-y" ]; then ASSUME_YES=1; else ARGS+=("$a"); fi
done
set -- ${ARGS+"${ARGS[@]}"}

CMD="${1:-}"
case "$CMD" in
    "")          do_guided ;;
    deps)        do_deps ;;
    udev)        do_udev ;;
    _udev_root)  shift; _udev_root "$@" ;;
    autostart)   do_autostart ;;
    listeners)   do_listeners ;;
    all)         do_deps; do_udev; do_autostart; do_listeners ;;
    uninstall)   do_uninstall ;;
    doctor)      do_doctor ;;
    profile)     shift; do_profile "$@" ;;
    help|-h|--help) show_help ;;
    *) echo "Unknown subcommand: $CMD" >&2; show_help; exit 1 ;;
esac
