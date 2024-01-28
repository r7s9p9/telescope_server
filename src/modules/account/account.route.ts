import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { readAccount } from "./account.controller";
import { readAccountSchema, writeAccountSchema } from "./account.schema";

async function accountReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/read",
    schema: readAccountSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, res) => {
      if ("token" in req.session) {
        const result = await readAccount(
          fastify.redis,
          req.body.readData,
          req.session.token.id,
          req.body.readUserId
        );
        return res.code(200).send(result);
      } else return res.code(req.session.status).send(req.session);
    },
  });
}

async function accountWriteRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/write",
    schema: writeAccountSchema, // Need fix schema
    preHandler: [fastify.checkSession],
    handler: async (req, res) => {
      if ("token" in req.session) {
        const result = await readAccount(
          fastify.redis,
          req.body.writeData,
          req.session.token.id,
          req.body.writeUserId
        );
        return res.code(200).send(result);
      } else return res.code(req.session.status).send(req.session);
    },
  });
}

export { accountReadRoute };
