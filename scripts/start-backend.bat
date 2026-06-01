@echo off
setlocal
set ROOT_DIR=%~dp0..
set BACKEND_DIR=%ROOT_DIR%\veetrack-backend

echo === VeeTrack Backend (Windows) ===
cd /d "%BACKEND_DIR%"

if not exist venv\Scripts\activate.bat (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r "%ROOT_DIR%\requirements.txt" --quiet

echo Checking spaCy model...
python -c "import spacy; spacy.load('en_core_web_trf')" 2>nul
if errorlevel 1 (
    python -m spacy download en_core_web_trf || python -m spacy download en_core_web_sm
)

echo Starting FastAPI on http://localhost:8000...
set PYTHONPATH=%BACKEND_DIR%
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
