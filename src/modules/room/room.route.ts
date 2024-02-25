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
  readMyRoomsSchema,
  readRoomInfoSchema,
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
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.createRoom(
        req.session.token.id,
        req.body.roomInfo,
        req.body.userIdArr
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomReadRoomInfoRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/read-info",
    schema: readRoomInfoSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      // const roomAction = room(fastify.redis, fastify.env.isProd).external();
      // const result = await roomAction.readRooms(
      //   req.session.token.id,
      //   req.body.range
      // );
      // return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomReadMyRoomsRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/read-my-rooms",
    schema: readMyRoomsSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.readMyRooms(
        req.session.token.id,
        req.body.range
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
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.updateRoomInfo(
        req.session.token.id,
        req.body.roomId,
        req.body.toWrite
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomReadUsersRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/users",
    schema: getUsersRoomSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.readUsers(
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
    url: "/api/room/kick",
    schema: kickUsersRoomSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
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
    url: "/api/room/block",
    schema: blockUsersRoomSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
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
    url: "/api/room/unblock",
    schema: unblockUsersRoomSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
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
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
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
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.leaveRoom(
        req.session.token.id,
        req.body.roomId
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomInviteUsersRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/invite",
    schema: inviteUsersRoomSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.inviteUsers(
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
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.deleteRoom(
        req.session.token.id,
        req.body.roomId
      );
      return rep.code(result.status).send(result.data);
    },
  });
}
