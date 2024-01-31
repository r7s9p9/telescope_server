import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyRedis from "@fastify/redis";
import { fastifyEnv } from "./plugins/env";
import jwt from "@fastify/jwt";
import { authCodeRoute, authRoute } from "./modules/auth/auth.route";

import { Token } from "./modules/types";
import { roomRoute } from "./modules/room/room.route";
import { accountReadRoute } from "./modules/account/account.route";
import { session } from "./modules/auth/session/session.controller";

type Session =
  | {
      status: number;
      error: {
        message: string;
      };
    }
  | {
      token: {
        id: any;
        exp: any;
      };
    };

declare module "fastify" {
  export interface FastifyInstance {
    checkToken: any; // TODO fix type
    checkSession: any;
  }
  export interface FastifyRequest {
    session: Session;
    user: string | object | Buffer; // this is token with content from fastify/jwt
  }
}

declare module "@fastify/jwt" {
  export interface fastifyJWT {
    user: Token; // Change user to some other naming
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

  // Separate `await request.jwtVerify<Token>({ onlyCookie: true });`

  fastify.decorate(
    "checkSession",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify<Token>({ onlyCookie: true });
        const s = session(fastify.redis);
        const result = await s.sessionWrapper(
          fastify.jwt,
          fastify.config.JWT_DAYS_OF_TOKEN_TO_BE_UPDATED,
          request.user, // token from user
          request.ip,
          request.headers["user-agent"]
        );
        if (result && "token" in result) {
          request.session = result;
        }
        if (result && "newToken" in result) {
          request.session = {
            token: { id: result.newToken.id, exp: result.newToken.exp },
          };
          reply.setCookie("accessToken", result.newToken.raw, {
            secure: true,
            httpOnly: true,
            sameSite: "strict",
          });
        }
        if (result && "error" in result) {
          return reply.code(result.status).send(result);
        }
      } catch (e) {
        return reply.send(e);
      }
    }
  );

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

  await fastify.register(authRoute); // for login / register

  await fastify.register(authCodeRoute);

  await fastify.register(accountReadRoute);

  await fastify.register(roomRoute, { prefix: "api" });

  fastify.listen({ port: parseInt(fastify.config.APP_PORT) }, function (err) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
};

app();
