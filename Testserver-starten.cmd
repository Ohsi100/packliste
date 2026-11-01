@echo off
rem Startet den Testserver fuer die Packliste. Fenster offen lassen, solange du testest.
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8081
pause
