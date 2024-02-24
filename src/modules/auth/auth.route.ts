import { FastifyInstance, FastifyReply } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerSchema, loginSchema, codeSchema } from "./auth.schema";
import { auth } from "./auth.controller";
import { setTokenCookie, payloadBadUserAgent } from "../constants";

export async function authRegisterRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/register",
    schema: registerSchema,
    handler: async (request, reply) => {
      const authActions = auth(fastify.redis, fastify.env.isProd).external();
      const result = await authActions.register(
        request.body.email,
        request.body.username,
        request.body.password
      );
      return reply.code(result.status).send(result.data);
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
    handler: async (request, reply) => {
      const authActions = auth(fastify.redis, fastify.env.isProd).external();
      const { payload, tokenData } = await authActions.login(
        fastify.jwt,
        request.ip,
        request.ua,
        request.body.email,
        request.body.password
      );
      if (tokenData) setTokenCookie(reply, tokenData);
      return reply.code(payload.status).send(payload.data);
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
      const authActions = auth(fastify.redis, fastify.env.isProd).external();
      const { payload, tokenData } = await authActions.code(
        fastify.jwt,
        req.ip,
        req.ua,
        req.body.email,
        req.body.code
      );
      if (tokenData) setTokenCookie(res, tokenData);
      return res.code(payload.status).send(payload.data);
    },
  });
}
