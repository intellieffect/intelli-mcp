# 🚀 Quick Start Guide - MCP Config Manager v2

## Problem: Electron App Not Showing
The webpack build is successful but the Electron window doesn't appear. This is because `npm run dev` only builds the files - it doesn't launch Electron.

## Solutions

### Option 1: Use Two Terminals (Recommended)
```bash
# Terminal 1: Start webpack dev servers
npm run dev

# Terminal 2: Wait for build, then start Electron
npm start
```

### Option 2: All-in-One Command
```bash
# This runs webpack + launches Electron automatically
npm run dev:all
```

### Option 3: Use the Helper Script
```bash
# Make script executable (first time only)
chmod +x scripts/start-dev.sh

# Run the development environment
./scripts/start-dev.sh
```

## What Each Command Does

- **`npm run dev`** - Builds and watches files (no Electron window)
- **`npm start`** - Launches Electron (requires built files)
- **`npm run dev:all`** - Builds files AND launches Electron
- **`npm run dev:electron`** - Waits for build, then launches Electron

## Development Workflow

1. **First Time Setup**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Start Development**
   ```bash
   npm run dev:all
   ```

3. **Features**
   - ✅ Hot reload for React (renderer process)
   - ✅ Auto-rebuild for Electron (main process)
   - ✅ DevTools enabled
   - ✅ Source maps for debugging

## Troubleshooting

### Electron window not appearing?
- Make sure `dist/main.js` exists
- Check if port 3000 is available
- Try running `npm start` in a separate terminal

### Build errors?
```bash
# Clean and rebuild
npm run clean
npm run build
npm start
```

### Port 3000 in use?
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

## Korean (한국어)

### 문제: Electron 앱이 표시되지 않음
webpack 빌드는 성공했지만 Electron 창이 나타나지 않습니다. `npm run dev`는 파일만 빌드하고 Electron을 실행하지 않기 때문입니다.

### 해결 방법
```bash
# 방법 1: 두 개의 터미널 사용
# 터미널 1:
npm run dev

# 터미널 2:
npm start

# 방법 2: 한 번에 모두 실행
npm run dev:all
```