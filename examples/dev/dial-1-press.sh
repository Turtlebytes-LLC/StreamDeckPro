#!/bin/bash
# Dial 1 press - Toggle macro recording or replay macro (xdotool-based)

STATE_FILE="/tmp/streamdeck-dial1-state"
MACRO_FILE="/tmp/streamdeck-dial1-macro.sh"
MACRO_EVENTS="/tmp/streamdeck-dial1-events.txt"
POSITION_FILE="/tmp/streamdeck-dial1-position"
RECORDING_PID_FILE="/tmp/streamdeck-dial1-recording-pid"
DEBUG_LOG="/tmp/streamdeck-dial1-debug.log"

# Debug function
debug() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$DEBUG_LOG"
}

# Initialize state if doesn't exist
if [ ! -f "$STATE_FILE" ]; then
    echo "idle" > "$STATE_FILE"
fi

STATE=$(cat "$STATE_FILE")
debug "Current state: $STATE"

if [ "$STATE" = "idle" ]; then
    # Start recording
    debug "Starting xdotool-based recording..."
    echo "recording" > "$STATE_FILE"
    rm -f "$MACRO_FILE" "$MACRO_EVENTS"
    echo "0" > "$POSITION_FILE"

    # Create header for macro script
    cat > "$MACRO_FILE" << 'EOFHEADER'
#!/bin/bash
# Recorded macro - replay with xdotool
sleep 0.3
EOFHEADER
    chmod +x "$MACRO_FILE"

    # Get keyboard device ID - prefer actual hardware keyboard
    KB_ID=$(xinput list | grep "CORSAIR" | grep "slave  keyboard" | grep -oP 'id=\K\d+' | head -1)

    # Fallback to AT Translated keyboard if Corsair not found
    if [ -z "$KB_ID" ]; then
        KB_ID=$(xinput list | grep "AT Translated" | grep "slave  keyboard" | grep -oP 'id=\K\d+' | head -1)
    fi

    # Last resort - any slave keyboard
    if [ -z "$KB_ID" ]; then
        KB_ID=$(xinput list | grep "slave  keyboard" | grep -oP 'id=\K\d+' | head -1)
    fi

    debug "Keyboard ID: $KB_ID"

    # Start monitoring keyboard
    (
        declare -a modifiers_held=()
        last_output_time=0

        xinput test "$KB_ID" | while read -r line; do
            # Check if still recording
            [ "$(cat "$STATE_FILE" 2>/dev/null)" != "recording" ] && break

            # Parse key press events
            if echo "$line" | grep -q "key press"; then
                keycode=$(echo "$line" | grep -oP 'key press\s+\K\d+')

                # Get keysym - try column 4 first, then column 6 if empty
                keysym=$(xmodmap -pke | grep "keycode *$keycode " | awk '{print $4}')
                if [ -z "$keysym" ] || [ "$keysym" = "NoSymbol" ]; then
                    keysym=$(xmodmap -pke | grep "keycode *$keycode " | awk '{print $6}')
                fi

                # Skip if still empty or NoSymbol
                if [ -z "$keysym" ] || [ "$keysym" = "NoSymbol" ]; then
                    debug "Skipping keycode $keycode - no keysym found"
                    continue
                fi

                debug "Key pressed: $keysym (code: $keycode)"

                # Check if this is a modifier key
                if [[ "$keysym" =~ ^(Control_L|Control_R|Shift_L|Shift_R|Alt_L|Alt_R|Super_L|Super_R)$ ]]; then
                    # It's a modifier - add to modifiers list
                    modifiers_held+=("$keysym")
                    debug "Modifier held: $keysym, total modifiers: ${#modifiers_held[@]}"
                else
                    # Regular key pressed
                    if [ ${#modifiers_held[@]} -gt 0 ]; then
                        # Build combo: modifiers+key
                        combo="${modifiers_held[*]}+$keysym"
                        combo=$(echo "$combo" | tr ' ' '+')
                    else
                        # No modifiers, just the key
                        combo="$keysym"
                    fi

                    debug "Outputting key combo: $combo"

                    # If there are modifiers, use keydown/keyup for better reliability
                    if [ ${#modifiers_held[@]} -gt 0 ]; then
                        # Press down all modifiers
                        for mod in "${modifiers_held[@]}"; do
                            echo "xdotool keydown $mod" >> "$MACRO_FILE"
                        done
                        # Press and release the main key
                        echo "xdotool key $keysym" >> "$MACRO_FILE"
                        # Release all modifiers
                        for mod in "${modifiers_held[@]}"; do
                            echo "xdotool keyup $mod" >> "$MACRO_FILE"
                        done
                    else
                        # No modifiers, just press the key
                        echo "xdotool key $keysym" >> "$MACRO_FILE"
                    fi

                    echo "sleep 0.05" >> "$MACRO_FILE"  # Small delay between keys
                    echo "$combo" >> "$MACRO_EVENTS"
                fi

            # Parse key release events
            elif echo "$line" | grep -q "key release"; then
                keycode=$(echo "$line" | grep -oP 'key release\s+\K\d+')

                # Get keysym - try column 4 first, then column 6 if empty
                keysym=$(xmodmap -pke | grep "keycode *$keycode " | awk '{print $4}')
                if [ -z "$keysym" ] || [ "$keysym" = "NoSymbol" ]; then
                    keysym=$(xmodmap -pke | grep "keycode *$keycode " | awk '{print $6}')
                fi

                # Check if releasing a modifier
                if [[ "$keysym" =~ ^(Control_L|Control_R|Shift_L|Shift_R|Alt_L|Alt_R|Super_L|Super_R)$ ]]; then
                    # Remove from modifiers list
                    for i in "${!modifiers_held[@]}"; do
                        if [[ "${modifiers_held[$i]}" == "$keysym" ]]; then
                            unset 'modifiers_held[$i]'
                            modifiers_held=("${modifiers_held[@]}") # reindex array
                            break
                        fi
                    done
                    debug "Modifier released: $keysym, remaining: ${#modifiers_held[@]}"
                fi
            fi
        done
    ) &

    echo $! > "$RECORDING_PID_FILE"
    debug "Recording started with PID: $(cat "$RECORDING_PID_FILE")"
    notify-send "Macro Recording" "🔴 Recording keyboard - press dial to stop" -t 2000

elif [ "$STATE" = "recording" ]; then
    # Stop recording
    debug "Stopping recording..."
    echo "recorded" > "$STATE_FILE"

    # Kill the recording process
    if [ -f "$RECORDING_PID_FILE" ]; then
        PID=$(cat "$RECORDING_PID_FILE")
        debug "Killing recording process PID: $PID"
        kill $PID 2>/dev/null
        sleep 0.3
        rm "$RECORDING_PID_FILE"
    fi

    # Count recorded events
    if [ -f "$MACRO_EVENTS" ] && [ -s "$MACRO_EVENTS" ]; then
        event_count=$(wc -l < "$MACRO_EVENTS")
        debug "Recorded $event_count key events"
        notify-send "Macro Recording" "⏹️ Stopped - recorded $event_count keys" -t 2000
    else
        debug "WARNING: No events recorded!"
        notify-send "Macro Recording" "⚠️ No keys recorded" -t 2000
    fi

elif [ "$STATE" = "recorded" ]; then
    # Replay macro
    debug "Attempting to replay macro..."

    if [ ! -f "$MACRO_FILE" ] || [ ! -s "$MACRO_FILE" ]; then
        debug "ERROR: Macro file doesn't exist or is empty!"
        notify-send "Macro Playback" "❌ No macro to play" -t 1000
        exit 1
    fi

    # Reset position to 0 before replaying (start from beginning)
    echo "0" > "$POSITION_FILE"
    debug "Reset position to 0 for full playback"

    # Count lines (subtract header)
    LINES=$(($(wc -l < "$MACRO_FILE") - 2))
    debug "Replaying macro: $LINES commands"

    notify-send "Macro Playback" "▶️ Playing $LINES keys..." -t 1000
    sleep 0.3  # Small delay before playback

    # Execute the macro script
    bash "$MACRO_FILE" 2>> "$DEBUG_LOG"
    RESULT=$?
    debug "Macro playback exit code: $RESULT"

    notify-send "Macro Playback" "✓ Playback complete" -t 1000
fi

debug "Script completed. State: $(cat "$STATE_FILE")"
