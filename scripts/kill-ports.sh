#!/bin/bash
# scripts/kill-ports.sh
# Free ports 3000 (frontend) and 8000 (backend).

echo "Killing processes on ports 3000 and 8000..."
fuser -k 3000/tcp 2>/dev/null && echo "Port 3000 freed" || echo "Port 3000 was already free"
fuser -k 8000/tcp 2>/dev/null && echo "Port 8000 freed" || echo "Port 8000 was already free"
echo "Done."
