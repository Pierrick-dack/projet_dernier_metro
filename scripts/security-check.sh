#!/bin/bash
echo "🔒 Running local security checks..."

echo "1. NPM Audit..."
cd api
npm audit --audit-level=moderate

echo "2. Trivy Scan (if installed)..."
if command -v trivy &> /dev/null; then
    trivy image --severity HIGH,CRITICAL registry.gitlab.com/kamelapierrick/projet_dernier_metro:latest
else
    echo "⚠️ Trivy not installed. Install with: brew install trivy"
fi

echo "✅ Security checks completed"