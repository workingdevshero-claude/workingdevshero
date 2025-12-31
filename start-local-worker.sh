#!/bin/bash

# WorkingDevsHero Local Worker Startup Script
# This script starts the worker that processes paid tasks locally

# Load API key
WORKER_API_KEY=$(cat /home/claude/Desktop/worker-api-key.txt 2>/dev/null)

if [ -z "$WORKER_API_KEY" ]; then
    echo "ERROR: Worker API key not found at /home/claude/Desktop/worker-api-key.txt"
    exit 1
fi

# Set the remote API URL (update this after deployment)
API_BASE_URL="${API_BASE_URL:-https://workingdevshero.onrender.com}"

echo "Starting WorkingDevsHero Local Worker..."
echo "API Base URL: $API_BASE_URL"
echo ""

# Optional: Load SMTP credentials for email
SMTP_PASS=$(cat /home/claude/Desktop/proton-mail-password.txt 2>/dev/null)

export WORKER_API_KEY
export API_BASE_URL
export SMTP_PASS
export SMTP_USER="claude@kookz.life"
export SMTP_HOST="smtp.protonmail.ch"
export SMTP_PORT="587"

cd /home/claude/Desktop/workingdevshero
exec bun run remote-worker
