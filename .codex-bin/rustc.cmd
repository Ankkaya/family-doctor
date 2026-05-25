@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rustc.ps1" %*
exit /b %ERRORLEVEL%
