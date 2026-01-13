#!/usr/bin/env python3
"""
Macro Recorder for Stream Deck
Records keyboard input including modifier keys with precise timing
"""

import sys
import json
import time
from pynput import keyboard

class MacroRecorder:
    def __init__(self, output_file):
        self.output_file = output_file
        self.events = []
        self.start_time = None
        self.recording = True

    def on_press(self, key):
        if self.start_time is None:
            self.start_time = time.time()

        timestamp = time.time() - self.start_time

        # Convert key to string representation
        try:
            key_str = key.char
        except AttributeError:
            key_str = str(key).replace('Key.', '')

        self.events.append({
            'type': 'press',
            'key': key_str,
            'time': timestamp
        })

        # Show real-time feedback
        print(f"[{timestamp:.2f}s] ↓ {key_str}", flush=True)

    def on_release(self, key):
        if self.start_time is None:
            self.start_time = time.time()

        timestamp = time.time() - self.start_time

        # Convert key to string representation
        try:
            key_str = key.char
        except AttributeError:
            key_str = str(key).replace('Key.', '')

        self.events.append({
            'type': 'release',
            'key': key_str,
            'time': timestamp
        })

        # Show real-time feedback
        print(f"[{timestamp:.2f}s] ↑ {key_str}", flush=True)

        # Stop on Escape key
        if key == keyboard.Key.esc:
            print("\n[ESC pressed - stopping recording]")
            return False

    def record(self):
        print("=" * 60)
        print("MACRO RECORDER")
        print("=" * 60)
        print("")
        print("  Press ESC to stop recording")
        print("  All keystrokes are suppressed (won't trigger shortcuts)")
        print("")
        print("Legend: ↓ = key pressed, ↑ = key released")
        print("-" * 60)
        print("")

        with keyboard.Listener(
            on_press=self.on_press,
            on_release=self.on_release,
            suppress=True) as listener:
            listener.join()

        # Save to file
        with open(self.output_file, 'w') as f:
            json.dump(self.events, f, indent=2)

        print("")
        print("=" * 60)
        print("RECORDING COMPLETE")
        print("=" * 60)
        print(f"Saved to: {self.output_file}")
        print(f"Total events: {len(self.events)}")
        if self.events:
            print(f"Duration: {self.events[-1]['time']:.2f} seconds")
        print("=" * 60)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: macro-recorder.py <output-file.json>")
        sys.exit(1)

    output_file = sys.argv[1]
    recorder = MacroRecorder(output_file)
    recorder.record()
