#!/bin/bash
# Backward-compatibility shim.
# The canonical startup script is now: scripts/start-backend.sh
# Run from the monorepo root: npm run dev:backend
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash "$ROOT_DIR/scripts/start-backend.sh"
