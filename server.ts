import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  SessionInfo,
  PlayerInfo,
} from "./lib/socket-events";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory session state for real-time updates
// This is synced with the database but kept in memory for fast WebSocket broadcasts
const sessionPlayers: Map<string, Map<string, PlayerInfo>> = new Map();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: dev ? ["http://localhost:3000"] : [],
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-session", async ({ sessionCode, playerId }) => {
      // Join the socket room for this session
      socket.join(sessionCode);
      socket.data.sessionCode = sessionCode;
      socket.data.playerId = playerId;

      // Initialize session players map if not exists
      if (!sessionPlayers.has(sessionCode)) {
        sessionPlayers.set(sessionCode, new Map());
      }

      // Fetch player info from database and cache it
      try {
        const response = await fetch(`http://${hostname}:${port}/api/pick/sessions/${sessionCode}`);
        if (response.ok) {
          const data = await response.json();
          const sessionInfo: SessionInfo = {
            code: sessionCode,
            hostName: data.session.hostName,
            status: data.session.status,
            totalGames: data.games.length,
            players: data.players.map((p: PlayerInfo) => ({
              id: p.id,
              name: p.name,
              isHost: p.isHost,
              status: p.status,
              progress: p.progress,
            })),
          };

          // Update in-memory cache
          const playersMap = sessionPlayers.get(sessionCode)!;
          for (const player of sessionInfo.players) {
            playersMap.set(player.id, player);
          }

          // Notify all clients in the session
          io.to(sessionCode).emit("session-update", sessionInfo);

          // Notify about the specific player that joined
          const joinedPlayer = sessionInfo.players.find((p) => p.id === playerId);
          if (joinedPlayer) {
            socket.to(sessionCode).emit("player-joined", joinedPlayer);
          }
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        socket.emit("error", { message: "Failed to join session" });
      }
    });

    socket.on("start-picking", ({ sessionCode }) => {
      // Broadcast to all clients in the session that picking has started
      io.to(sessionCode).emit("picking-started", { sessionCode });
    });

    socket.on("player-progress", ({ sessionCode, playerId, progress }) => {
      const playersMap = sessionPlayers.get(sessionCode);
      if (playersMap) {
        const player = playersMap.get(playerId);
        if (player) {
          player.progress = progress;
          playersMap.set(playerId, player);
        }
      }

      // Broadcast progress to all clients in the session
      io.to(sessionCode).emit("player-progress-update", { playerId, progress });
    });

    socket.on("player-done", ({ sessionCode, playerId }) => {
      const playersMap = sessionPlayers.get(sessionCode);
      if (playersMap) {
        const player = playersMap.get(playerId);
        if (player) {
          player.status = "done";
          playersMap.set(playerId, player);
        }
      }

      // Broadcast completion to all clients
      io.to(sessionCode).emit("player-completed", { playerId });
    });

    socket.on("end-session", ({ sessionCode }) => {
      // Broadcast session end to all clients
      io.to(sessionCode).emit("session-ended", { sessionCode });

      // Clean up in-memory state
      sessionPlayers.delete(sessionCode);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Make io available globally for API routes to emit events
  (global as unknown as { io: typeof io }).io = io;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server running on /api/socketio`);
  });
});
