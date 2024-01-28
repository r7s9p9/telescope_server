import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { readAccount } from "./account.controller";
import { readAccountSchema, writeAccountSchema } from "./account.schema";
import { sessionWrapper } from "../auth/session/session.controller";

async function accountReadRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/account/read",
    schema: readAccountSchema,
    preHandler: [fastify.checkToken],
    handler: async (req, res) => {
      const session = await sessionWrapper(
        fastify.redis,
        req.user,
        req.ip,
        req.headers["user-agent"]
      );
      if ("token" in session) {
        const result = await readAccount(
          fastify.redis,
          req.body.readData,
          session.token.id,
          req.body.readUserId
        );
        return res.code(200).send(result);
      } else return res.code(session.status).send(session);
    },
  });
}

async function accountWriteRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["GET"],
    url: "/api/account/write",
    schema: writeAccountSchema, // Need fix schema
    preHandler: [fastify.checkToken],
    handler: async (req, res) => {
      const session = await sessionWrapper(
        fastify.redis,
        req.user,
        req.ip,
        req.headers["user-agent"]
      );
      if ("token" in session) {
        const result = await readAccount(
          fastify.redis,
          req.body.writeData,
          session.token.id,
          req.body.writeUserId
        );
        return res.code(200).send(result);
      } else return res.code(session.status).send(session);
    },
  });
}

export { accountReadRoute };
