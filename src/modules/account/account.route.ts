import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { account } from "./account.controller";
import { routeSchema } from "./account.schema";

export async function accountReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/read",
    schema: routeSchema().read,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const accountAction = account(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await accountAction.read(
        req.session.token.id,
        req.body.userId,
        req.body.toRead
      );
      return res.code(result.status).send(result.data);
    },
  });
}

export async function accountUpdateRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/update",
    schema: routeSchema().update,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const accountAction = account(
        fastify.redis,
        fastify.env.isProd
      ).external();
      const result = await accountAction.update(
        req.session.token.id,
        req.body.toUpdate
      );
      return res.code(result.status).send(result.data);
    },
  });
}
