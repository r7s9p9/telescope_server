import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { sessionSchema } from "./session.schema";
import { checkSession, refreshSession } from "./session.controller";
import { createToken, checkToken } from "../../utils/tokenActions";
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
        return res
          .code(messageAboutWrongToken.status)
          .send(messageAboutWrongToken);
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
          const result = messageAboutSessionRefreshed(newTokenData.token);
          return (
            res
              .setCookie("accessToken", result.data.accessToken, {
                //domain: 'your.domain',
                //path: '/',
                secure: true,
                httpOnly: true,
                sameSite: "strict",
              })
              .code(result.status)
              //.send(result.data); // accessToken needed only in cookie
              .send()
          );
        }
        return res
          .code(messageAboutServerError.status)
          .send(messageAboutServerError);
      }
    },
  });
}

export { sessionRoute, refreshSessionRoute };

// Add /refresh-session +
// Add /code
