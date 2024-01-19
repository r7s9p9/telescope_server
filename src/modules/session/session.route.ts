import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { sessionSchema } from "./session.schema";
import { checkSession, refreshSession } from "./session.controller";
import { createToken, checkToken } from "../../utils/tokenCreator";
import {
  messageAboutServerError,
  messageAboutSessionOK,
  messageAboutSessionRefreshed,
  messageAboutWrongToken,
} from "../constants";

async function sessionRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["GET", "POST", "PATCH", "DELETE"],
    url: "/",
    schema: sessionSchema,
    preHandler: [fastify.checkToken],
    handler: async (req, res) => {
      const oldTokenData = await checkToken(req.user);
      if (!oldTokenData) {
        return messageAboutWrongToken;
      }
      const sessionResult = await checkSession(fastify.redis, {
        id: oldTokenData.id, // token from @fastify/jwt
        exp: oldTokenData.exp,
        ip: req.ip,
        ua: req.headers["user-agent"],
      });
      return res.code(sessionResult.status).send(sessionResult);
    },
  });
}

async function refreshSessionRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/refresh-session",
    schema: sessionSchema,
    preHandler: [fastify.checkToken],
    handler: async (req, res) => {
      const oldTokenData = await checkToken(req.user);
      if (!oldTokenData) {
        return messageAboutWrongToken;
      }
      const sessionResult = await checkSession(fastify.redis, {
        id: oldTokenData.id, // token from @fastify/jwt
        exp: oldTokenData.exp,
        ip: req.ip,
        ua: req.headers["user-agent"],
      });

      // To fix object uncomparability:
      // IMPORT messageAboutSessionOK FROM CONSTANTS EVERYWHERE !!!!!!!!!!
      if (sessionResult != messageAboutSessionOK) {
        return res.code(sessionResult.status).send(sessionResult);
      }
      if (sessionResult === messageAboutSessionOK) {
        const newTokenData = await createToken(fastify.jwt, oldTokenData.id);
        if (newTokenData) {
          if (oldTokenData.id !== newTokenData.id) {
            return res
              .code(messageAboutServerError.status)
              .send(messageAboutServerError);
          }
          await refreshSession(
            fastify.redis,
            oldTokenData.id,
            oldTokenData.exp,
            newTokenData.exp,
            req.headers["user-agent"],
            req.ip
          );
          return messageAboutSessionRefreshed(newTokenData.token);
        }
        return messageAboutServerError;
      }
    },
  });
}

export { sessionRoute, refreshSessionRoute };

// Add /refresh-session
// Add /code
