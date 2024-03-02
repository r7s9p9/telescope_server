export type SessionId = string;

export type SessionInfo = {
  deviceName?: string;
  userAgent: string;
  ip: string;
  lastSeen: number;
  isFrozen: boolean;
  sessionId: string;
  isCurrent: boolean;
};

export type UpdateSessionInfo = {
  frozen?: "true" | "false";
  deviceName?: string;
};
