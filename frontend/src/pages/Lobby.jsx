import {
  useContext,
  useEffect,
} from "react";

import { useNavigate }
from "react-router-dom";

import {
  GameContext,
} from "../context/GameContext";

import { socket }
from "../services/socket";

function Lobby() {

  const navigate =
    useNavigate();

  const {
    roomId,
    players,
    setPlayers,
  } = useContext(GameContext);

  // The players array is built in join order, and the very first entry is
  // always the player who created the room (the host) — this is the same
  // assumption the crown badge below already uses. We reuse it here so the
  // Start Game button only renders for the host, matching the server-side
  // check in start_game that rejects anyone else.
  const isHost =
    players.length > 0 &&
    players[0].socketId === socket.id;

  useEffect(() => {

    socket.on(
      "player_joined",
      (data) => {
        setPlayers(
          data.players
        );
      }
    );

    socket.on(
      "game_started",
      () => {
        navigate("/game");
      }
    );

    // If a non-host somehow triggers start_game (e.g. by calling the
    // socket event directly), the server now rejects it and sends this
    // error back so we can show a clear message instead of nothing
    // happening.
    socket.on(
      "error_message",
      (message) => {
        alert(message);
      }
    );

    return () => {

      socket.off(
        "player_joined"
      );

      socket.off(
        "game_started"
      );

      socket.off(
        "error_message"
      );

    };

  }, []);

  const startGame = () => {

    socket.emit(
      "start_game",
      {
        roomId,
      }
    );
  };

  const copyRoomCode =
    () => {

      navigator.clipboard.writeText(
        roomId
      );

      alert(
        "Room Code Copied!"
      );

    };

  return (

    <div
      className="
      min-h-screen
      bg-gradient-to-br
      from-indigo-900
      via-purple-900
      to-pink-900
      flex
      items-center
      justify-center
      p-4
    "
    >

      <div
        className="
        w-full
        max-w-2xl
        backdrop-blur-lg
        bg-white/10
        border
        border-white/20
        rounded-3xl
        p-8
        shadow-2xl
        text-white
      "
      >

        <h1
          className="
          text-4xl
          font-bold
          text-center
          mb-6
        "
        >
          🎮 Game Lobby
        </h1>

        <div
          className="
          flex
          flex-col
          md:flex-row
          items-center
          justify-between
          gap-4
          mb-8
        "
        >

          <h2
            className="
            text-xl
            font-semibold
          "
          >
            Room:
            {" "}
            {roomId}
          </h2>

          <button
            onClick={
              copyRoomCode
            }
            className="
            px-4
            py-2
            bg-blue-500
            hover:bg-blue-600
            rounded-xl
            font-semibold
            transition
          "
          >
            📋 Copy Code
          </button>

        </div>

        <h3
          className="
          text-2xl
          font-bold
          mb-4
        "
        >
          Players
        </h3>

        <div
          className="
          space-y-3
          mb-8
        "
        >

          {players.map(
            (
              player,
              index
            ) => (

              <div
                key={
                  player.socketId
                }
                className="
                bg-white/10
                rounded-xl
                p-4
                flex
                justify-between
                items-center
              "
              >

                <span
                  className="
                  text-lg
                "
                >
                  {player.name}
                </span>

                {index === 0 && (

                  <span
                    className="
                    bg-yellow-400
                    text-black
                    px-3
                    py-1
                    rounded-full
                    font-bold
                    text-sm
                  "
                  >
                    👑 Host
                  </span>

                )}

              </div>

            )
          )}

        </div>

        {isHost ? (
          <button
            onClick={
              startGame
            }
            className="
            w-full
            py-4
            text-xl
            font-bold
            rounded-2xl
            bg-green-500
            hover:bg-green-600
            transition
            shadow-lg
          "
          >
            🚀 Start Game
          </button>
        ) : (
          <p
            className="
            text-center
            text-white/70
            font-medium
          "
          >
            ⏳ Waiting for the host to start the game...
          </p>
        )}

      </div>

    </div>

  );

}

export default Lobby;