import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { checkSession } from "../session/session.controller";
import { checkToken } from "../../utils/tokenActions";
import { messageAboutWrongToken } from "../constants";
import { initRoom } from "./room.controller";
import { RoomInfoValues } from "./room.constants";

async function roomRoute(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: ["GET", "POST", "PATCH", "DELETE"],
    url: "/room",
    //schema: roomSchema,
    preHandler: [fastify.checkToken],
    handler: async (req, res) => {
      const tokenData = await checkToken(req.user);
      if (!tokenData) {
        return messageAboutWrongToken;
      }
      const sessionResult = await checkSession(fastify.redis, {
        id: tokenData.id, // token from @fastify/jwt
        exp: tokenData.exp,
        ip: req.ip,
        ua: req.headers["user-agent"],
      });
      if ("data" in sessionResult && sessionResult.data.message === "OK") {
        // Hardcoded !!!!
        const roomInfo: RoomInfoValues = {
          name: "someRoom",
          creatorId: tokenData.id,
          type: "single",
          about: "nope",
        };
        // Hardcoded !!!!
        const result = await initRoom(fastify.redis, roomInfo);
        return res.code(200).send(result);
      } else return res.code(sessionResult.status).send(sessionResult);
    },
  });
}

export { roomRoute };
