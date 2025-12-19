#!/bin/bash
# Setup script for Stream Deck Electron Configurator

cd "$(dirname "$0")"

echo "========================================"
echo "Stream Deck Electron Configurator Setup"
echo "========================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo ""
    echo "Install Node.js:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    echo ""
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo "✓ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✓ Setup complete!"
    echo "========================================"
    echo ""
    echo "To run in development mode:"
    echo "  npm run dev"
    echo "  (in another terminal) npm start"
    echo ""
    echo "To build for production:"
    echo "  npm run build"
    echo ""
else
    echo ""
    echo "❌ Installation failed"
    exit 1
fi
