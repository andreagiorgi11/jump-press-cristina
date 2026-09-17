@echo off
cd /d "%~dp0"
if not exist node_modules call npm.cmd ci
start "" http://127.0.0.1:3016
call npm.cmd run dev:news
pause
