#!/bin/bash
# Open Kate text editor for quick note with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
kate ~/Documents/notes/note-$TIMESTAMP.txt &
