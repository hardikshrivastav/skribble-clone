import {
  useContext,
  useEffect,
} from "react";

import {
  GameContext,
} from "../context/GameContext";

import {
  socket,
} from "../services/socket";

import DrawingCanvas
from "../components/DrawingCanvas";

import ChatBox
from "../components/ChatBox";

function Game() {

  const {

    roomId,

    drawerId,
    setDrawerId,

    currentWord,
    setCurrentWord,

    revealedWord,
    setRevealedWord,

    wordOptions,
    setWordOptions,

    wordLength,
    setWordLength,

    leaderboard,
    setLeaderboard,

    timer,
    setTimer,

    messages,
    setMessages,

    round,
    setRound,

    winner,
    setWinner,

    joinedMidRound,
    setJoinedMidRound,

  } =
    useContext(
      GameContext
    );

  useEffect(() => {

    socket.on(
      "game_started",
      (data) => {
        setDrawerId(
          data.drawerId
        );
        setRevealedWord("");
      }
    );

    socket.on(
      "choose_word",
      (words) => {
        setWordOptions(words);
      }
    );

    socket.on(
      "round_started",
      (data) => {

        setWordLength(
          data.wordLength
        );

        if (
          data.currentWord
        ) {
          setCurrentWord(
            data.currentWord
          );
        }
      }
    );

    socket.on(
      "timer_update",
      (time) => {
        setTimer(time);
      }
    );
    socket.on(
      "word_hint",
      (hint) => {
        setRevealedWord(hint);
      }
    );

    socket.on(
      "next_round",
      (data) => {

        setRound(
          data.round
        );

        setDrawerId(
          data.drawerId
        );

        setWordOptions([]);
        setWordLength(0);
        setCurrentWord("");
        setRevealedWord("");

        // Fix 4: by the time a brand-new round starts, a player who
        // joined mid-game has now seen a full round from the start, so
        // the "waiting for next round" state no longer applies.
        setJoinedMidRound(false);

      }
    );

    socket.on(
      "score_update",
      (players) => {

        setLeaderboard(
          [...players].sort(
            (a, b) =>
              b.score -
              a.score
          )
        );

      }
    );

    socket.on(
      "clear_chat",
      () => {
        setMessages([]);
      }
    );

    socket.on(
      "game_over",
      (players) => {

        const winner =
          [...players].sort(
            (a, b) =>
              b.score -
              a.score
          )[0];

        setWinner(
          winner
        );

      }
    );

    socket.on(
      "game_restarted",
      () => {
        window.location.reload();
      }
    );

    return () => {

      socket.off(
        "game_started"
      );

      socket.off(
        "choose_word"
      );

      socket.off(
        "round_started"
      );

      socket.off(
        "timer_update"
      );

      socket.off(
        "word_hint"
      );

      socket.off(
        "next_round"
      );

      socket.off(
        "score_update"
      );

      socket.off(
        "clear_chat"
      );

      socket.off(
        "game_over"
      );

      socket.off(
        "game_restarted"
      );

    };

  }, []);

  const chooseWord =
    (word) => {

      socket.emit(
        "word_selected",
        {
          roomId,
          word,
        }
      );

    };

  const isDrawer =
    socket.id === drawerId;

  if (winner) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-10 text-center text-white shadow-2xl">

          <h1 className="text-5xl font-bold mb-6">
            🏆 Game Over
          </h1>

          <h2 className="text-3xl mb-4">
            Winner:
            {" "}
            {winner.name}
          </h2>

          <h3 className="text-2xl mb-8">
            Score:
            {" "}
            {winner.score}
          </h3>

          <button
            className="px-8 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold transition"
            onClick={() => {

              setWinner(null);
              setCurrentWord("");
              setWordOptions([]);
              setRevealedWord("");
              setWordLength(0);
              setRound(1);
              setTimer(60);
              setMessages([]);

              socket.emit(
                "start_game",
                {
                  roomId,
                }
              );

            }}
          >
            🔄 Play Again
          </button>

        </div>

      </div>

    );

  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white p-4">

      <div className="max-w-7xl mx-auto">

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-xl mb-6">

          <h1 className="text-4xl font-bold text-center mb-6">
            🎨 Skribbl 
          </h1>

          <div className="grid md:grid-cols-3 gap-4">

            <div className="bg-white/10 rounded-xl p-4 text-center">
              <h3 className="text-gray-300">
                Round
              </h3>
              <p className="text-3xl font-bold">
                {round}
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 text-center">
              <h3 className="text-gray-300">
                Room
              </h3>
              <p className="font-bold">
                {roomId}
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 text-center">
              <h3 className="text-gray-300">
                Timer
              </h3>

              <p
                className={`text-3xl font-bold ${
                  timer <= 10
                    ? "text-red-400 animate-pulse"
                    : "text-green-400"
                }`}
              >
                ⏳ {timer}
              </p>

            </div>

          </div>

        </div>

        {
          joinedMidRound && (

            <div className="bg-yellow-500/20 border border-yellow-400/40 backdrop-blur-lg rounded-3xl p-4 mb-6 text-center">

              <p className="text-yellow-200 font-semibold">
                👀 You joined mid-round — you can watch, but guessing
                and scoring will start next round.
              </p>

            </div>

          )
        }

        {
          wordOptions.length > 0 && (

            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 text-center">

              <h2 className="text-2xl font-bold mb-4">
                Choose a Word
              </h2>

              <div className="flex flex-wrap justify-center gap-4">

                {
                  wordOptions.map(
                    (word) => (

                      <button
                        key={word}
                        onClick={() =>
                          chooseWord(word)
                        }
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold transition"
                      >
                        {word}
                      </button>

                    )
                  )
                }

              </div>

            </div>

          )
        }

        {
          wordLength > 0 && (

            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 mb-6 text-center">

              <h2 className="text-3xl tracking-widest font-bold">

                {
                  isDrawer
                    ? `✏️ ${currentWord}`
                    : (
                      revealedWord
                      ? revealedWord
                      .split("")
                      .join(" ")

                    
                    : "_ ".repeat(
                        wordLength
                      )
                    )
                }

              </h2>

            </div>

          )
        }

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 mb-6">

          <h2 className="text-2xl font-bold mb-4">
            🏆 Leaderboard
          </h2>

          <div className="space-y-3">

            {
              leaderboard.map(
                (player, index) => (

                  <div
                    key={
                      player.socketId
                    }
                    className="flex justify-between bg-white/10 p-3 rounded-xl"
                  >

                    <span>

                      {
                        index === 0
                          ? "🥇 "
                          : index === 1
                          ? "🥈 "
                          : index === 2
                          ? "🥉 "
                          : ""
                      }

                      {player.name}

                    </span>

                    <span>
                      {player.score}
                    </span>

                  </div>

                )
              )
            }

          </div>

        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          <div className="flex-1">
            <DrawingCanvas />
          </div>

          <div>
            <ChatBox />
          </div>

        </div>

      </div>

    </div>

  );

}

export default Game;