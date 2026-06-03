@echo off
setlocal
set ROOT_DIR=%~dp0..
set BACKEND_DIR=%ROOT_DIR%\veetrack-backend
set FRONTEND_DIR=%ROOT_DIR%\veetrack-frontend

echo === VeeTrack One-Time Setup (Windows) ===
echo.

echo [1/4] Checking Redis...
echo NOTE: Redis is not natively supported on Windows.
echo Please run it via Docker Desktop, WSL2, or use Memurai for Windows.
echo.

echo [2/4] Checking Ollama...
echo Ensure Ollama for Windows is installed from https://ollama.com/download
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    ollama list 2>nul | findstr "qwen2.5:1.5b" >nul
    if errorlevel 1 (
        echo Pulling qwen2.5:1.5b model...
        ollama pull qwen2.5:1.5b
    ) else (
        echo Ollama + qwen2.5:1.5b [OK]
    )
) else (
    echo WARNING: Ollama not found.
)
echo.

echo [3/4] Setting up Python environment...
cd /d "%BACKEND_DIR%"

set PY_CMD=
where python >nul 2>nul && set PY_CMD=python
if not defined PY_CMD (
    where py >nul 2>nul && set PY_CMD=py
)
if not defined PY_CMD (
    echo ERROR: Python is not installed or not found on your PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    exit /b 1
)


if not exist venv (
    echo Creating virtual environment using %PY_CMD%...
    %PY_CMD% -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r "%ROOT_DIR%\requirements.txt" --quiet
python -m spacy download en_core_web_trf || python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True); nltk.download('stopwords', quiet=True)"
echo Python environment [OK]
echo.

echo [4/4] Setting up frontend...
cd /d "%FRONTEND_DIR%"
call npm install --silent
echo Frontend [OK]
echo.

echo === Setup complete! ===
echo Start the app with: npm run dev:all
cd /d "%ROOT_DIR%"
