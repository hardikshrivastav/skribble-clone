const getRandomWords =
require("./src/game/getRandomWords");

const { initDatabase } =
require("./src/db/database");

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const GameManager =
require("./src/game/GameManager");

const Player =
require("./src/game/Player");

const app = express();

app.use(cors());

const server =
http.createServer(app);

// Deploy fix 1: the allowed CORS origin must be the REAL deployed frontend
// URL in production (e.g. https://your-skribbl.vercel.app), not localhost.
// We read it from an environment variable so this works correctly on
// whatever platform you deploy to, while still defaulting to the local
// Vite dev server address so nothing changes for local development.
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
  },
});

const gameManager =
new GameManager();
function startRoundTimer(
  room,
  io
) {

  room.timer = 60;

  const interval =
    setInterval(() => {

      room.timer--;
      if (
        room.currentWord
      ) {
        const revealTimes =
        [45, 30, 15];
        if (
          revealTimes.includes(
            room.timer
          )
        ) {
          let hiddenIndexes =
          [];
          for (
            let i = 0;
            i <
            room.currentWord.length;
            i++
          ) {
            if (
              room.revealedWord[i] ===
              "_"
            ) {
              hiddenIndexes.push(i);
            }
          }
          if (
            hiddenIndexes.length >
            0
          ) {
            const randomIndex =
            hiddenIndexes[
              Math.floor(
                Math.random() *
                hiddenIndexes.length
              )
            ];
            const chars =
            room.revealedWord.split("");
            chars[randomIndex] =
            room.currentWord[randomIndex];
            room.revealedWord =
            chars.join("");
            io.to(
              room.roomId
            ).emit(
              "word_hint",
              room.revealedWord
            );
          }
        }
      }
      io.to(
        room.roomId
      ).emit(
        "timer_update",
        room.timer
      );
      if (
        room.currentWord &&
        (
          room.timer === 40 ||
          room.timer === 20
        )
      ) {
        const hiddenIndexes = [];
        for (
          let i = 0;
          i < room.currentWord.length;
          i++
        ) {
          if (
            room.revealedWord[i] === "_"
          ) {
            hiddenIndexes.push(i);
          }
        }
        if (
          hiddenIndexes.length > 0
        ) {
          const randomIndex =
          hiddenIndexes[
            Math.floor(
              Math.random() *
              hiddenIndexes.length
            )
          ];
          let revealed =
          room.revealedWord.split("");
          revealed[randomIndex] =
          room.currentWord[randomIndex];
          room.revealedWord =
          revealed.join("");
          io.to(
            room.roomId
          ).emit(
            "letter_revealed",
            room.revealedWord
          );
        }
      }

      if (
        room.timer <= 0
      ) {

        clearInterval(
          interval
        );

        room.nextDrawer();
        room.currentWord = "";
        io.to(room.roomId).emit(
          "clear_canvas"
        );

        if (
          room.round >
          room.maxRounds
        ) {

          io.to(
            room.roomId
          ).emit(
            "game_over",
            room.players
          );

          return;
        }

        const drawer =
          room.getCurrentDrawer();

        io.to(
          room.roomId
        ).emit(
          "next_round",
          {
            round:
              room.round,

            drawerId:
              drawer.socketId,
          }
        );

        // getRandomWords() now queries SQLite and returns a Promise, so it
        // must be awaited. setInterval's callback itself can't be async,
        // so we wrap just this part in an immediately-invoked async
        // function — everything else in this tick stays exactly the same.
        (async () => {
          const words =
            await getRandomWords();

          setTimeout(() => {

            io.to(
              drawer.socketId
            ).emit(
              "choose_word",
              words
            );

          }, 500);
        })();

      }

    }, 1000);

}

app.get("/", (req, res) => {
  res.send(
    "Skribbl Clone Backend Running"
  );
});

io.on("connection", (socket) => {

  console.log(
    "Connected:",
    socket.id
  );

  // CREATE ROOM
  socket.on(
    "create_room",
    ({ playerName }) => {

      const room =
        gameManager.createRoom(
          socket.id
        );

      const player =
        new Player(
          socket.id,
          playerName
        );

      room.addPlayer(player);

      socket.join(room.roomId);

      socket.emit(
        "room_created",
        {
          roomId:
            room.roomId,

          players:
            room.players,
        }
      );

      console.log(
        "Room Created:",
        room.roomId
      );

    }
  );

  // JOIN ROOM
  socket.on(
    "join_room",
    ({
      roomId,
      playerName,
    }) => {

      const room =
        gameManager.getRoom(
          roomId
        );

      if (!room) {

        socket.emit(
          "error_message",
          "Room not found"
        );

        return;
      }

      const player =
        new Player(
          socket.id,
          playerName
        );

      // Room.addPlayer (see Room.js) already detects if a game is in
      // progress and marks this player with joinedMidRound + hasGuessed
      // so they can't score on a round they didn't see the start of.
      room.addPlayer(player);

      socket.join(roomId);

      io.to(roomId).emit(
        "player_joined",
        {
          players:
            room.players,
        }
      );

      // Fix 4: if a game is already running, this player's screen would
      // otherwise stay blank (no word length, no timer, no drawer) until
      // the next round naturally starts. We bring them up to speed
      // immediately with the current state, and tell their client
      // specifically that they joined mid-round so the UI can show a
      // "waiting for the next round" message instead of a guessing box.
      if (room.gameStarted) {
        const currentDrawer = room.getCurrentDrawer();

        socket.emit("joined_mid_game", {
          round: room.round,
          maxRounds: room.maxRounds,
          timer: room.timer,
          drawerId: currentDrawer ? currentDrawer.socketId : null,
          drawerName: currentDrawer ? currentDrawer.name : null,
          wordLength: room.currentWord ? room.currentWord.length : 0,
          revealedWord: room.revealedWord || "",
        });
      }

      console.log(
        `${playerName} joined ${roomId}`
      );

    }
  );

  // START GAME
  socket.on(
    "start_game",
    async ({ roomId }) => {
      const room =
      gameManager.getRoom(
        roomId
      );
      if (!room) return;

      // Fix 2: only the player who created the room (the host) is allowed
      // to start the game. Anyone else triggering this event is rejected
      // with a clear error so the frontend can show a message instead of
      // silently doing nothing.
      if (socket.id !== room.hostId) {
        socket.emit(
          "error_message",
          "Only the host can start the game"
        );
        return;
      }

      // RESET GAME STATE
      room.gameStarted = true;
      room.currentWord = "";
      room.round = 1;
      room.timer = 60;
      room.currentDrawerIndex = 0;
      room.players.forEach(
        (player) => {
          player.score = 0;
          player.hasGuessed = false;
          player.joinedMidRound = false;
        }
      );
      io.to(roomId).emit(
        "score_update",
        room.players
      );

      io.to(roomId).emit(
        "clear_chat"
      );
      const drawer =
      room.getCurrentDrawer();
      const words =
      await getRandomWords();

      // This emit triggers Lobby.jsx's navigate("/game") — it needs to
      // fire now, before the page transition, not bundled with the
      // second emit below. (A previous edit incorrectly removed this as
      // "redundant" — it isn't; see the comment on the second emit.)
      io.to(roomId).emit(
        "game_started",
        {
          drawerId:
          drawer.socketId,
          drawerName:
          drawer.name,
        }
      );

      setTimeout(() => {
        // This second, identical-looking emit is what Game.jsx's
        // game_started listener actually catches, since Game.jsx only
        // mounts (and attaches its listener) AFTER the navigate above
        // happens. Without this one, the drawer's screen never gets
        // drawerId set and choose_word never has anywhere to land.
        io.to(roomId).emit(
          "game_started",
          {
            drawerId:
            drawer.socketId,
            drawerName:
            drawer.name,
          }
        );
        io.to(
          drawer.socketId
        ).emit(
          "choose_word",
          words
        );
      }, 500);
    }
  );

  // WORD SELECTED
  socket.on(
    "word_selected",
    ({
      roomId,
      word,
    }) => {

      const room =
        gameManager.getRoom(
          roomId
        );

      if (!room) return;

      room.currentWord =word;
      room.revealedWord =
      "_".repeat(
        word.length
      );

      io.to(roomId).emit(
        "letter_revealed",
        room.revealedWord
      );


      room.players.forEach((player) => {
        player.hasGuessed = false;
        player.joinedMidRound = false;
      });
      io.to(roomId).emit(
        "clear_canvas"
      );

      io.to(roomId).emit(
        "round_started",
        {
          wordLength:
          word.length,
        }
      );
      const drawer =
      room.getCurrentDrawer();
      io.to(
        drawer.socketId
      ).emit(
        "round_started",
        {
          wordLength:
          word.length,
          currentWord:
          word,
        }
      );
      io.to(roomId).emit(
        "timer_update",
        60
      );
      startRoundTimer(room,
        io
      );
      

      console.log(
        "WORD SELECTED:",
        word
      );

    }
  );

  // DRAWING
  socket.on(
    "draw_line",
    (data) => {

      socket.to(
        data.roomId
      ).emit(
        "draw_line",
        data
      );

    }
  );
  socket.on(
    "clear_canvas",
    ({ roomId }) => {
      io.to(roomId).emit(
        "clear_canvas"
      );
    }
  );

  // CHAT GUESS
socket.on(
  "send_guess",
  ({
    roomId,
    playerName,
    guess,
  }) => {

    const room =
      gameManager.getRoom(
        roomId
      );

    if (!room) return;

    // Fix 1: the drawer should never be able to score by typing the word
    // themselves. We check this BEFORE the match check so the drawer's
    // message is always treated as a normal chat message, never as a
    // guess attempt, regardless of what they type.
    const currentDrawer =
      room.getCurrentDrawer();

    const isDrawer =
      currentDrawer &&
      currentDrawer.socketId === socket.id;

    if (
      !isDrawer &&
      room.currentWord &&
      // Fix 3: trim whitespace on both sides in addition to lowercasing,
      // so a guess like " apple " or "apple " still matches correctly.
      guess.trim().toLowerCase() ===
      room.currentWord.trim().toLowerCase()
    ) {
      const player =
      room.players.find(
        (p) =>
          p.socketId ===
          socket.id
        );
        if (
          player &&
          !player.hasGuessed
        ) {
          const points =
          Math.max(
            10,
            Math.floor(
              room.timer * 2
            )
          );
          player.score += points;
          const drawer =
          room.getCurrentDrawer();
          if (
            drawer &&
            drawer.socketId !== player.socketId
          ) {
            const drawerPlayer =
            room.players.find(
              (p) =>
                p.socketId ===
              drawer.socketId
            );
            if (drawerPlayer) {
              drawerPlayer.score +=
              Math.floor(
                points * 0.25
              );
            }
          }
          player.hasGuessed =
          true;
        }
      io.to(roomId).emit(
        "score_update",
        room.players
      );
      io.to(roomId).emit(
        "correct_guess",
        {
          playerName,
        }
  );

  return;
}

    io.to(roomId).emit(
      "new_message",
      {
        playerName,
        message: guess,
      }
    );

  }
);

  // DISCONNECT
  socket.on(
    "disconnect",
    () => {

      console.log(
        "Disconnected:",
        socket.id
      );

      Object.values(
        gameManager.rooms
      ).forEach(
        (room) => {

          room.removePlayer(
            socket.id
          );

          io.to(
            room.roomId
          ).emit(
            "player_joined",
            {
              players:
                room.players,
            }
          );

        }
      );

    }
  );
  socket.on(
    "restart_game",
    ({ roomId }) => {
      const room =
      gameManager.getRoom(
        roomId
      );
      if (!room) return;
      room.round = 1;
      room.currentDrawerIndex = 0;
      room.players.forEach(
        (player) => {
          player.score = 0;
          player.hasGuessed =
          false;
          player.joinedMidRound = false;
        }
      );
      io.to(roomId).emit(
        "game_restarted"
      );
    }
  );

});

// Fix 5: SQLite is now actually used to store the word list. We make sure
// the words table exists (and is seeded the very first time) BEFORE the
// server starts accepting connections, so getRandomWords() never runs
// against an empty/uncreated table.

// Deploy fix 2: Render/Railway (and most hosting platforms) assign the
// port to listen on dynamically via process.env.PORT — they will NOT let
// you pick your own fixed port like 5000 in production. Locally, where
// PORT isn't set, this still falls back to 5000 exactly like before.
const PORT = process.env.PORT || 5000;

initDatabase()
  .then(() => {
    server.listen(PORT, () => {

      console.log(
        `Server running on port ${PORT}`
      );

    });
  })
  .catch((err) => {
    console.error("Failed to initialize database, server not started:", err);
    process.exit(1);
  });