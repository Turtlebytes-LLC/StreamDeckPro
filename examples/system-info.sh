#!/bin/bash
# Show system information notification
CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')
MEM=$(free -m | awk 'NR==2{printf "%.0f%%", $3*100/$2 }')
DISK=$(df -h / | awk 'NR==2{print $5}')
notify-send "System Info" "CPU: $CPU\nMemory: $MEM\nDisk: $DISK" -i computer
