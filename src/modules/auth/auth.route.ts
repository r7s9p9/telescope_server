import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerSchema, loginSchema, codeSchema } from "./auth.schema";
import { auth } from "./auth.controller";

const userAgentError = {
  status: 401,
  data: {
    message: "No user agent in header",
  },
};

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
      return res.code(result.status).send(result);
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
        return res.code(userAgentError.status).send(userAgentError.data);
      }

      const result = await auth(fastify.redis).loginHandler(
        fastify.jwt,
        req.ip,
        req.headers["user-agent"],
        req.body
      );

      if ("data" in result) {
        if ("accessToken" in result.data) {
          console.log(result.data.accessToken);
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
        return res.code(result.status).send(result.data);
      }
      if ("error" in result) {
        return res.code(result.status).send(result.error);
      }
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
        return res.code(userAgentError.status).send(userAgentError.data);
      }
      const result = await auth(fastify.redis).codeHandler(
        fastify.jwt,
        req.body,
        req.ip,
        req.headers["user-agent"]
      );
      if ("data" in result) {
        if ("accessToken" in result.data) {
          console.log(result.data.accessToken);
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
        return res.code(result.status).send(result.data);
      }
      if ("error" in result) {
        return res.code(result.status).send(result.error);
      }
    },
  });
}
