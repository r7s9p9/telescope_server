import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { checkSession } from "./session.controller";
import { sessionSchema } from "./session.schema";
import { Token } from "../constants";

async function sessionRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["GET", "POST", "PATCH", "DELETE"],
    url: "/",
    schema: sessionSchema,
    preHandler: [fastify.checkToken],
    handler: async (req, res) => {
      if (req.headers["user-agent"] === undefined) {
        return res
          .code(401)
          .send({ error: { message: "User Agent is invalid" } });
      }
      const jwt = await req.jwtDecode<Token>();
      if (jwt.id && jwt.exp) {
        const result = await checkSession(
          {
            id: jwt.id,
            exp: jwt.exp,
            ip: req.ip,
            ua: req.headers["user-agent"],
          },
          fastify.redis
        );
        if (result) {
          return res.code(result.status).send(result);
        }
        if (!result) {
          return res
            .code(401)
            .send({ error: { message: "Internal Server Error" } });
        }
      }
      if (!jwt.id || !jwt.exp) {
        return res.code(401).send({ error: { message: "Token is invalid" } });
      }
    },
  });

  // Add get token route

  // Add response code route
}

export { sessionRoute };
