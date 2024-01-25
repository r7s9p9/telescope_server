import { UserId } from "./types";

// Session storage is implemented in two records:
// 1. Redis Set for a list of all sessions of one client.
// 2. Redis Hash for storing information about each session of one client.
// The value in the Redis Set corresponds to the last part
// of the key in the Redis Hash for the same session:

export const userKeyPart = "user";

export const sessionHashKey = (userId: UserId, tokenExp: number) =>
  `user:${userId}:sessions:${tokenExp}`;
export const sessionSetKey = (userId: UserId) => `user:${userId}:sessions:all`;

export const messageAboutServerError = {
  status: 500,
  error: { message: "Internal Server Error" },
};

export const messageAboutSessionOK = {
  status: 200,
  data: {
    message: "OK",
  },
};

export const messageAboutWrongToken = {
  status: 401,
  error: { message: "Token is invalid" },
};

export const messageAboutBadUserAgent = {
  status: 401,
  error: { message: "User Agent is invalid" },
};

export const messageAboutSessionRefreshed = (token: string) => {
  return {
    status: 200,
    data: {
      message: "Session Refreshed",
      accessToken: token,
    },
  };
};
