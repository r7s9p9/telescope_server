import { FastifyReply } from "fastify";
import { UserId } from "./types";
import { JWTConfig } from "../plugins/env";

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
    message: !isProd ? (["Token is invalid"] as const) : undefined,
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

export const tokenName = "accessToken" as const;

export const jwtConfig = (config: JWTConfig) => {
  return {
    secret: config.JWT_SECRET,
    sign: {
      algorithm: config.JWT_ALG,
      expiresIn: config.JWT_EXPIRATION, // for client-side logic
      noTimestamp: true, // disable iat inserting in token
    },
    verify: {
      algorithms: [config.JWT_ALG], // accept only this alg
      maxAge: config.JWT_EXPIRATION,
    },
    cookie: {
      cookieName: tokenName,
      signed: false,
    },
  };
};

export const setTokenCookie = (reply: FastifyReply, token: { raw: string }) =>
  reply.setCookie(tokenName, token.raw, {
    //domain: 'your.domain',
    //path: '/',
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });
