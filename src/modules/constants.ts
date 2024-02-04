import { UserId } from "./types";

export const userKeyPart = "user";

export const accountKeyPart = "account";

export const accountKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${accountKeyPart}`;

export const sessionHashKey = (userId: UserId, tokenExp: number) =>
  `user:${userId}:sessions:${tokenExp}`;
export const sessionSetKey = (userId: UserId) => `user:${userId}:sessions:all`;

export const messageAboutServerError = {
  status: 500 as const,
  success: false as const,
  data: { error: { message: "Internal Server Error" as const } },
};

export const messageAboutSessionOK = {
  status: 200 as const,
  success: true as const,
  data: {
    message: "OK" as const,
  },
};

export const messageAboutWrongToken = {
  status: 401 as const,
  success: false as const,
  data: { error: { message: "Token is invalid" as const } },
};

export const messageAboutBadUserAgent = {
  status: 401 as const,
  success: false as const,
  data: { error: { message: "User Agent is invalid" as const } },
};
