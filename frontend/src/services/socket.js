import { io } from "socket.io-client";

// Deploy fix 3: in production this must point at your deployed backend
// (e.g. https://your-skribbl-backend.onrender.com), not localhost. Vite
// exposes env variables prefixed with VITE_ through import.meta.env, read
// at build time. Set VITE_SOCKET_URL in your deployment platform's
// environment variables (e.g. in Vercel's project settings) before
// building/deploying the frontend. Locally, if it's not set, this falls
// back to localhost:5000 exactly like before.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});