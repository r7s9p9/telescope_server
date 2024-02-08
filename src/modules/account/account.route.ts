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
    preHandler: [fastify.checkSession],
    handler: async (req, res) => {
      const a = account(fastify.redis, fastify.config.APP_IS_PROD);
      const result = await a.readAccount(
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
    preHandler: [fastify.checkSession],
    handler: async (req, res) => {
      const a = account(fastify.redis, fastify.config.APP_IS_PROD);
      const result = await a.updateAccount(
        req.session.token.id,
        req.body.writeData
      );
      return res.code(result.status).send(result.data);
    },
  });
}
