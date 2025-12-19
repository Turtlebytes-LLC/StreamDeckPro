#!/bin/bash
# Flameshot Save with Custom Name - Interactive with timestamp
FILENAME="screenshot-$(date +%Y%m%d-%H%M%S).png"
flameshot gui --path ~/Pictures/Screenshots --filename "$FILENAME"
