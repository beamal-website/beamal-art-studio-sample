@echo off
cd /d "%~dp0"
node scripts\start-local.mjs --open
if errorlevel 1 pause
