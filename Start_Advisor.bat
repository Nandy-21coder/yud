@echo off
title Smart Oilseed Advisor Launcher
echo [1/3] Force-closing old server...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im py.exe >nul 2>&1

echo [2/3] Starting New Backend Server...
start /min py app.py

echo [3/3] Opening App in Private Mode (To fix the update issue)...
timeout /t 3 /nobreak > nul

:: Check for Chrome (Incognito)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --incognito --app=http://127.0.0.1:5000/main_advisor.html
) else (
    :: Use Edge (InPrivate)
    start msedge --inprivate --app=http://127.0.0.1:5000/main_advisor.html
)

echo App is ready!
exit
