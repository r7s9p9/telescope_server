import { FastifyInstance } from "fastify";
import {
	loginHandler,
	registerHandler,
} from "./auth.controller";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { registerSchema, loginSchema } from "./auth.schema";

async function authRoute(fastify: FastifyInstance) {
	fastify.setValidatorCompiler(validatorCompiler);
	fastify.setSerializerCompiler(serializerCompiler);

	fastify.withTypeProvider<ZodTypeProvider>().route({
		method: "POST",
		url: "/register",
		schema: registerSchema,
		handler: async (req, res) => {
			const result = await registerHandler(req.body);
			return res
				.code(result.status)
				.send(result.message);
		}
	});

	fastify.withTypeProvider<ZodTypeProvider>().route({
		method: "POST",
		url: "/login",
		schema: loginSchema,
		handler: async (req, res) => {
			const result = await loginHandler(req.body);
			return res
				.code(result.status)
				.send(result.message);
		}
	});
}

export { authRoute };