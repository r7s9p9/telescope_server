import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { block } from "./block.controller";
import { routeSchema } from "./block.schema";

export async function blockReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/block/read",
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const friendAction = block(fastify.redis, fastify.env.isProd).external();
      const result = await friendAction.read(req.session.token.id);
      return res.code(result.status).send(result.data);
    },
  });
}

export async function blockAddRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/block/add",
    schema: routeSchema().add,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const friendAction = block(fastify.redis, fastify.env.isProd).external();
      const result = await friendAction.add(
        req.session.token.id,
        req.body.targetUserId
      );
      return res.code(result.status).send(result.data);
    },
  });
}

export async function blockRemoveRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/block/remove",
    schema: routeSchema().remove,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const friendAction = block(fastify.redis, fastify.env.isProd).external();
      const result = await friendAction.remove(
        req.session.token.id,
        req.body.targetUserId
      );
      return res.code(result.status).send(result.data);
    },
  });
}
