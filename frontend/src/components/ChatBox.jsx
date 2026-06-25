import {
  useState,
  useContext,
  useEffect,
} from "react";

import {
  GameContext,
} from "../context/GameContext";

import {
  socket,
} from "../services/socket";

function ChatBox() {

  const {
    roomId,
    playerName,

    drawerId,

    messages,
    setMessages,
  } =
    useContext(
      GameContext
    );

  // Mirrors the same check already used in Game.jsx and DrawingCanvas.jsx,
  // and now enforced server-side too (see Fix 1 in server.js's send_guess
  // handler) — the drawer should never be guessing their own word.
  const isDrawer =
    socket.id === drawerId;

  const [guess, setGuess] =
    useState("");

  useEffect(() => {

    socket.on(
      "new_message",
      (data) => {

        setMessages(
          (prev) => [
            ...prev,
            data,
          ]
        );

      }
    );

    socket.on(
      "correct_guess",
      (data) => {

        setMessages(
          (prev) => [
            ...prev,
            {
              playerName:
                "SYSTEM",

              message:
                `${data.playerName} guessed correctly!`,
            },
          ]
        );

      }
    );

    return () => {

      socket.off(
        "new_message"
      );

      socket.off(
        "correct_guess"
      );

    };

  }, []);

  const sendGuess =
    () => {

      if (
        !guess.trim()
      )
        return;

      socket.emit(
        "send_guess",
        {
          roomId,
          playerName,
          guess,
        }
      );

      setGuess("");

    };

  return (

    <div
      className="
        w-full
        lg:w-[350px]
        bg-white/10
        backdrop-blur-lg
        border
        border-white/20
        rounded-3xl
        p-4
        shadow-2xl
      "
    >

      <h2 className="text-2xl font-bold text-white mb-4">
        💬 Chat
      </h2>

      <div
        className="
          h-[400px]
          overflow-y-auto
          bg-black/20
          rounded-2xl
          p-3
          mb-4
          space-y-2
        "
      >

        {
          messages.map(
            (
              msg,
              index
            ) => (

              <div
                key={index}
                className={`
                  p-2
                  rounded-xl
                  break-words
                  ${
                    msg.playerName ===
                    "SYSTEM"
                      ? "bg-green-500/30"
                      : "bg-white/10"
                  }
                `}
              >

                <strong>
                  {
                    msg.playerName
                  }
                </strong>

                <span>
                  {" "}
                  :
                  {" "}
                  {
                    msg.message
                  }
                </span>

              </div>

            )
          )
        }

      </div>

      <div className="flex gap-2">

        <input
          value={guess}
          onChange={(e) =>
            setGuess(
              e.target.value
            )
          }
          placeholder={
            isDrawer
              ? "Chat (your messages can't score)..."
              : "Type guess..."
          }
          className="
            flex-1
            px-4
            py-3
            rounded-xl
            bg-white/20
            text-white
            placeholder-gray-300
            outline-none
          "
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              sendGuess();
            }
          }}
        />

        <button
          onClick={
            sendGuess
          }
          className="
            px-5
            py-3
            bg-blue-500
            hover:bg-blue-600
            rounded-xl
            font-bold
            transition
          "
        >
          Send
        </button>

      </div>

    </div>

  );

}

export default ChatBox;