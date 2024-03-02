import { FastifyReply } from "fastify";
import { EnvValues } from "../plugins/env";

export const envFile = ".env" as const;

export const payloadServerError = (isProd: boolean) => {
  return {
    status: 500 as const,
    success: false as const,
    data: {
      success: false as const,
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

export const tokenName = "token" as const;

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

export const jwtConfig = (env: EnvValues) => {
  return {
    secret: env.tokenSecret,
    sign: {
      algorithm: env.tokenAlg,
      // exp for sign
      expiresIn: env.tokenSecondsExpiration,
      // disable inserting iat string in token
      noTimestamp: true,
    },
    verify: {
      // accept only this alg
      algorithms: [env.tokenAlg],
      // exp for verify
      maxAge: env.tokenSecondsExpiration,
    },
    cookie: {
      cookieName: tokenName,
      signed: false as const,
    },
  };
};

export const setTokenCookie = (
  reply: FastifyReply,
  token: { raw: string; exp: number }
) =>
  reply.setCookie(tokenName, token.raw, {
    maxAge: token.exp - Math.round(Date.now() / 1000),
    path: "/",
    secure: true as const,
    httpOnly: true as const,
    sameSite: true as const,
  });

export const clearTokenCookie = (reply: FastifyReply) =>
  reply.clearCookie(tokenName);
