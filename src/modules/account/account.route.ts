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
      const result = await account(fastify.redis).readAccount(
        req.body.readData,
        req.session.token.id,
        req.body.readUserId
      );
      return res.code(200).send(result);
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
      const result = await account(fastify.redis).updateAccount(
        req.body.writeData,
        req.session.token.id
      );
      return res.code(200).send(result);
    },
  });
}
