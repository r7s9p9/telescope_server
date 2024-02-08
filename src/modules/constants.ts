import { FastifyReply } from "fastify";
import { UserId } from "./types";

export const userKeyPart = "user";

export const accountKeyPart = "account";

export const accountKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${accountKeyPart}`;

export const sessionHashKey = (userId: UserId, tokenExp: number) =>
  `user:${userId}:sessions:${tokenExp}`;
export const sessionSetKey = (userId: UserId) => `user:${userId}:sessions:all`;

export const payloadServerError = (isProd: boolean) => {
  return {
    status: 500 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["Internal Server Error"] as const }
        : undefined,
    },
  };
};

export const payloadWrongToken = (isProd: boolean) => {
  return {
    status: 401 as const,
    success: false as const,
    data: {
      dev: !isProd ? { message: ["Token is invalid"] as const } : undefined,
    },
  };
};

export const payloadBadUserAgent = (isProd: boolean) => {
  return {
    status: 401 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["User Agent is invalid"] as const }
        : undefined,
    },
  };
};

export const setTokenCookie = (
  response: FastifyReply,
  token: { raw: string }
) =>
  response.setCookie("accessToken", token.raw, {
    //domain: 'your.domain',
    //path: '/',
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });
