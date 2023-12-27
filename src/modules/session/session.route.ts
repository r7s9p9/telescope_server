import { FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
// import { sessionHandler } from "./session.controller";

async function sessionRoute(fastify: FastifyInstance) {
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);

    fastify.withTypeProvider<ZodTypeProvider>().route({
        method: ["GET", "POST", "PATCH", "DELETE"],
        url: "/",
        //schema: sessionSchema,
        preHandler: [fastify.checkToken],
        handler: async (req, res) => {
            // const result = await sessionHandler(
            //     req.headers.cookie,
            //     req.body,
            // )
            return res
                //.header('Content-Type', 'application/json; charset=utf-8')
                // .code(result.status)
                // .send({ message: result.message, data: result.data })
                .send(req.headers.cookie + '\n\nToken is valid')
        }

    });
}

export { sessionRoute };