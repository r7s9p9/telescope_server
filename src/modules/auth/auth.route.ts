import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerSchema, loginSchema } from "./auth.schema";
import { loginHandler, registerHandler } from "./auth.controller";

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

async function authRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/register",
    schema: registerSchema,
    handler: async (req, res) => {
      const result = await registerHandler(fastify.redis, req.body);
      return res.code(result.status).send(result);
    },
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/login",
    schema: loginSchema,
    handler: async (req, res) => {
      if (!req.headers["user-agent"]) {
        return res.code(userAgentError.status).send(userAgentError.data);
      }

      const result = await loginHandler(
        fastify,
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

export { authRoute };
