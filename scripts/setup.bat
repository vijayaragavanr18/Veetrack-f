@echo off
setlocal
echo === VeeTrack One-Time Setup (Windows) ===
echo.

echo [1/4] Checking Redis...
echo NOTE: Redis is not natively supported on Windows.
echo Please run it via Docker Desktop, WSL2, or use Memurai for Windows.
echo.

echo [2/4] Checking Ollama...
echo Ensure Ollama for Windows is installed from https://ollama.com/download
ollama list 2>nul | findstr "qwen2.5:1.5b" >nul
if errorlevel 1 (
    echo Pulling qwen2.5:1.5b model...
    ollama pull qwen2.5:1.5b
) else (
    echo Ollama + qwen2.5:1.5b [OK]
)
echo.

echo [3/4] Setting up Python environment...
cd ..\veetrack-backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r ..\requirements.txt
python -m spacy download en_core_web_trf || python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True); nltk.download('stopwords', quiet=True)"
echo Python environment [OK]
echo.

echo [4/4] Setting up frontend...
cd ..\veetrack-frontend
call npm install
echo Frontend [OK]
echo.

echo === Setup complete! ===
echo Start the app with: npm run dev:all
cd ..
