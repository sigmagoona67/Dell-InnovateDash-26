#!/bin/sh
set -eu

CONFIG_PATH="/usr/share/nginx/html/config.js"

cat > "$CONFIG_PATH" <<EOF
window.__RUNTIME_CONFIG__ = {
  VITE_INSFORGE_URL: "${VITE_INSFORGE_URL:-}",
  VITE_INSFORGE_ANON_KEY: "${VITE_INSFORGE_ANON_KEY:-}"
};
EOF

exec nginx -g 'daemon off;'
