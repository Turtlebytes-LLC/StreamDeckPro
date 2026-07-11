#!/bin/bash
#
# sdp-helpers.sh - sourceable helpers for StreamDeckPro action scripts.
#
# Source it from an action script:
#     source "$(dirname "$0")/../lib/sdp-helpers.sh"
# or rely on the SDP_HOME env var the daemon exports:
#     source "$SDP_HOME/lib/sdp-helpers.sh"
#
# Provides: sdp_notify, sdp_set_image, sdp_set_label, sdp_state_get,
#           sdp_state_set, sdp_toggle, sdp_log, sdp_active_profile,
#           sdp_profile_root, sdp_list_profiles, sdp_switch_profile,
#           sdp_cycle_profile

# Repo root (honours SDP_HOME exported by the daemon).
SDP_HOME="${SDP_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# Persistent key-value state directory.
SDP_STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/streamdeckpro"

# sdp_active_profile - name in .profile, or "default" when absent/empty.
sdp_active_profile() {
    local name=""
    [ -f "$SDP_HOME/.profile" ] && name="$(tr -d '[:space:]' < "$SDP_HOME/.profile")"
    [ -n "$name" ] && echo "$name" || echo "default"
}

# sdp_profile_root - element dir root for the active profile.
sdp_profile_root() {
    local name
    name="$(sdp_active_profile)"
    if [ "$name" = "default" ] || [ ! -d "$SDP_HOME/profiles/$name" ]; then
        echo "$SDP_HOME"
    else
        echo "$SDP_HOME/profiles/$name"
    fi
}

# Map an element name (button-3, touch-1, dial-2, longswipe-left) to its dir,
# resolved against the active profile.
_sdp_element_dir() {
    local root
    root="$(sdp_profile_root)"
    case "$1" in
        button-*)            echo "$root/buttons" ;;
        dial-*)              echo "$root/dials" ;;
        touch-*|longswipe-*) echo "$root/touchscreen" ;;
        *)                   echo "$root/buttons" ;;
    esac
}

# sdp_list_profiles - "default" plus each dir under profiles/, one per line.
sdp_list_profiles() {
    echo "default"
    [ -d "$SDP_HOME/profiles" ] && find "$SDP_HOME/profiles" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
}

# sdp_switch_profile <name> - make <name> the active profile (daemon reloads).
sdp_switch_profile() {
    local name="$1"
    printf '%s' "$name" > "$SDP_HOME/.profile"
    sdp_log "switched to profile: $name"
}

# sdp_cycle_profile [prev] - advance to the next profile (or previous).
sdp_cycle_profile() {
    local dir="${1:-next}" cur profiles idx count target
    cur="$(sdp_active_profile)"
    mapfile -t profiles < <(sdp_list_profiles)
    count="${#profiles[@]}"
    [ "$count" -le 1 ] && return 0
    idx=0
    for i in "${!profiles[@]}"; do
        [ "${profiles[$i]}" = "$cur" ] && idx="$i" && break
    done
    if [ "$dir" = "prev" ]; then
        target=$(( (idx - 1 + count) % count ))
    else
        target=$(( (idx + 1) % count ))
    fi
    sdp_switch_profile "${profiles[$target]}"
}

# sdp_notify <title> <body> - desktop notification (falls back to echo).
sdp_notify() {
    local title="$1" body="${2:-}"
    if command -v notify-send >/dev/null 2>&1; then
        notify-send "$title" "$body" -t 2000
    else
        echo "[notify] $title: $body"
    fi
}

# sdp_set_image <element> <path> - set a button/zone image.
sdp_set_image() {
    local element="$1" src="$2"
    local dir
    dir="$(_sdp_element_dir "$element")"
    mkdir -p "$dir"
    cp -f "$src" "$dir/${element}.png"
}

# sdp_set_label <element> <text> - set an element text label.
sdp_set_label() {
    local element="$1" text="$2"
    local dir
    dir="$(_sdp_element_dir "$element")"
    mkdir -p "$dir"
    printf '%s' "$text" > "$dir/${element}.txt"
}

# sdp_state_get <key> - print stored value (empty if unset).
sdp_state_get() {
    local key="$1"
    local file="$SDP_STATE_DIR/$key"
    [ -f "$file" ] && cat "$file" || true
}

# sdp_state_set <key> <value> - persist a value.
sdp_state_set() {
    local key="$1" value="$2"
    mkdir -p "$SDP_STATE_DIR"
    printf '%s' "$value" > "$SDP_STATE_DIR/$key"
}

# sdp_toggle <key> - flip a boolean state key; echo the new value (on/off).
sdp_toggle() {
    local key="$1" cur new
    cur="$(sdp_state_get "$key")"
    if [ "$cur" = "on" ]; then new="off"; else new="on"; fi
    sdp_state_set "$key" "$new"
    echo "$new"
}

# sdp_log <msg> - timestamped line to the daemon journal namespace.
sdp_log() {
    local msg="$*"
    local ts
    ts="$(date '+%Y-%m-%d %H:%M:%S')"
    if command -v logger >/dev/null 2>&1; then
        logger -t streamdeckpro -- "$msg"
    fi
    echo "$ts streamdeckpro: $msg" >&2
}
