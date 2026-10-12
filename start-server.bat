@echo off
title Secure Chat Server
cd /d "%~dp0server"
echo ========================================================
echo Starting Secure Chat Server (http://localhost:3000)
echo Room Code: 445566 (Change in server.js or set ROOM_CODE)
echo ========================================================
npm start
pause
