import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { message } from "./message.controller";
import { addMessageSchema } from "./message.schema";

export async function messageAddRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["POST"],
    url: "/api/message/add",
    schema: addMessageSchema,
    preHandler: [fastify.checkSession],
    handler: async (req, rep) => {
      const messageAction = message(fastify.redis, fastify.env.APP_IS_PROD);
      const result = await messageAction.add(
        req.session.token.id,
        req.body.roomId,
        req.body.content
      );
      return rep.code(result.status).send(result.data);
    },
  });
}
