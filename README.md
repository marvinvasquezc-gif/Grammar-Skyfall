# GRAMMAR SKYFALL — PRESENT SIMPLE EDITION v23

## Main game
- Online room for 2–6 players using PeerJS.
- Hidden local TEST MODE with code `67BRO` / `67BRO?`.
- 40-tile Monopoly-style perimeter board.
- Routine / Question / Toxic tile rules.
- +100 PTS + 1 shield + 2 spaces for a correct farm answer.
- +25 PTS per correct mini-game answer.
- Lowest mini score is eliminated; a tie for the lowest score is a DRAW for that elimination check.
- If only two survivors remain, the room votes `¿MUERTE SÚBITA?`.
- `YES + YES` enters Skyfall; `YES + NO` or `NO + NO` continues the board.
- Two players who reach the finish in the same round are compared by points; equal points = DRAW.
- Reaching the SKYFALL tile does not open another farm challenge. It becomes a finish candidate and is resolved after the round so simultaneous finishes are handled correctly.

## Skyfall
- Two finalists only.
- Red P1 plane / blue P2 plane.
- Each player has an independent falling sentence.
- Correct answer + ENTER removes only that player's sentence and spawns a new one.
- Wrong answers do not cost a life and do not reset the fall.
- A player loses a life only when their own sentence reaches the plane.
- 3 lives, progressive speed and Present Simple hints such as `HE ___ WATER. (drink)`.

## Solo Quest
The solo section remains focused on Present Simple and includes Easy / Hard / Difficult challenges. `SPEED CHECK` is now separated into its own `DEL PINO CHALLENGE` mode.

## Custom music
Put your own MP3 files in `assets/music/` using these exact names:
- `menu.mp3` — menu / lobby / local setup
- `gameplay.mp3` — board / farm / mini-games / vote / final-ready
- `skyfall.mp3` — Skyfall
- `victory.mp3` — winner / DRAW screen

Missing files do not break the game; the built-in sound effects continue to work.

## v23 fixes
- Skyfall 1v1 READY flow now gives immediate feedback, syncs pending READY states across the room and launches only after both finalists are confirmed.
- Roulette result now has a large on-screen number and a longer pause before movement continues.
- Correct/wrong feedback and round-result overlays stay visible longer.
- SOLO QUEST: SPEED CHECK was moved out of DIFFICULT into the separate DEL PINO CHALLENGE mode.
