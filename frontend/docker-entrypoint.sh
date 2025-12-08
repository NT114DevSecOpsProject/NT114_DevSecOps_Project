#!/bin/sh
set -e

# Replace API_GATEWAY_URL placeholder with environment variable
if [ -n "$API_GATEWAY_URL" ]; then
  echo "Configuring nginx with API Gateway URL: $API_GATEWAY_URL"
  find /etc/nginx -type f -name '*.conf' -exec sed -i "s|API_GATEWAY_URL_PLACEHOLDER|$API_GATEWAY_URL|g" {} \;
else
  echo "WARNING: API_GATEWAY_URL environment variable not set, using placeholder"
fi

# Execute the original docker entrypoint
exec /docker-entrypoint.sh "$@"
