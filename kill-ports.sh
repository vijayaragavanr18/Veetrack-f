#!/bin/bash
echo "Killing processes on ports 3000 and 8000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Port 3000 already free"
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "Port 8000 already free"
echo "Done. You can now run bun run dev"
