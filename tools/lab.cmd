@echo off
rem THE BOT LAB on its own: double click to start it (headless Chrome, rotating the three hands); "lab.cmd stop" or "lab.cmd status".
rem The report: http://127.0.0.1:8790/tools/bot-lab.html
cd /d "%~dp0.."
if "%1"=="stop" ( node tools\lab-run.js stop & goto :eof )
if "%1"=="status" ( node tools\lab-run.js status & pause & goto :eof )
start "goat lab" /min node tools\lab-run.js %*
