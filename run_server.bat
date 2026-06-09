@echo off
cd /d "%~dp0"
npx next dev -p 3002 > dev_server.log 2>&1
