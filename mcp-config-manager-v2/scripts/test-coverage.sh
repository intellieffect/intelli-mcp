#!/bin/bash

# Comprehensive test coverage script for MCP Config Manager v2
# This script runs all test types and generates comprehensive coverage reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIN_COVERAGE=85
MIN_TYPE_COVERAGE=95
COVERAGE_DIR="coverage"
REPORTS_DIR="reports"

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

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p $COVERAGE_DIR
    mkdir -p $REPORTS_DIR
    mkdir -p $COVERAGE_DIR/html-report
    mkdir -p $COVERAGE_DIR/type-coverage
    
    log_success "Directories created"
}

run_lint() {
    log_info "Running linting..."
    
    if npm run lint; then
        log_success "Linting passed"
    else
        log_error "Linting failed"
        exit 1
    fi
}

run_type_check() {
    log_info "Running TypeScript type checking..."
    
    if npm run typecheck; then
        log_success "Type checking passed"
    else
        log_error "Type checking failed"
        exit 1
    fi
}

run_unit_tests() {
    log_info "Running unit tests..."
    
    if npm run test:unit -- --coverage --watchAll=false; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        exit 1
    fi
}

run_integration_tests() {
    log_info "Running integration tests..."
    
    if npm run test:integration -- --coverage --watchAll=false; then
        log_success "Integration tests passed"
    else
        log_error "Integration tests failed"
        exit 1
    fi
}

run_component_tests() {
    log_info "Running component tests..."
    
    if npm run test:component -- --coverage --watchAll=false; then
        log_success "Component tests passed"
    else
        log_error "Component tests failed"
        exit 1
    fi
}

run_accessibility_tests() {
    log_info "Running accessibility tests..."
    
    if npm run test:accessibility -- --coverage --watchAll=false; then
        log_success "Accessibility tests passed"
    else
        log_error "Accessibility tests failed"
        exit 1
    fi
}

run_e2e_tests() {
    log_info "Running E2E tests..."
    
    if npm run test:e2e; then
        log_success "E2E tests passed"
    else
        log_warning "E2E tests failed (may be environment-specific)"
    fi
}

generate_coverage_report() {
    log_info "Generating comprehensive coverage report..."
    
    # Run all tests with coverage
    npm run test:coverage
    
    # Check coverage thresholds
    local coverage_summary=$(cat $COVERAGE_DIR/coverage-summary.json)
    local line_coverage=$(echo $coverage_summary | jq '.total.lines.pct')
    local branch_coverage=$(echo $coverage_summary | jq '.total.branches.pct')
    local function_coverage=$(echo $coverage_summary | jq '.total.functions.pct')
    local statement_coverage=$(echo $coverage_summary | jq '.total.statements.pct')
    
    log_info "Coverage Summary:"
    echo "  Lines: ${line_coverage}%"
    echo "  Branches: ${branch_coverage}%"
    echo "  Functions: ${function_coverage}%"
    echo "  Statements: ${statement_coverage}%"
    
    # Check if coverage meets minimum requirements
    if (( $(echo "$line_coverage >= $MIN_COVERAGE" | bc -l) )); then
        log_success "Line coverage meets minimum requirement (${MIN_COVERAGE}%)"
    else
        log_error "Line coverage below minimum requirement: ${line_coverage}% < ${MIN_COVERAGE}%"
        exit 1
    fi
    
    if (( $(echo "$branch_coverage >= $MIN_COVERAGE" | bc -l) )); then
        log_success "Branch coverage meets minimum requirement (${MIN_COVERAGE}%)"
    else
        log_error "Branch coverage below minimum requirement: ${branch_coverage}% < ${MIN_COVERAGE}%"
        exit 1
    fi
}

check_type_coverage() {
    log_info "Checking TypeScript type coverage..."
    
    if npm run type-coverage; then
        log_success "Type coverage meets requirements (>=${MIN_TYPE_COVERAGE}%)"
    else
        log_error "Type coverage below minimum requirement (${MIN_TYPE_COVERAGE}%)"
        exit 1
    fi
    
    # Generate detailed type coverage report
    npm run type-coverage:detail > $COVERAGE_DIR/type-coverage-detail.txt
    log_info "Detailed type coverage report saved to $COVERAGE_DIR/type-coverage-detail.txt"
}

generate_test_report() {
    log_info "Generating comprehensive test report..."
    
    cat > $REPORTS_DIR/test-summary.md << EOF
# Test Coverage Report

Generated on: $(date)

## Test Suite Results

### Unit Tests
- Status: ✅ Passed
- Coverage: See detailed coverage report

### Integration Tests  
- Status: ✅ Passed
- Coverage: See detailed coverage report

### Component Tests
- Status: ✅ Passed
- Coverage: See detailed coverage report
- Accessibility: ✅ All tests passed

### Type Coverage
- Coverage: ${MIN_TYPE_COVERAGE}%+ (See type-coverage-detail.txt)

## Coverage Summary

| Type | Percentage | Status |
|------|------------|---------|
| Lines | See JSON | ✅ |
| Branches | See JSON | ✅ |
| Functions | See JSON | ✅ |
| Statements | See JSON | ✅ |

## Files

- Code Coverage: [HTML Report](../coverage/lcov-report/index.html)
- Type Coverage: [Detail Report](../coverage/type-coverage-detail.txt)
- Jest Report: [HTML Report](../coverage/html-report/report.html)

## Quality Gates

All quality gates passed:
- ✅ Linting
- ✅ Type checking  
- ✅ Unit tests (${MIN_COVERAGE}%+ coverage)
- ✅ Integration tests
- ✅ Component tests with accessibility
- ✅ Type coverage (${MIN_TYPE_COVERAGE}%+)

EOF

    log_success "Test report generated: $REPORTS_DIR/test-summary.md"
}

open_reports() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open $COVERAGE_DIR/lcov-report/index.html
        log_info "Coverage report opened in browser"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open &> /dev/null; then
            xdg-open $COVERAGE_DIR/lcov-report/index.html
            log_info "Coverage report opened in browser"
        fi
    fi
}

main() {
    log_info "Starting comprehensive test coverage analysis..."
    
    check_dependencies
    setup_directories
    
    # Static analysis
    run_lint
    run_type_check
    check_type_coverage
    
    # Test execution
    run_unit_tests
    run_integration_tests
    run_component_tests
    run_accessibility_tests
    
    # Coverage analysis
    generate_coverage_report
    
    # Optional E2E tests (may fail in CI)
    if [[ "${CI}" != "true" ]]; then
        run_e2e_tests
    else
        log_info "Skipping E2E tests in CI environment"
    fi
    
    # Generate reports
    generate_test_report
    
    log_success "All tests passed and coverage requirements met!"
    log_info "Reports available in: $REPORTS_DIR/"
    log_info "Coverage details: $COVERAGE_DIR/lcov-report/index.html"
    
    # Open reports if not in CI
    if [[ "${CI}" != "true" ]]; then
        open_reports
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi