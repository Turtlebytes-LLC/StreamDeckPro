#!/bin/bash
# Toggle microphone mute
pactl set-source-mute @DEFAULT_SOURCE@ toggle
