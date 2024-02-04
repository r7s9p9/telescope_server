import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerSchema, loginSchema, codeSchema } from "./auth.schema";
import { auth } from "./auth.controller";
import { messageAboutBadUserAgent } from "../constants";

interface LoginResult {
  status: number;
  data: {
    message: string;
    accessToken?: string;
  };
}

export async function authRegisterRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/api/auth/register",
    schema: registerSchema,
    handler: async (req, res) => {
      const result = await auth(fastify.redis).registerHandler(req.body);
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
          .code(messageAboutBadUserAgent.status)
          .send(messageAboutBadUserAgent.data);
      }

      const result = await auth(fastify.redis).loginHandler(
        fastify.jwt,
        req.ip,
        req.headers["user-agent"],
        req.body
      );

      if (result.success) {
        if ("token" in result) {
          return res
            .setCookie("accessToken", result.token.raw, {
              //domain: 'your.domain',
              //path: '/',
              secure: true,
              httpOnly: true,
              sameSite: "strict",
            })
            .code(result.status)
            .send(result.data);
        }
      }
      // Error OR need verification code
      return res.code(result.status).send(result);
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
          .code(messageAboutBadUserAgent.status)
          .send(messageAboutBadUserAgent.data);
      }
      const result = await auth(fastify.redis).codeHandler(
        fastify.jwt,
        req.body,
        req.ip,
        req.headers["user-agent"]
      );
      if (result.success) {
        return res
          .setCookie("accessToken", result.token.raw, {
            //domain: 'your.domain',
            //path: '/',
            secure: true,
            httpOnly: true,
            sameSite: "strict",
          })
          .code(result.status)
          .send(result.data);
      } else {
        return res.code(result.status).send(result.data);
      }
    },
  });
}
