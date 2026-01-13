#!/bin/bash
# Tile window to right half of screen
SCREEN_WIDTH=$(xdpyinfo | awk '/dimensions/{print $2}' | cut -d 'x' -f1)
HALF_WIDTH=$((SCREEN_WIDTH / 2))
xdotool getactivewindow windowmove $HALF_WIDTH 0 windowsize 50% 100%
