#!/bin/bash
cd /home/z/my-project/veetrack-backend
export PYTHONPATH=/home/z/my-project/veetrack-backend
while true; do
  python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload 2>&1
  echo "[VeeTrack] Backend crashed, restarting in 3s..."
  sleep 3
done
