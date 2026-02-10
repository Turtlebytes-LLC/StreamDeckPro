#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate mise if available
if command -v mise &> /dev/null; then
    eval "$(mise activate bash)"
fi

# Check dependencies
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
