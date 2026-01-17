#!/bin/bash

# Auto-reconnecting port-forward for Grafana
# Usage: ./scripts/grafana-port-forward.sh

set -e

NAMESPACE="monitoring"
SERVICE="monitoring-grafana"
LOCAL_PORT="3000"
REMOTE_PORT="80"

echo "========================================="
echo "  Grafana Port-Forward (Auto-Reconnect)"
echo "========================================="
echo "Namespace: $NAMESPACE"
echo "Service: $SERVICE"
echo "Local: http://localhost:$LOCAL_PORT"
echo "Username: admin"
echo "Password: phuocvanho2004"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping port-forward..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Auto-reconnect loop
while true; do
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting port-forward..."

    # Run port-forward with timeout handling
    kubectl port-forward \
        -n "$NAMESPACE" \
        "svc/$SERVICE" \
        "$LOCAL_PORT:$REMOTE_PORT" \
        2>&1 | while IFS= read -r line; do
            # Filter out noisy error messages
            if [[ ! "$line" =~ "Unhandled Error"|"error copying from remote stream" ]]; then
                echo "$line"
            fi
        done

    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Connection lost (exit code: $EXIT_CODE)"
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Reconnecting in 2 seconds..."
        sleep 2
    else
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Port-forward stopped gracefully"
        break
    fi
done
