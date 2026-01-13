#!/usr/bin/env python3
"""
Macro Player for Stream Deck
Replays recorded macros with precise timing
"""

import sys
import json
import time
import subprocess
import os
from pynput.keyboard import Controller, Key

class MacroPlayer:
    def __init__(self, macro_file, use_xdotool=True):
        self.macro_file = macro_file
        self.keyboard = Controller()
        self.use_xdotool = use_xdotool and self.check_xdotool()
        self.key_map = {
            'ctrl': Key.ctrl,
            'ctrl_l': Key.ctrl_l,
            'ctrl_r': Key.ctrl_r,
            'shift': Key.shift,
            'shift_l': Key.shift_l,
            'shift_r': Key.shift_r,
            'alt': Key.alt,
            'alt_l': Key.alt_l,
            'alt_r': Key.alt_r,
            'cmd': Key.cmd,
            'cmd_l': Key.cmd_l,
            'cmd_r': Key.cmd_r,
            'enter': Key.enter,
            'space': Key.space,
            'tab': Key.tab,
            'backspace': Key.backspace,
            'delete': Key.delete,
            'esc': Key.esc,
            'up': Key.up,
            'down': Key.down,
            'left': Key.left,
            'right': Key.right,
            'home': Key.home,
            'end': Key.end,
            'page_up': Key.page_up,
            'page_down': Key.page_down,
            'f1': Key.f1,
            'f2': Key.f2,
            'f3': Key.f3,
            'f4': Key.f4,
            'f5': Key.f5,
            'f6': Key.f6,
            'f7': Key.f7,
            'f8': Key.f8,
            'f9': Key.f9,
            'f10': Key.f10,
            'f11': Key.f11,
            'f12': Key.f12,
        }

        # xdotool key mapping
        self.xdotool_key_map = {
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
            'esc': 'Escape',
            'up': 'Up',
            'down': 'Down',
            'left': 'Left',
            'right': 'Right',
            'home': 'Home',
            'end': 'End',
            'page_up': 'Page_Up',
            'page_down': 'Page_Down',
        }

    def check_xdotool(self):
        """Check if xdotool is available"""
        try:
            subprocess.run(['which', 'xdotool'], capture_output=True, check=True)
            return True
        except:
            return False

    def get_key(self, key_str):
        """Convert string to Key object"""
        if key_str in self.key_map:
            return self.key_map[key_str]
        return key_str

    def get_xdotool_key(self, key_str):
        """Convert string to xdotool key name"""
        if key_str in self.xdotool_key_map:
            return self.xdotool_key_map[key_str]
        # For regular characters, return as-is
        return key_str

    def play_with_xdotool(self, events):
        """Play macro using xdotool (more reliable for system shortcuts)"""
        print("Using xdotool for playback (better compatibility)")
        print("")

        # Small delay to let the user release the button
        time.sleep(0.3)

        last_time = 0
        for event in events:
            # Skip the ESC key that stopped recording
            if event['key'] == 'esc':
                continue

            # Wait for the appropriate time
            delay = event['time'] - last_time
            if delay > 0:
                time.sleep(delay)
            last_time = event['time']

            # Get the xdotool key name
            key = self.get_xdotool_key(event['key'])

            # Execute press or release using xdotool
            if event['type'] == 'press':
                print(f"↓ {event['key']}")
                subprocess.run(['xdotool', 'keydown', key], capture_output=True)
            elif event['type'] == 'release':
                print(f"↑ {event['key']}")
                subprocess.run(['xdotool', 'keyup', key], capture_output=True)

        # Give system time to process the key events
        time.sleep(0.1)

    def play(self):
        # Load macro
        with open(self.macro_file, 'r') as f:
            events = json.load(f)

        if not events:
            print("No events in macro file")
            return

        print(f"Playing macro: {self.macro_file}")
        print(f"Total events: {len(events)}")
        print(f"Duration: {events[-1]['time']:.2f} seconds")
        print("")

        # Use xdotool if available (more reliable for system shortcuts)
        if self.use_xdotool:
            self.play_with_xdotool(events)
        else:
            # Fallback to pynput
            print("Using pynput for playback")
            print("")

            # Small delay to let the user release the button
            time.sleep(0.3)

            last_time = 0
            for event in events:
                # Skip the ESC key that stopped recording
                if event['key'] == 'esc':
                    continue

                # Wait for the appropriate time
                delay = event['time'] - last_time
                if delay > 0:
                    time.sleep(delay)
                last_time = event['time']

                # Get the key
                key = self.get_key(event['key'])

                # Execute press or release
                if event['type'] == 'press':
                    print(f"↓ {event['key']}")
                    self.keyboard.press(key)
                elif event['type'] == 'release':
                    print(f"↑ {event['key']}")
                    self.keyboard.release(key)

            # Give system time to process the key events
            time.sleep(0.1)

        print("")
        print("Macro playback complete")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: macro-player.py <macro-file.json>")
        sys.exit(1)

    macro_file = sys.argv[1]
    player = MacroPlayer(macro_file)
    player.play()
