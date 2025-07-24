# MCP Config Manager - Electron App

## Product Vision

Claude Desktop의 MCP 서버 설정을 GUI로 쉽게 관리할 수 있는 크로스플랫폼 데스크톱 애플리케이션

## Core Features

1. **Auto-Detection**: OS별 Claude Desktop 설정 파일 자동 감지 및 읽기/쓰기
2. **Visual Management**: 드래그 앤 드롭으로 MCP 서버 관리
3. **Template System**: 인기 MCP 서버들의 프리셋 템플릿
4. **Validation**: JSON 구문 및 설정 유효성 실시간 검증
5. **Backup/Restore**: 자동 백업 및 롤백 기능
5. **Official Documentation**: MCP(Model Context Protocol) 공식 문서에 맞는 사용 방식 적용

## Technical Stack

- Framework: Electron + React
- UI: Modern component library (Shadcn)
- File System: Node.js fs operations
- Validation: JSON schema validation

## Target Platforms

- macOS 10.15+ (First)
- Windows 10/11
- Linux (Ubuntu 18.04+)
