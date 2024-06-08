import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyRedis from "@fastify/redis";
import { fastifyEnv } from "./plugins/env";
import jwt from "@fastify/jwt";
import { Token, Session } from "./modules/types";
import {
  clearTokenCookie,
  jwtConfig,
  payloadBadUserAgent,
  setTokenCookie,
} from "./modules/constants";
import { session } from "./modules/auth/session/session.controller";
import {
  authConfirmationCodeRoute,
  authLoginRoute,
  authRegisterRoute,
} from "./modules/auth/auth.route";
import {
  accountReadRoute,
  accountUpdateRoute,
} from "./modules/account/account.route";
import {
  roomInviteUsersRoute,
  roomBlockUsersRoute,
  roomCreateRoute,
  roomDeleteRoute,
  roomJoinRoute,
  roomKickUsersRoute,
  roomLeaveRoute,
  roomUnblockUsersRoute,
  roomUpdateRoute,
  roomReadUsersRoute,
  roomReadRoomInfoRoute,
  roomOverviewMyRoomsRoute,
  roomSearchRoute,
  roomBlockedUsersRoute,
} from "./modules/room/room.route";
import {
  messageAddRoute,
  messageCompareRoute,
  messageReadRoute,
  messageRemoveRoute,
  messageUpdateRoute,
} from "./modules/room/message/message.route";
import {
  friendAddRoute,
  friendReadRoute,
  friendRemoveRoute,
} from "./modules/account/friend/friend.route";
import {
  blockAddRoute,
  blockReadRoute,
  blockRemoveRoute,
} from "./modules/account/block/block.route";
import {
  sessionReadRoute,
  sessionRemoveRoute,
  sessionUpdateRoute,
} from "./modules/auth/session/session.route";

declare module "fastify" {
  export interface FastifyInstance {
    sessionVerifier: any; // Fix type
  }
  export interface FastifyRequest {
    ua: string;
    // The type of session value that goes into the controller
    // will always be exactly this, because if the session check fails,
    // the response to the client will be sent before the controller is executed
    session: Session;
    token: Token;
  }
}

const app = async () => {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(fastifyEnv);
  await fastify.register(fastifyCookie);
  await fastify.register(jwt, jwtConfig(fastify.env));

  fastify.addHook(
    "preSerialization",
    async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
      if (!fastify.env.isProd && request.session && payload.dev) {
        // Session info in dev
        payload.dev.session = request.session;
      }
      return payload;
    }
  );

  fastify.addHook(
    "preValidation",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.headers["user-agent"]) {
        const payload = payloadBadUserAgent(fastify.env.isProd);
        return reply.code(payload.status).send(payload.data);
      } else {
        request.ua = request.headers["user-agent"];
      }
    }
  );

  fastify.decorate(
    "sessionVerifier",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionAction = session(
          fastify.redis,
          fastify.env.isProd
        ).internal();
        const sessionData = await sessionAction.verifier(fastify, request);

        if (!sessionData.success) {
          clearTokenCookie(reply);
          return reply
            .code(sessionData.status)
            .send(!fastify.env.isProd ? sessionData : {});
        }
        if (sessionData.token.isNew) {
          setTokenCookie(reply, sessionData.token);
        }
        request.session = sessionData;
      } catch (e) {
        if (!fastify.env.isProd) {
          return reply.send(e);
        } else {
          return reply.code(500).send({});
        }
      }
    }
  );

  await fastify.register(fastifyRedis, {
    host: "redis",
  });

  await fastify.register(authRegisterRoute);
  await fastify.register(authLoginRoute);
  await fastify.register(authConfirmationCodeRoute);

  await fastify.register(sessionReadRoute);
  await fastify.register(sessionUpdateRoute);
  await fastify.register(sessionRemoveRoute);

  await fastify.register(accountReadRoute);
  await fastify.register(accountUpdateRoute);

  await fastify.register(friendReadRoute);
  await fastify.register(friendAddRoute);
  await fastify.register(friendRemoveRoute);

  await fastify.register(blockReadRoute);
  await fastify.register(blockAddRoute);
  await fastify.register(blockRemoveRoute);

  await fastify.register(roomOverviewMyRoomsRoute);
  await fastify.register(roomSearchRoute);
  await fastify.register(roomReadRoomInfoRoute);
  await fastify.register(roomCreateRoute);
  await fastify.register(roomUpdateRoute);
  await fastify.register(roomReadUsersRoute);
  await fastify.register(roomKickUsersRoute);
  await fastify.register(roomBlockedUsersRoute);
  await fastify.register(roomBlockUsersRoute);
  await fastify.register(roomUnblockUsersRoute);
  await fastify.register(roomJoinRoute);
  await fastify.register(roomLeaveRoute);
  await fastify.register(roomInviteUsersRoute);
  await fastify.register(roomDeleteRoute);

  await fastify.register(messageReadRoute);
  await fastify.register(messageAddRoute);
  await fastify.register(messageUpdateRoute);
  await fastify.register(messageRemoveRoute);
  await fastify.register(messageCompareRoute);

  fastify.listen(
    { host: fastify.env.appHost, port: parseInt(fastify.env.appPort) },
    function (err) {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
    }
  );
};

app();
