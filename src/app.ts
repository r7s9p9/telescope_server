import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyRedis from "@fastify/redis";
import { fastifyEnv } from "./plugins/env";
import jwt from "@fastify/jwt";
import { authRoute } from "./modules/auth/auth.route";
import {
  sessionRoute,
  refreshSessionRoute,
} from "./modules/session/session.route";

import { Token } from "./modules/types";
import { roomRoute } from "./modules/room/room.route";

declare module "fastify" {
  export interface FastifyInstance {
    checkToken: any; // TODO fix type
  }
}

declare module "@fastify/jwt" {
  export interface fastifyJWT {
    user: Token;
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
      // creating tokens
      algorithm: fastify.config.JWT_ALG,
      expiresIn: fastify.config.JWT_EXPIRATION, // for client-side logic
      noTimestamp: true, // disable iat inserting in token
      //clockTimestamp: Date.now(),
    },
    verify: {
      // checking tokens
      algorithms: [fastify.config.JWT_ALG], // allow only this alg
      maxAge: fastify.config.JWT_EXPIRATION,
    },
    cookie: {
      cookieName: "accessToken",
      signed: false,
    },
  });

  fastify.decorate(
    "checkToken",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify<Token>({ onlyCookie: true });
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

  await fastify.register(authRoute, { prefix: "api" }); // for login / register
  await fastify.register(sessionRoute, { prefix: "api" }); // session validation
  await fastify.register(refreshSessionRoute, { prefix: "api" });

  await fastify.register(roomRoute, { prefix: "api" });

  fastify.listen({ port: parseInt(fastify.config.APP_PORT) }, function (err) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
};

app();
