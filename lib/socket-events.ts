// Shared Socket.IO event types for collaborative pick sessions

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  status: "picking" | "done";
  progress: number;
}

export interface SessionInfo {
  code: string;
  hostName: string;
  status: "active" | "completed" | "cancelled";
  totalGames: number;
  players: PlayerInfo[];
}

// Events from client to server
export interface ClientToServerEvents {
  "join-session": (data: { sessionCode: string; playerId: string }) => void;
  "start-picking": (data: { sessionCode: string }) => void;
  "player-progress": (data: { sessionCode: string; playerId: string; progress: number }) => void;
  "player-done": (data: { sessionCode: string; playerId: string }) => void;
  "end-session": (data: { sessionCode: string; playerId: string }) => void;
}

// Events from server to client
export interface ServerToClientEvents {
  "session-update": (data: SessionInfo) => void;
  "player-joined": (data: PlayerInfo) => void;
  "picking-started": (data: { sessionCode: string }) => void;
  "player-progress-update": (data: { playerId: string; progress: number }) => void;
  "player-completed": (data: { playerId: string }) => void;
  "session-ended": (data: { sessionCode: string }) => void;
  "error": (data: { message: string }) => void;
}

// Socket data stored on connection
export interface SocketData {
  sessionCode?: string;
  playerId?: string;
}
