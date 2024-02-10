import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { room } from "./room.controller";
import {
  blockUsersRoomSchema,
  createRoomSchema,
  deleteRoomSchema,
  getUsersRoomSchema,
  inviteUsersRoomSchema,
  joinRoomSchema,
  kickUsersRoomSchema,
  leaveRoomSchema,
  readRoomSchema,
  unblockUsersRoomSchema,
  updateRoomSchema,
} from "./room.schema";

export async function roomCreateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/create",
    schema: createRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.createRoom(
        req.session.token.id,
        req.body.roomInfo,
        req.body.userIdArr
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/read",
    schema: readRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.readRoomInfo(
        req.session.token.id,
        req.body.roomId,
        req.body.toRead
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomUpdateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/update",
    schema: updateRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.updateRoomInfo(
        req.session.token.id,
        req.body.roomId,
        req.body.toWrite
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomGetUsersRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/get-users",
    schema: getUsersRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.readRoomUsers(
        req.session.token.id,
        req.body.roomId
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomKickUsersRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/kick-users",
    schema: kickUsersRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.kickUsers(
        req.session.token.id,
        req.body.roomId,
        req.body.toKick
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomBlockUsersRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/block-users",
    schema: blockUsersRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.blockUsers(
        req.session.token.id,
        req.body.roomId,
        req.body.toBlock
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomUnblockUsersRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/unblock-users",
    schema: unblockUsersRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.unblockUsers(
        req.session.token.id,
        req.body.roomId,
        req.body.toUnblock
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomJoinRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/join",
    schema: joinRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.joinRoom(
        req.session.token.id,
        req.body.roomId
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomLeaveRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/leave",
    schema: leaveRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.leaveRoom(
        req.session.token.id,
        req.body.roomId
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function inviteUsersRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/invite-users",
    schema: inviteUsersRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.inviteUsersWrapper(
        req.session.token.id,
        req.body.roomId,
        req.body.toInvite
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomDeleteRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/delete",
    schema: deleteRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await roomAction.deleteRoom(
        req.session.token.id,
        req.body.roomId
      );
      return rep.code(result.status).send(result.data);
    },
  });
}
