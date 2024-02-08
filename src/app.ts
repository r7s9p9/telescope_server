import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyRedis from "@fastify/redis";
import { fastifyEnv } from "./plugins/env";
import jwt from "@fastify/jwt";
import { Token, goodSession } from "./modules/types";
import { session } from "./modules/auth/session/session.controller";
import {
  authCodeRoute,
  authLoginRoute,
  authRegisterRoute,
} from "./modules/auth/auth.route";
import {
  accountReadRoute,
  accountUpdateRoute,
} from "./modules/account/account.route";
import {
  roomCreateRoute,
  roomDeleteRoute,
  roomUpdateRoute,
} from "./modules/room/room.route";
import { payloadBadUserAgent, setTokenCookie } from "./modules/constants";

declare module "fastify" {
  export interface FastifyInstance {
    checkToken: any; // TODO fix type
    checkSession: any;
  }
  export interface FastifyRequest {
    ua: string;
    session: goodSession;
    token: Token;
  }
}

const app = async () => {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(fastifyEnv);

  await fastify.register(fastifyCookie);

  await fastify.register(jwt, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      algorithm: fastify.config.JWT_ALG,
      expiresIn: fastify.config.JWT_EXPIRATION, // for client-side logic
      noTimestamp: true, // disable iat inserting in token
    },
    verify: {
      algorithms: [fastify.config.JWT_ALG], // accept only this alg
      maxAge: fastify.config.JWT_EXPIRATION,
    },
    cookie: {
      cookieName: "accessToken",
      signed: false,
    },
  });

  const isProd = fastify.config.APP_IS_PROD;

  fastify.addHook(
    "preSerialization",
    async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
      if (!isProd) {
        if (request.session && payload.dev) {
          payload.dev.session = request.session;
        }
      }
      return payload;
    }
  );

  fastify.addHook(
    "preValidation",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.headers["user-agent"]) {
        const payload = payloadBadUserAgent(isProd);
        return reply.code(payload.status).send(payload.data);
      } else {
        request.ua = request.headers["user-agent"];
      }
    }
  );

  fastify.decorate(
    "checkSession",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionData = await session(fastify.redis, isProd).sessionWrapper(
          fastify,
          request
        );
        if (sessionData.success) {
          if (sessionData.token.isNew) {
            setTokenCookie(reply, sessionData.token);
          }
          request.session = sessionData;
        } else {
          return reply
            .code(sessionData.status)
            .send(!isProd ? sessionData : undefined);
        }
      } catch (e) {
        return reply.send(e);
      }
    }
  );

  await fastify.register(fastifyRedis, {
    host: "localhost",
    //password: 'your strong password here',
    //port: 6379,
    //family: 4   // (IPv4) or 6 (IPv6)
  });

  await fastify.register(authRegisterRoute);
  await fastify.register(authLoginRoute);
  await fastify.register(authCodeRoute);

  await fastify.register(accountReadRoute);
  await fastify.register(accountUpdateRoute);

  await fastify.register(roomCreateRoute);
  await fastify.register(roomUpdateRoute);
  await fastify.register(roomDeleteRoute);

  fastify.listen({ port: parseInt(fastify.config.APP_PORT) }, function (err) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
};

app();
