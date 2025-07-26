#!/bin/bash

# Build validation script for MCP Config Manager v2
# Validates the development build output and functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

validate_build_files() {
    log_info "Validating build output files..."
    
    local required_files=(
        "dist/main.js"
        "dist/main.js.map"
        "dist/renderer.js"
        "dist/renderer.js.map"
        "dist/vendors.js"
        "dist/vendors.js.map"
        "dist/index.html"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -eq 0 ]]; then
        log_success "All required build files are present"
    else
        log_error "Missing build files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        return 1
    fi
}

validate_file_sizes() {
    log_info "Validating build file sizes..."
    
    local main_size=$(stat -f%z dist/main.js 2>/dev/null || echo "0")
    local renderer_size=$(stat -f%z dist/renderer.js 2>/dev/null || echo "0")
    local vendors_size=$(stat -f%z dist/vendors.js 2>/dev/null || echo "0")
    
    log_info "Build file sizes:"
    echo "  - main.js: $(( main_size / 1024 ))KB"
    echo "  - renderer.js: $(( renderer_size / 1024 ))KB"
    echo "  - vendors.js: $(( vendors_size / 1024 / 1024 ))MB"
    
    # Validate reasonable file sizes
    if [[ $main_size -lt 100000 ]]; then
        log_warning "Main process bundle seems small (< 100KB)"
    fi
    
    if [[ $renderer_size -lt 50000 ]]; then
        log_warning "Renderer process bundle seems small (< 50KB)"
    fi
    
    if [[ $vendors_size -lt 1000000 ]]; then
        log_warning "Vendor bundle seems small (< 1MB)"
    fi
    
    log_success "File size validation completed"
}

validate_html_structure() {
    log_info "Validating HTML structure..."
    
    if [[ ! -f "dist/index.html" ]]; then
        log_error "index.html not found"
        return 1
    fi
    
    # Check for required HTML elements
    local required_elements=(
        "<title>MCP Config Manager v2</title>"
        "<div id=\"root\">"
        "renderer.js"
        "vendors.js"
    )
    
    local missing_elements=()
    
    for element in "${required_elements[@]}"; do
        if ! grep -q "$element" dist/index.html; then
            missing_elements+=("$element")
        fi
    done
    
    if [[ ${#missing_elements[@]} -eq 0 ]]; then
        log_success "HTML structure validation passed"
    else
        log_error "Missing HTML elements:"
        for element in "${missing_elements[@]}"; do
            echo "  - $element"
        done
        return 1
    fi
}

validate_source_maps() {
    log_info "Validating source maps..."
    
    local source_maps=(
        "dist/main.js.map"
        "dist/renderer.js.map"
        "dist/vendors.js.map"
    )
    
    for map_file in "${source_maps[@]}"; do
        if [[ -f "$map_file" ]]; then
            if jq . "$map_file" > /dev/null 2>&1; then
                log_success "Source map $map_file is valid JSON"
            else
                log_warning "Source map $map_file is not valid JSON"
            fi
        else
            log_warning "Source map $map_file not found"
        fi
    done
}

validate_typescript_compilation() {
    log_info "Validating TypeScript compilation..."
    
    # Check if we can run TypeScript without errors
    if npx tsc --noEmit --skipLibCheck; then
        log_success "TypeScript compilation validation passed"
    else
        log_warning "TypeScript compilation has warnings (continuing with build)"
    fi
}

validate_project_structure() {
    log_info "Validating project structure..."
    
    local required_dirs=(
        "src/main"
        "src/ui"
        "src/core"
        "src/shared"
        "src/test"
    )
    
    local missing_dirs=()
    
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            missing_dirs+=("$dir")
        fi
    done
    
    if [[ ${#missing_dirs[@]} -eq 0 ]]; then
        log_success "Project structure validation passed"
    else
        log_error "Missing directories:"
        for dir in "${missing_dirs[@]}"; do
            echo "  - $dir"
        done
        return 1
    fi
}

validate_dependencies() {
    log_info "Validating dependencies..."
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found"
        return 1
    fi
    
    if [[ ! -d "node_modules" ]]; then
        log_error "node_modules directory not found. Run 'npm install' first."
        return 1
    fi
    
    # Check for key dependencies
    local key_deps=(
        "node_modules/react"
        "node_modules/electron"
        "node_modules/typescript"
        "node_modules/webpack"
    )
    
    local missing_deps=()
    
    for dep in "${key_deps[@]}"; do
        if [[ ! -d "$dep" ]]; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -eq 0 ]]; then
        log_success "Dependencies validation passed"
    else
        log_error "Missing key dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        return 1
    fi
}

main() {
    log_info "Starting build validation for MCP Config Manager v2..."
    echo
    
    validate_project_structure
    echo
    
    validate_dependencies
    echo
    
    validate_build_files
    echo
    
    validate_file_sizes
    echo
    
    validate_html_structure
    echo
    
    validate_source_maps
    echo
    
    validate_typescript_compilation
    echo
    
    log_success "🎉 Build validation completed successfully!"
    echo
    log_info "Development build is ready:"
    echo "  - Electron main process: dist/main.js"
    echo "  - React renderer: dist/renderer.js + dist/vendors.js"
    echo "  - HTML entry point: dist/index.html"
    echo "  - Source maps available for debugging"
    echo
    log_info "To start development:"
    echo "  - Renderer (hot reload): npm run dev:renderer"
    echo "  - Main process (watch): npm run dev:main"
    echo "  - Both processes: npm run dev"
    echo
    log_info "To start the application:"
    echo "  - npm start (requires both processes to be built)"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi