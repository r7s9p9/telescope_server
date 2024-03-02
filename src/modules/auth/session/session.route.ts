import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { session } from "./session.controller";
import { routeSchema } from "./session.schema";

export async function sessionReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/session/read",
    preHandler: [fastify.sessionVerifier],
    handler: async (request, reply) => {
      const sessionAction = session(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await sessionAction.read(request.session);
      return reply.code(result.status).send(result.data);
    },
  });
}

export async function sessionUpdateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/session/update",
    schema: routeSchema().update,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const sessionAction = session(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await sessionAction.update(
        req.session,
        req.body.sessionId,
        req.body.toUpdate
      );
      return res.code(result.status).send(result.data);
    },
  });
}

export async function sessionRemoveRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/session/remove",
    schema: routeSchema().remove,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const sessionAction = session(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await sessionAction.remove(
        req.session,
        req.body.sessionId
      );
      return res.code(result.status).send(result.data);
    },
  });
}
