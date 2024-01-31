import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { room } from "./room.controller";
import { createRoomSchema } from "./room.schema";

export async function roomCreateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/create",
    schema: createRoomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, res) => {
      if ("token" in req.session) {
        // const roomInfo: RoomInfoValues = {
        //   name: "someRoom",
        //   creatorId: req.session.token.id,
        //   type: "single",
        //   about: "nope",
        // };

        const result = await room(fastify.redis).initRoom(
          fastify.redis,
          req.body.roomInfo,
          req.body.userIdArr
        );
        return res.code(200).send(result);
      } else return res.code(req.session.status).send(req.session);
    },
  });
}

export async function roomUpdateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/update",
    //schema: roomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, res) => {
      if ("token" in req.session) {
        // empty
      } else return res.code(req.session.status).send(req.session);
    },
  });
}

export async function roomDeleteRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/room/delete",
    //schema: roomSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, res) => {
      if ("token" in req.session) {
        // empty
      } else return res.code(req.session.status).send(req.session);
    },
  });
}
