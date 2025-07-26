#!/bin/bash

# Start development environment for MCP Config Manager v2
# This script starts both webpack dev servers and the Electron app

echo "🚀 Starting MCP Config Manager v2 Development Environment..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found. Please run 'npm install' first."
    exit 1
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "📦 Creating dist directory..."
    mkdir -p dist
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development environment..."
    # Kill all child processes
    pkill -P $$
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM

echo "📦 Starting webpack dev servers..."
echo "  - Main process: webpack watch mode"
echo "  - Renderer: webpack-dev-server at http://localhost:3000"
echo ""

# Start webpack dev servers in background
npm run dev &
DEV_PID=$!

# Wait for webpack to compile
echo "⏳ Waiting for initial compilation..."
sleep 5

# Check if webpack processes are running
if ! ps -p $DEV_PID > /dev/null; then
    echo "❌ Failed to start webpack dev servers"
    exit 1
fi

# Check if dist files exist
if [ ! -f "dist/main.js" ]; then
    echo "❌ Main process bundle not found. Waiting longer..."
    sleep 10
fi

if [ -f "dist/main.js" ] && [ -f "dist/renderer.js" ]; then
    echo "✅ Webpack compilation successful!"
    echo ""
    echo "🖥️  Starting Electron application..."
    echo ""
    
    # Start Electron
    npm start
else
    echo "❌ Build files not found. Please check webpack output."
    echo "   Expected files:"
    echo "   - dist/main.js"
    echo "   - dist/renderer.js"
    echo "   - dist/index.html"
fi

# Cleanup when Electron exits
cleanup