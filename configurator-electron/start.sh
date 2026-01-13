#!/bin/bash
# Launcher for Stream Deck Electron Configurator - Official Style UI

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not installed. Running setup..."
    ./setup.sh
    if [ $? -ne 0 ]; then
        echo "Setup failed. Please run './setup.sh' manually."
        exit 1
    fi
fi

echo "Starting Stream Deck Configurator (Official Style UI)..."
npm start -- --no-sandbox
