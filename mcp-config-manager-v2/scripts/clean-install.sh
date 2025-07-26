#!/bin/bash

# Clean installation script for MCP Config Manager v2
# This script resolves dependency conflicts and ensures a clean build

set -e

echo "🧹 Clean Installation Script for MCP Config Manager v2"
echo "====================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "1️⃣  Cleaning existing dependencies and build files..."
rm -rf node_modules package-lock.json dist release
echo "   ✅ Cleaned node_modules, package-lock.json, dist, and release"
echo ""

echo "2️⃣  Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps
echo "   ✅ Dependencies installed successfully"
echo ""

echo "3️⃣  Building the application..."
npm run build
echo "   ✅ Build completed successfully"
echo ""

echo "4️⃣  Verifying build output..."
if [ -f "dist/main.js" ] && [ -f "dist/renderer.js" ] && [ -f "dist/index.html" ] && [ -f "dist/preload.js" ]; then
    echo "   ✅ All required build files are present:"
    echo "      - dist/main.js ($(stat -f%z dist/main.js 2>/dev/null || stat -c%s dist/main.js) bytes)"
    echo "      - dist/preload.js ($(stat -f%z dist/preload.js 2>/dev/null || stat -c%s dist/preload.js) bytes)"
    echo "      - dist/renderer.js ($(stat -f%z dist/renderer.js 2>/dev/null || stat -c%s dist/renderer.js) bytes)"
    echo "      - dist/vendors.js ($(stat -f%z dist/vendors.js 2>/dev/null || stat -c%s dist/vendors.js) bytes)"
    echo "      - dist/index.html ($(stat -f%z dist/index.html 2>/dev/null || stat -c%s dist/index.html) bytes)"
else
    echo "   ❌ Some build files are missing!"
    exit 1
fi
echo ""

echo "✨ Clean installation complete!"
echo ""
echo "📝 Next steps:"
echo "   - To run the application: npm start"
echo "   - For development mode: npm run dev:all"
echo ""
echo "🔧 Troubleshooting:"
echo "   - If you still see 'global is not defined', try: npm run build && npm start"
echo "   - For development issues, use two terminals:"
echo "     Terminal 1: npm run dev"
echo "     Terminal 2: npm start"
echo ""