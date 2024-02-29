import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { friend } from "./friend.controller";
import { routeSchema } from "./friend.schema";

export async function friendReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/friend/read",
    schema: routeSchema().read,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const friendAction = friend(fastify.redis, fastify.env.isProd).external();
      const result = await friendAction.read(
        req.session.token.id,
        req.body.targetUserId
      );
      return res.code(result.status).send(result.data);
    },
  });
}

export async function friendAddRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/friend/add",
    schema: routeSchema().add,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const friendAction = friend(fastify.redis, fastify.env.isProd).external();
      const result = await friendAction.add(
        req.session.token.id,
        req.body.targetUserId
      );
      return res.code(result.status).send(result.data);
    },
  });
}

export async function friendRemoveRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/friend/remove",
    schema: routeSchema().remove,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const friendAction = friend(fastify.redis, fastify.env.isProd).external();
      const result = await friendAction.remove(
        req.session.token.id,
        req.body.targetUserId
      );
      return res.code(result.status).send(result.data);
    },
  });
}
