@echo off
echo Killing processes on ports 3000 and 8000...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 3000...
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 8000...
    taskkill /F /PID %%a 2>nul
)

echo Done.
