@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cargo.ps1" %*
exit /b %ERRORLEVEL%
