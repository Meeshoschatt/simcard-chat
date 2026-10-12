@echo off
title Secure Chat Tunnel (HTTPS)
cd /d "%~dp0server"
echo ========================================================
echo Creating free HTTPS URL for local server...
echo Copy the https://xxxx.loca.lt URL shown below!
echo Set SERVER_URL=https://xxxx.loca.lt in android/gradle.properties
echo ========================================================
npx -y localtunnel --port 3000
pause
