import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { auth } from "./auth.controller";
import { setTokenCookie } from "../constants";
import { routeSchema } from "./auth.schema";

export async function authRegisterRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/register",
    schema: routeSchema().register,
    handler: async (request, reply) => {
      const authAction = auth(fastify.redis, fastify.env.isProd).external();
      const payload = await authAction.register(
        request.body.email,
        request.body.username,
        request.body.password
      );
      return reply.code(payload.status).send(payload.data);
    },
  });
}

export async function authLoginRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/login",
    schema: routeSchema().login,
    handler: async (request, reply) => {
      const authAction = auth(fastify.redis, fastify.env.isProd).external();
      const { payload, tokenData } = await authAction.login(
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

export async function authConfirmationCodeRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/code",
    schema: routeSchema().confirmationCode,
    handler: async (req, res) => {
      const authAction = auth(fastify.redis, fastify.env.isProd).external();
      const { payload, tokenData } = await authAction.code(
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
