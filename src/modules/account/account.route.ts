import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { account } from "./account.controller";
import { readAccountSchema, writeAccountSchema } from "./account.schema";

export async function accountReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/read",
    schema: readAccountSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const accountAction = account(fastify.redis, fastify.env.isProd);
      const result = await accountAction.readAccount(
        req.session.token.id,
        req.body.readUserId,
        req.body.readData
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
    schema: writeAccountSchema,
    preHandler: [fastify.sessionVerifier],
    handler: async (req, res) => {
      const accountAction = account(fastify.redis, fastify.env.isProd);
      const result = await accountAction.updateAccount(
        req.session.token.id,
        req.body.writeData
      );
      return res.code(result.status).send(result.data);
    },
  });
}
