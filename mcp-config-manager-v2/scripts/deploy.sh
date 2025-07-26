#!/bin/bash

# Deployment script for MCP Config Manager v2
# Supports multiple deployment targets: development, staging, production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION=${VERSION:-$(node -p "require('./package.json').version")}
BUILD_NUMBER=${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/claude-code"}
IMAGE_NAME="${DOCKER_REGISTRY}/mcp-config-manager-v2"
DEPLOYMENT_ENV=${1:-development}

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

show_usage() {
    echo "Usage: $0 [development|staging|production] [options]"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip running tests before deployment"
    echo "  --skip-build    Skip building the application"
    echo "  --force         Force deployment without confirmation"
    echo "  --rollback      Rollback to previous version"
    echo "  --health-check  Perform health check after deployment"
    echo ""
    echo "Examples:"
    echo "  $0 development"
    echo "  $0 production --skip-tests --force"
    echo "  $0 staging --rollback"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Make sure you're in the project root."
        exit 1
    fi
    
    if [[ ! -f "Dockerfile" ]]; then
        log_error "Dockerfile not found"
        exit 1
    fi
    
    if [[ ! -f "docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests"
        return 0
    fi
    
    log_info "Running test suite..."
    
    if [[ -f "scripts/test-coverage.sh" ]]; then
        chmod +x scripts/test-coverage.sh
        ./scripts/test-coverage.sh
    else
        npm run test:coverage
    fi
    
    log_success "All tests passed"
}

build_application() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_warning "Skipping build"
        return 0
    fi
    
    log_info "Building application..."
    
    # Install dependencies
    npm ci
    
    # Build the application
    npm run build
    
    # Run type checking
    npm run typecheck
    
    # Run linting
    npm run lint
    
    log_success "Application built successfully"
}

build_docker_image() {
    log_info "Building Docker image..."
    
    local tag="${IMAGE_NAME}:${VERSION}"
    local latest_tag="${IMAGE_NAME}:latest"
    local env_tag="${IMAGE_NAME}:${DEPLOYMENT_ENV}"
    
    # Build the Docker image
    docker build \
        --target production \
        --build-arg VERSION="${VERSION}" \
        --build-arg BUILD_NUMBER="${BUILD_NUMBER}" \
        --build-arg NODE_ENV="${DEPLOYMENT_ENV}" \
        -t "${tag}" \
        -t "${latest_tag}" \
        -t "${env_tag}" \
        .
    
    log_success "Docker image built: ${tag}"
}

deploy_development() {
    log_info "Deploying to development environment..."
    
    # Stop existing containers
    docker-compose --profile dev down --remove-orphans
    
    # Start development services
    docker-compose --profile dev up -d --build
    
    log_success "Development deployment completed"
}

deploy_staging() {
    log_info "Deploying to staging environment..."
    
    # Create staging environment file
    cat > .env.staging << EOF
NODE_ENV=staging
LOG_LEVEL=info
POSTGRES_DB=mcpconfig_staging
POSTGRES_USER=mcpuser_staging
POSTGRES_PASSWORD=${POSTGRES_PASSWORD_STAGING:-stagingpassword}
REDIS_PASSWORD=${REDIS_PASSWORD_STAGING:-stagingredis}
GRAFANA_PASSWORD=${GRAFANA_PASSWORD_STAGING:-admin}
EOF
    
    # Stop existing containers
    docker-compose --env-file .env.staging down --remove-orphans
    
    # Start staging services
    docker-compose --env-file .env.staging --profile full up -d
    
    log_success "Staging deployment completed"
}

deploy_production() {
    log_info "Deploying to production environment..."
    
    if [[ "$FORCE" != "true" ]]; then
        log_warning "You are about to deploy to PRODUCTION environment"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Validate environment variables
    if [[ -z "$POSTGRES_PASSWORD_PROD" ]]; then
        log_error "POSTGRES_PASSWORD_PROD environment variable is required for production"
        exit 1
    fi
    
    if [[ -z "$REDIS_PASSWORD_PROD" ]]; then
        log_error "REDIS_PASSWORD_PROD environment variable is required for production"
        exit 1
    fi
    
    # Create production environment file
    cat > .env.production << EOF
NODE_ENV=production
LOG_LEVEL=warn
POSTGRES_DB=mcpconfig
POSTGRES_USER=mcpuser
POSTGRES_PASSWORD=${POSTGRES_PASSWORD_PROD}
REDIS_PASSWORD=${REDIS_PASSWORD_PROD}
GRAFANA_PASSWORD=${GRAFANA_PASSWORD_PROD:-admin}
EOF
    
    # Backup current deployment
    create_backup
    
    # Stop existing containers gracefully
    docker-compose --env-file .env.production down --timeout 30
    
    # Start production services
    docker-compose --env-file .env.production --profile production --profile monitoring up -d
    
    log_success "Production deployment completed"
}

create_backup() {
    log_info "Creating backup..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup configuration data
    if [[ -d "data/config" ]]; then
        cp -r data/config "$backup_dir/"
    fi
    
    # Export database if running
    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec -T postgres pg_dump -U mcpuser mcpconfig > "$backup_dir/database.sql"
    fi
    
    # Save current Docker images
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | grep mcp-config-manager > "$backup_dir/images.txt"
    
    log_success "Backup created in $backup_dir"
}

rollback_deployment() {
    log_info "Rolling back deployment..."
    
    local backup_dir=$(ls -1 backups/ | tail -1)
    
    if [[ -z "$backup_dir" ]]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    log_info "Rolling back to backup: $backup_dir"
    
    # Stop current containers
    docker-compose down --timeout 30
    
    # Restore configuration data
    if [[ -d "backups/$backup_dir/config" ]]; then
        rm -rf data/config/*
        cp -r "backups/$backup_dir/config"/* data/config/
    fi
    
    # Restore database
    if [[ -f "backups/$backup_dir/database.sql" ]]; then
        docker-compose up -d postgres
        sleep 10
        docker-compose exec -T postgres psql -U mcpuser -d mcpconfig < "backups/$backup_dir/database.sql"
    fi
    
    # Start services
    docker-compose --profile production up -d
    
    log_success "Rollback completed"
}

health_check() {
    if [[ "$HEALTH_CHECK" != "true" ]]; then
        return 0
    fi
    
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    exit 1
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary files
    rm -f .env.staging .env.production
    
    # Clean up unused Docker images
    docker image prune -f
    
    # Clean up old backups (keep last 5)
    if [[ -d "backups" ]]; then
        cd backups
        ls -1t | tail -n +6 | xargs -r rm -rf
        cd ..
    fi
    
    log_success "Cleanup completed"
}

main() {
    log_info "Starting deployment to $DEPLOYMENT_ENV environment..."
    log_info "Version: $VERSION"
    log_info "Build: $BUILD_NUMBER"
    
    check_prerequisites
    
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback_deployment
        exit 0
    fi
    
    run_tests
    build_application
    build_docker_image
    
    case "$DEPLOYMENT_ENV" in
        development)
            deploy_development
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        *)
            log_error "Invalid environment: $DEPLOYMENT_ENV"
            show_usage
            exit 1
            ;;
    esac
    
    health_check
    cleanup
    
    log_success "Deployment to $DEPLOYMENT_ENV completed successfully!"
    log_info "Application is available at: http://localhost:3000"
    
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        log_info "Monitoring dashboard: http://localhost:3002"
        log_info "Metrics: http://localhost:9090"
    fi
}

# Parse command line arguments
SKIP_TESTS=false
SKIP_BUILD=false
FORCE=false
ROLLBACK=false
HEALTH_CHECK=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --health-check)
            HEALTH_CHECK=true
            shift
            ;;
        --no-health-check)
            HEALTH_CHECK=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        development|staging|production)
            DEPLOYMENT_ENV=$1
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi