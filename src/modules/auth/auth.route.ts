import { FastifyInstance, FastifyReply } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerSchema, loginSchema, codeSchema } from "./auth.schema";
import { auth } from "./auth.controller";
import { setTokenCookie, messageAboutBadUserAgent } from "../constants";

export async function authRegisterRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/register",
    schema: registerSchema,
    handler: async (req, res) => {
      const result = await auth(
        fastify.redis,
        fastify.config.APP_IS_PROD
      ).registerHandler(req.body);
      return res.code(result.status).send(result.data);
    },
  });
}

export async function authLoginRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/login",
    schema: loginSchema,
    handler: async (req, res) => {
      if (!req.headers["user-agent"]) {
        return res
          .code(messageAboutBadUserAgent(fastify.config.APP_IS_PROD).status)
          .send(messageAboutBadUserAgent(fastify.config.APP_IS_PROD).data);
      }

      const result = await auth(
        fastify.redis,
        fastify.config.APP_IS_PROD
      ).loginHandler(fastify.jwt, req.ip, req.headers["user-agent"], req.body);

      if (result.success && "token" in result) {
        setTokenCookie(res, result.token);
        return res.code(result.status).send(result.data);
      }
      // Error || need verification code
      return res.code(result.status).send(result.data);
    },
  });
}

export async function authCodeRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/code",
    schema: codeSchema,
    handler: async (req, res) => {
      if (!req.headers["user-agent"]) {
        return res
          .code(messageAboutBadUserAgent(fastify.config.APP_IS_PROD).status)
          .send(messageAboutBadUserAgent(fastify.config.APP_IS_PROD).data);
      }
      const result = await auth(
        fastify.redis,
        fastify.config.APP_IS_PROD
      ).codeHandler(fastify.jwt, req.body, req.ip, req.headers["user-agent"]);
      if (result.success) {
        setTokenCookie(res, result.token);
        return res.code(result.status).send(result.data);
      } else {
        return res.code(result.status).send(result.data);
      }
    },
  });
}
