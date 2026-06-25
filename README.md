# Skribble Clone

A real-time multiplayer drawing-and-guessing game (a skribbl.io clone), built with React, Node.js, Socket.IO, and SQLite.

**Live URL:** https://skribble-frontend-roan.vercel.app

---

## How to Play

1. Open the live URL above.
2. Enter your name and either **Create Room** (you become the host) or **Join Room** with a code a friend shares with you.
3. Once enough players are in the lobby, the host clicks **Start Game**.
4. Each round, one player is the drawer and picks a word from a few options; everyone else tries to guess it in the chat box.
5. Points are awarded based on how quickly you guess correctly. The drawer also earns a smaller share of points for every correct guess.
6. After all rounds, the player with the highest score wins.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Real-time canvas | HTML5 Canvas API (custom drawing logic, no external canvas library) |
| Backend | Node.js + Express |
| Real-time transport | Socket.IO |
| Database | SQLite (stores the word list) |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Architecture Overview

### Why WebSockets instead of regular HTTP requests
Regular HTTP is request-response: the client asks, the server answers once, done. This game needs the **server to push updates instantly** — a new pen stroke, a correct guess, a countdown tick — to every player in a room the moment something happens, without anyone polling for it. Socket.IO is used for this; it also gives a built-in "rooms" concept, which maps directly onto each game room.

### Backend structure (OOP)
- **`GameManager`** — holds every active room in memory, keyed by a randomly generated room code. Creates and looks up rooms.
- **`Room`** — holds one room's full state: its player list, the current round number, whose turn it is to draw (`currentDrawerIndex`), the current word, the countdown timer, and the revealed-letters string used for hints.
- **`Player`** — a lightweight object: socket ID, name, score, and whether they've already guessed correctly this round.
- **`server.js`** — registers every Socket.IO event listener (create room, join room, start game, draw, guess, etc.) and drives the actual round/timer logic, calling into the classes above to read and update state.

### How drawing strokes sync in real time
Each tiny pen movement is sent as a single, self-contained `draw_line` event carrying both the start point and end point of that small line segment, plus the current color and brush size. The server doesn't interpret this at all — it's a pure relay: it immediately re-broadcasts the same event to everyone else in the room. Every receiving client redraws that exact segment using the same `beginPath → moveTo → lineTo → stroke` canvas calls, keeping every screen visually in sync. The drawer also draws the stroke locally the instant it happens, before the network round-trip, so their own screen never feels delayed.

On mobile, the canvas also listens for `touchstart` / `touchmove` / `touchend` alongside the desktop mouse events, with touch coordinates converted from page-relative to canvas-relative (and scaled correctly for the canvas's internal size vs. its on-screen display size), so drawing works correctly on phones and tablets, not just desktop.

### Turn order, rounds, and scoring
- Drawer order walks through the players array by index. Once every player has had a turn, the index wraps back to zero and the round counter increments — so "round" means one full lap through every player, not one individual turn.
- The real word is stored only on the server's `Room` object and sent only to the drawer's own socket; every other player receives a blanked, underscore version. Hints reveal individual letters at scheduled points during the countdown.
- A guess is checked server-side, case-insensitive and whitespace-trimmed, against the stored word — never trusting anything the client claims about its own correctness. The drawer is blocked from scoring off their own message, even if they type the word into chat.
- Points scale with how much time is left on the clock when a correct guess lands, rewarding faster guesses. The drawer also earns a smaller share of those points per correct guesser, rewarding a clear drawing.
- Only the host (the room's creator) can start the game.
- A player who joins after a round has already started is shown a "waiting for next round" state and can watch, but doesn't score until the next round begins fresh.

### Word list / SQLite
The word list lives in a SQLite database (`backend/src/db/words.db`), created and seeded automatically the first time the server starts. Random word choices for each round are queried directly from SQLite rather than from an in-memory array.

### Deployment
The frontend (static React build) is deployed on **Vercel**. The backend (Node + Socket.IO, which needs a persistent, always-running process — not serverless) is deployed on **Render**. The two are connected via environment variables: the backend's allowed CORS origin and the frontend's Socket.IO connection URL are both read from environment variables rather than hardcoded, so the same codebase works locally and in production without any code changes.

---

## Running Locally

### Backend
```bash
cd backend
npm install
npm start
```
Runs on `http://localhost:5000` by default. On first run, it automatically creates and seeds the SQLite word list.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` by default and connects to the local backend automatically.

### Environment variables (only needed for deployment, not local dev)
See `backend/.env.example` and `frontend/.env.example` for the two variables (`FRONTEND_URL` on the backend, `VITE_SOCKET_URL` on the frontend) used to point the deployed app at the right URLs.

---

## Known Limitations

- Room settings (max players, number of rounds, draw time, word count, hints) are currently fixed rather than host-configurable.
- All active game state (rooms, scores, current round) lives in memory — if the backend restarts, in-progress games are lost. Only the word list is persisted (via SQLite).
- No password-protected private rooms yet — a room is only as private as its code is hard to guess.
- No undo feature for drawing strokes yet (Clear Canvas is available).
