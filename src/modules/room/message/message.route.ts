import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { message } from "./message.controller";
import { routeSchema } from "./message.schema";

export async function messageReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/read",
    schema: routeSchema().read,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await messageAction.read(
        req.session.token.id,
        req.body.roomId,
        req.body.indexRange,
        req.body.createdRange
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
    schema: routeSchema().add,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(
        fastify.redis,
        fastify.env.isProd
      ).external();
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
    schema: routeSchema().update,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(
        fastify.redis,
        fastify.env.isProd
      ).external();
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
    schema: routeSchema().remove,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await messageAction.remove(
        req.session.token.id,
        req.body.roomId,
        req.body.created
      );
      return rep.code(result.status).send(result.data);
    },
  });
}

export async function messageCompareRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/compare",
    schema: routeSchema().compare,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, rep) => {
      const messageAction = message(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await messageAction.compare(
        req.session.token.id,
        req.body.roomId,
        req.body.toCompare
      );
      return rep.code(result.status).send(result.data);
    },
  });
}
