import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { message } from "./message.controller";
import {
  addMessageSchema,
  checkMessageSchema,
  readMessagesSchema,
  removeMessageSchema,
  updateMessageSchema,
} from "./message.schema";

export async function messageReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/read",
    schema: readMessagesSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(fastify.redis, fastify.env.isProd);
      const result = await messageAction.read(
        req.session.token.id,
        req.body.roomId,
        req.body.range
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function messageAddRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/add",
    schema: addMessageSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(fastify.redis, fastify.env.isProd);
      const result = await messageAction.add(
        req.session.token.id,
        req.body.roomId,
        req.body.message
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function messageUpdateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/update",
    schema: updateMessageSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(fastify.redis, fastify.env.isProd);
      const result = await messageAction.update(
        req.session.token.id,
        req.body.roomId,
        req.body.message
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function messageRemoveRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/remove",
    schema: removeMessageSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(fastify.redis, fastify.env.isProd);
      const result = await messageAction.remove(
        req.session.token.id,
        req.body.roomId,
        req.body.created
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function messageCheckRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/check",
    schema: checkMessageSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(fastify.redis, fastify.env.isProd);
      const result = await messageAction.check(
        req.session.token.id,
        req.body.roomId,
        req.body.toCheck
      );
      return rep.code(result.status).send(result.data);
    },
  });
}
