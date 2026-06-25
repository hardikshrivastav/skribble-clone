import {
  useState,
  useEffect,
  useContext,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  socket,
} from "../services/socket";

import {
  GameContext,
} from "../context/GameContext";

function Home() {

  const navigate =
    useNavigate();

  const {
    setRoomId,
    setPlayers,
    setPlayerName,
    setJoinedMidRound,
    setDrawerId,
    setRound,
    setTimer,
    setWordLength,
    setRevealedWord,
  } =
    useContext(
      GameContext
    );

  const [
    playerName,
    setLocalPlayerName,
  ] = useState("");

  const [
    roomCode,
    setRoomCode,
  ] = useState("");

  useEffect(() => {

    socket.on(
      "room_created",
      (data) => {

        localStorage.setItem(
          "roomId",
          data.roomId
        );

        setRoomId(
          data.roomId
        );

        setPlayers(
          data.players
        );

        navigate(
          "/lobby"
        );

      }
    );

    socket.on(
      "player_joined",
      (data) => {

        setPlayers(
          data.players
        );

        navigate(
          "/lobby"
        );

      }
    );

    // Fix 4: if the room we just joined already has a game in progress,
    // the server sends this right after player_joined with the current
    // round/timer/drawer/word-length info, so we can skip the lobby
    // (there's no lobby to wait in — the game is already running) and go
    // straight to the game screen with the right state instead of a blank
    // or stale one.
    socket.on(
      "joined_mid_game",
      (data) => {

        setJoinedMidRound(true);
        setDrawerId(data.drawerId || "");
        setRound(data.round || 1);
        setTimer(data.timer || 60);
        setWordLength(data.wordLength || 0);
        setRevealedWord(data.revealedWord || "");

        navigate(
          "/game"
        );

      }
    );

    socket.on(
      "error_message",
      (message) => {

        alert(
          message
        );

      }
    );

    return () => {

      socket.off(
        "room_created"
      );

      socket.off(
        "player_joined"
      );

      socket.off(
        "joined_mid_game"
      );

      socket.off(
        "error_message"
      );

    };

  }, []);

  const createRoom =
    () => {

      if (
        !playerName.trim()
      ) {

        alert(
          "Enter name"
        );

        return;
      }

      setPlayerName(
        playerName
      );

      socket.connect();

      socket.emit(
        "create_room",
        {
          playerName,
        }
      );

    };

  const joinRoom =
    () => {

      if (
        !playerName.trim()
      ) {

        alert(
          "Enter name"
        );

        return;
      }

      if (
        !roomCode.trim()
      ) {

        alert(
          "Enter room code"
        );

        return;
      }

      localStorage.setItem(
        "roomId",
        roomCode.toUpperCase()
      );

      setPlayerName(
        playerName
      );

      setRoomId(
        roomCode.toUpperCase()
      );

      socket.connect();

      socket.emit(
        "join_room",
        {
          roomId:
            roomCode.toUpperCase(),

          playerName,
        }
      );

    };

  return (

    <div
      className="
      min-h-screen
      flex
      items-center
      justify-center
      bg-gradient-to-br
      from-indigo-600
      via-purple-600
      to-pink-500
      p-4
      "
    >

      <div
        className="
        w-full
        max-w-md
        backdrop-blur-xl
        bg-white/20
        border
        border-white/30
        rounded-3xl
        shadow-2xl
        p-8
        "
      >

        <div className="text-center">

          <h1
            className="
            text-4xl
            font-bold
            text-white
            mb-2
            "
          >
            🎨 Skribbl 
          </h1>

          <p
            className="
            text-white/80
            mb-8
            "
          >
            Draw, Guess & Win
          </p>

        </div>

        <div className="space-y-4">

          <input
            type="text"
            placeholder="Enter Your Name"
            value={playerName}
            onChange={(e) =>
              setLocalPlayerName(
                e.target.value
              )
            }
            className="
            w-full
            p-4
            rounded-xl
            bg-white/90
            outline-none
            text-gray-800
            font-medium
            "
          />

          <button
            onClick={
              createRoom
            }
            className="
            w-full
            p-4
            rounded-xl
            bg-green-500
            text-white
            font-bold
            hover:scale-105
            transition-all
            duration-200
            shadow-lg
            "
          >
            ➕ Create Room
          </button>

        </div>

        <div
          className="
          flex
          items-center
          my-6
          "
        >
          <div className="flex-1 border-t border-white/30"></div>

          <span
            className="
            px-4
            text-white
            "
          >
            OR
          </span>

          <div className="flex-1 border-t border-white/30"></div>
        </div>

        <div className="space-y-4">

          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) =>
              setRoomCode(
                e.target.value
              )
            }
            className="
            w-full
            p-4
            rounded-xl
            bg-white/90
            outline-none
            text-gray-800
            font-medium
            uppercase
            "
          />

          <button
            onClick={
              joinRoom
            }
            className="
            w-full
            p-4
            rounded-xl
            bg-blue-500
            text-white
            font-bold
            hover:scale-105
            transition-all
            duration-200
            shadow-lg
            "
          >
            🚪 Join Room
          </button>

        </div>

      </div>

    </div>

  );

}

export default Home;