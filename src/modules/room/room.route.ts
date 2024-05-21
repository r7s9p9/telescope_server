import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { room } from "./room.controller";
import { routeSchema } from "./room.schema";

export async function roomCreateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/create",
    schema: routeSchema().createRoom,
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
    schema: routeSchema().readRoomInfo,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.readRoomInfo(
        req.session.token.id,
        req.body.roomId
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomSearchRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/search",
    schema: routeSchema().searchRooms,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.search(
        req.session.token.id,
        req.body.limit,
        req.body.offset,
        req.body.q
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function roomOverviewMyRoomsRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/overview-my-rooms",
    schema: routeSchema().readMyRooms,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.roomsOverview(
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
    schema: routeSchema().updateRoomInfo,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.updateRoomInfo(
        req.session.token.id,
        req.body.roomId,
        req.body.info
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
    url: "/api/room/members",
    schema: routeSchema().getMembers,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.getMembers(
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
    schema: routeSchema().kickUsers,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.kickUsers(
        req.session.token.id,
        req.body.roomId,
        req.body.userIds
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
    schema: routeSchema().blockUsers,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.blockUsers(
        req.session.token.id,
        req.body.roomId,
        req.body.userIds
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
    schema: routeSchema().unblockUsers,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.unblockUsers(
        req.session.token.id,
        req.body.roomId,
        req.body.userIds
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
    schema: routeSchema().joinRoom,
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
    schema: routeSchema().leaveRoom,
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
    schema: routeSchema().inviteUsers,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const roomAction = room(fastify.redis, fastify.env.isProd).external();
      const result = await roomAction.inviteUsers(
        req.session.token.id,
        req.body.roomId,
        req.body.userIds
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
    schema: routeSchema().deleteRoom,
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
