# Secure Chat — 2 person, no storage

Memory-only relay. Koi database, login, Firebase ya log nahi. Messages 50 second baad dono taraf se delete.

## Server (server/)
```
cd server
npm install
npm start            # http://localhost:3000
```
- Connect code default `445566` (change: `ROOM_CODE=123456 npm start`). Code app me kahin show nahi hota.
- Sirf 2 log ek time pe. 3rd banda reject. 8 galat attempts par 10 min IP block.
- Mic ke liye HTTPS chahiye (localhost chhod ke). Free deploy: Render / Railway / Fly.io (`npm start`).

## Web
Browser me server URL kholo. Front page par sirf 6 dots + number pad. Code dalo -> chat.

## Android (android/)
1. `android/gradle.properties` me `SERVER_URL=https://tumhara-server` set karo.
2. Android Studio me `android/` folder open karo -> Run / Build APK.
App WebView hai, screenshot blocked (FLAG_SECURE), cache/storage off.

## Behaviour
- Text, emoji, audio (mic tap = record, dobara tap = send, max 40s).
- Peer disconnect ya app band -> poori chat wipe.
- Server sirf forward karta hai, kuch save nahi.
