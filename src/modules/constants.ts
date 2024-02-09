import { FastifyReply } from "fastify";
import { UserId } from "./types";
import { EnvValues } from "../plugins/env";

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

export const jwtAlgorithms = [
  "HS256",
  "HS384",
  "HS512",
  "ES256",
  "ES384",
  "ES512",
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "EdDSA",
] as const;

export const jwtConfig = (config: EnvValues) => {
  return {
    secret: config.JWT_SECRET,
    sign: {
      algorithm: config.JWT_ALG,
      // exp for sign
      expiresIn: config.JWT_EXPIRATION,
      // disable inserting iat string in token
      noTimestamp: true,
    },
    verify: {
      // accept only this alg
      algorithms: [config.JWT_ALG],
      // exp for verify
      maxAge: config.JWT_EXPIRATION,
    },
    cookie: {
      cookieName: tokenName,
      signed: false as const,
    },
  };
};

export const setTokenCookie = (reply: FastifyReply, token: { raw: string }) =>
  reply.setCookie(tokenName, token.raw, {
    //domain:
    //path:
    secure: true as const,
    httpOnly: true as const,
    sameSite: "strict" as const,
  });
