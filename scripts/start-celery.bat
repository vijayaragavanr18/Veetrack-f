@echo off
setlocal
set ROOT_DIR=%~dp0..
set BACKEND_DIR=%ROOT_DIR%\veetrack-backend

echo === VeeTrack Celery Worker (Windows) ===
echo Note: Celery does not natively support Windows. 
echo We are using the --pool=solo flag to allow it to run locally.
echo.

cd /d "%BACKEND_DIR%"

if not exist venv\Scripts\activate.bat (
    echo Error: Python venv not found. Please run setup.bat first.
    exit /b 1
)
call venv\Scripts\activate.bat

set PYTHONPATH=%BACKEND_DIR%
celery -A tasks.celery_app worker --pool=solo -l info
