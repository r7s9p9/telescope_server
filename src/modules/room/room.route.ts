import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { sessionWrapper } from "../auth/session/session.controller";
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
      const session = await sessionWrapper(
        fastify.redis,
        req.user,
        req.ip,
        req.headers["user-agent"]
      );
      if ("token" in session) {
        const roomInfo: RoomInfoValues = {
          name: "someRoom",
          creatorId: session.token.id,
          type: "single",
          about: "nope",
        };
        // Hardcoded !!!!
        const result = await initRoom(fastify.redis, roomInfo);
        return res.code(200).send(result);
      } else return res.code(session.status).send(session);
    },
  });
}

export { roomRoute };
