import {
  createContext,
  useState,
} from "react";

export const GameContext =
  createContext();

export function GameProvider({
  children,
}) {

  const [roomId, setRoomId] =
    useState("");

  const [playerName, setPlayerName] =
    useState("");

  const [players, setPlayers] =
    useState([]);

  const [drawerId, setDrawerId] =
    useState("");

  const [wordOptions, setWordOptions] =
    useState([]);

  const [wordLength, setWordLength] =
    useState(0);

  const [currentWord, setCurrentWord] =
  useState("");

  const [revealedWord, setRevealedWord] =
  useState("");

  const [leaderboard, setLeaderboard] =
  useState([]);

  const [messages, setMessages] =
    useState([]);

  const [round, setRound] =
  useState(1);
  
  const [winner, setWinner] =
  useState(null);

  const [timer, setTimer] =
    useState(60);

  // Fix 4: true for the short window between a player joining mid-game
  // and the next round actually starting. Used to show a "waiting for
  // next round" message instead of a half-correct guessing UI.
  const [joinedMidRound, setJoinedMidRound] =
    useState(false);

  return (
    <GameContext.Provider
      value={{
        roomId,
        setRoomId,

        playerName,
        setPlayerName,

        players,
        setPlayers,

        drawerId,
        setDrawerId,

        wordOptions,
        setWordOptions,

        wordLength,
        setWordLength,

        currentWord,
        setCurrentWord,

        revealedWord,
        setRevealedWord,

        leaderboard,
        setLeaderboard,

        messages,
        setMessages,

        round,
        setRound,
        
        winner,
        setWinner,

        timer,
        setTimer,

        joinedMidRound,
        setJoinedMidRound,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}