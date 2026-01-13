#!/usr/bin/env python3
"""
Dial Macro Controller for Stream Deck
Allows stepping through macros with dial rotation
"""

import sys
import json
import subprocess
import os

class DialMacroController:
    def __init__(self, macro_file, state_file):
        self.macro_file = macro_file
        self.state_file = state_file
        self.events = []
        self.current_index = -1

        # Load macro
        if os.path.exists(macro_file):
            with open(macro_file, 'r') as f:
                self.events = json.load(f)
                # Filter out ESC key
                self.events = [e for e in self.events if e['key'] != 'esc']

        # Load state
        self.load_state()

    def load_state(self):
        """Load current playback position"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    self.current_index = data.get('current_index', -1)
            except:
                self.current_index = -1

    def save_state(self):
        """Save current playback position"""
        with open(self.state_file, 'w') as f:
            json.dump({'current_index': self.current_index}, f)

    def execute_event(self, event, reverse=False):
        """Execute a single event using xdotool"""
        key_map = {
            'ctrl': 'ctrl',
            'ctrl_l': 'Control_L',
            'ctrl_r': 'Control_R',
            'shift': 'shift',
            'shift_l': 'Shift_L',
            'shift_r': 'Shift_R',
            'alt': 'alt',
            'alt_l': 'Alt_L',
            'alt_r': 'Alt_R',
            'cmd': 'Super_L',
            'cmd_l': 'Super_L',
            'cmd_r': 'Super_R',
            'enter': 'Return',
            'space': 'space',
            'tab': 'Tab',
            'backspace': 'BackSpace',
            'delete': 'Delete',
            'up': 'Up',
            'down': 'Down',
            'left': 'Left',
            'right': 'Right',
            'home': 'Home',
            'end': 'End',
            'page_up': 'Page_Up',
            'page_down': 'Page_Down',
        }

        key = key_map.get(event['key'], event['key'])

        # If reverse, flip press/release
        event_type = event['type']
        if reverse:
            event_type = 'release' if event_type == 'press' else 'press'

        # Execute using xdotool
        if event_type == 'press':
            subprocess.run(['xdotool', 'keydown', key], capture_output=True)
            print(f"↓ {event['key']}")
        else:
            subprocess.run(['xdotool', 'keyup', key], capture_output=True)
            print(f"↑ {event['key']}")

    def step_forward(self):
        """Step forward one event"""
        if not self.events:
            print("No macro loaded")
            return

        if self.current_index >= len(self.events) - 1:
            print("Already at end of macro")
            return

        self.current_index += 1
        event = self.events[self.current_index]

        print(f"Step forward [{self.current_index + 1}/{len(self.events)}]")
        self.execute_event(event, reverse=False)
        self.save_state()

    def step_backward(self):
        """Step backward one event (undo)"""
        if not self.events:
            print("No macro loaded")
            return

        if self.current_index < 0:
            print("Already at start of macro")
            return

        event = self.events[self.current_index]

        print(f"Step backward [{self.current_index + 1}/{len(self.events)}]")
        self.execute_event(event, reverse=True)

        self.current_index -= 1
        self.save_state()

    def play_all(self):
        """Play entire macro from current position"""
        if not self.events:
            print("No macro loaded")
            return

        print(f"Playing macro from position {self.current_index + 1}")

        while self.current_index < len(self.events) - 1:
            self.step_forward()

        print("Macro playback complete")

    def reset(self):
        """Reset to beginning and release all keys"""
        print("Resetting macro state...")

        # Release all keys that are currently pressed
        pressed_keys = set()
        for i in range(self.current_index + 1):
            event = self.events[i]
            if event['type'] == 'press':
                pressed_keys.add(event['key'])
            elif event['key'] in pressed_keys:
                pressed_keys.remove(event['key'])

        # Release any remaining pressed keys
        for key in pressed_keys:
            print(f"Releasing stuck key: {key}")
            self.execute_event({'key': key, 'type': 'release'}, reverse=False)

        self.current_index = -1
        self.save_state()
        print("Reset complete")

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: dial-macro-controller.py <macro-file> <state-file> <action>")
        print("Actions: forward, backward, play, reset")
        sys.exit(1)

    macro_file = sys.argv[1]
    state_file = sys.argv[2]
    action = sys.argv[3]

    controller = DialMacroController(macro_file, state_file)

    if action == 'forward':
        controller.step_forward()
    elif action == 'backward':
        controller.step_backward()
    elif action == 'play':
        controller.play_all()
    elif action == 'reset':
        controller.reset()
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
