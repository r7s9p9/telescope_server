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

declare module "fastify" {
  export interface FastifyInstance {
    checkToken: any; // TODO fix type
    checkSession: any;
  }
  export interface FastifyRequest {
    session: goodSession;
    token: Token;
    //user: string | object | Buffer; // this is token with content from fastify/jwt
  }
}

// declare module "@fastify/jwt" {
//   export interface fastifyJWT {
//     user: Token; // Change user to some other naming
//   }
// }

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
      //clockTimestamp: Date.now(),
    },
    verify: {
      algorithms: [fastify.config.JWT_ALG], // only this alg
      maxAge: fastify.config.JWT_EXPIRATION,
    },
    cookie: {
      cookieName: "accessToken",
      signed: false,
    },
  });

  fastify.addHook(
    "preSerialization",
    async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
      // Temp inverting constant
      // if (fastify.config.APP_IS_PROD) {
      //   const devError = payload?.devError;
      //   const regularDevMessage = payload?.devMessage;
      //   if (!devError && !regularDevMessage) {
      //     return payload;
      //   }
      //   if (devError) {
      //     delete payload.devError;
      //   }
      //   if (regularDevMessage) {
      //     delete payload.devMessage;
      //   }
      // }
      return payload;
    }
  );

  fastify.decorate(
    "checkSession",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await session(
          fastify.redis,
          fastify.config.APP_IS_PROD
        ).sessionWrapper(fastify, request);
        if (result.success) {
          request.session = result;
          if (result.token.isNew) {
            reply.setCookie("accessToken", result.token.raw, {
              secure: true,
              httpOnly: true,
              sameSite: "strict",
            });
          }
        } else {
          return reply.code(result.status).send(result.data);
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
