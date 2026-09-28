# GRAMMAR SKYFALL — PRESENT SIMPLE EDITION V21

## Multiplayer
The main game now uses a **central WebSocket relay** as its primary multiplayer transport, so devices do not need a direct WebRTC connection to one another.

- 2–6 players
- 6-character room code
- Host-authoritative game state
- Cross-device PC/mobile support
- Automatic reconnect-free failure messages instead of endless waiting
- Same-origin `/ws` endpoint when the Node server hosts the game
- Optional `js/config.js` relay URL for a Netlify frontend + separate Node multiplayer server

## Deploy
From the `server/` directory:

```bash
npm install
npm start
```

Deploy the **whole project** to a host that supports Node.js and WebSockets. Share the public HTTPS URL with all players.

## Music
The existing `assets/music/` files continue to work, and `♪ MUSIC ON/OFF` remains available in the top bar.

## Solo Quest
Present Simple only, with EASY / HARD / DIFFICULT.


## V21 Gameplay Fixes
The round elimination flow is hardened for 3–6 player rooms, online input is restricted to each player’s own device/identity, Skyfall hints use base-form clues, and the music toggle stays accessible throughout the normal game interface.
