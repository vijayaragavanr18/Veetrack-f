@echo off
setlocal
set ROOT_DIR=%~dp0..
set BACKEND_DIR=%ROOT_DIR%\veetrack-backend

echo === VeeTrack Backend (Windows) ===
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


if not exist venv\Scripts\activate.bat (
    echo Creating Python virtual environment using %PY_CMD%...
    %PY_CMD% -m venv venv
)
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r "%ROOT_DIR%\requirements.txt" --quiet

echo Checking spaCy model...
python -c "import spacy; spacy.load('en_core_web_trf')" 2>nul
if errorlevel 1 (
    python -m spacy download en_core_web_trf || python -m spacy download en_core_web_sm
)

echo Checking NLTK data...
python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True); nltk.download('stopwords', quiet=True)" 2>nul

echo Checking Ollama...
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    ollama list 2>nul | findstr "qwen2.5:3b" >nul
    if errorlevel 1 (
        echo Pulling qwen2.5:3b model...
        ollama pull qwen2.5:3b
    )
    echo Ollama ready qwen2.5:3b [OK]
) else (
    echo WARNING: Ollama not found. Chat falls back to context extraction.
    echo          Download and install from https://ollama.com/download
)

echo Starting FastAPI on http://localhost:8000...
set PYTHONPATH=%BACKEND_DIR%
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
