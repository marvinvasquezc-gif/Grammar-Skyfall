# GRAMMAR SKYFALL — Present Simple EDITION

V24 FINAL build for the school presentation.

## Game

• Online: 2–6 players.
• 40-tile perimeter board.
• Present Simple farm challenges, mini-game rounds, 2-player vote and final Skyfall.
• Hidden TEST MODE is opened from the tiny square and code `67BRO` / `67BRO?`.
• Solo Quest is Present Simple only: EASY / HARD / DIFFICULT.
• DEL PINO CHALLENGE is a separate timed Present Simple mode.
• When exactly two survivors choose to skip Skyfall, the game switches to a board race: first player to reach tile 40 wins immediately.

## Music slots

Put your own MP3s in `assets/music/` using these exact names:

- `menu.mp3`
- `gameplay.mp3`
- `skyfall.mp3`
- `victory.mp3`
- `solo.mp3`
- `delpino.mp3`

`solo.mp3` and `delpino.mp3` are included as silent placeholders. Replace them with your own files.

## Render + GitHub

Do **not** upload the ZIP as the only project file. Extract the ZIP and commit the project files to GitHub.

If the files are at repository root:

```text
YOUR-REPO/
├── index.html
├── css/
├── js/
├── assets/
└── server/
    ├── server.js
    └── package.json
```

Render settings:

- Root Directory: leave blank
- Build Command: `npm install --prefix server`
- Start Command: `node server/server.js`

If the whole project is inside a folder named `grammar skyfall`, set Root Directory to `grammar skyfall` and keep the same Build/Start commands.

The V24 online system uses a central WebSocket relay at `/ws`; PeerJS is not required.

## Local check

Open the site, press PLAY, tap the tiny square in the upper-left, enter `67BRO`, choose 2–6 players, and start TEST MODE.
