import { FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { registerSchema, loginSchema } from "./auth.schema";
import {
	loginHandler,
	registerHandler,
} from "./auth.controller";

interface LoginResult {
	status: number;
	message: string;
	accessToken?: string;
}

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
			const result: LoginResult = await loginHandler(req.body, req.server);
			if (result.accessToken) {
				return res
					.setCookie('accessToken', result.accessToken, {
						//domain: 'your.domain',
						//path: '/',
						secure: true,
						httpOnly: true,
						sameSite: "strict",
					})
					.code(result.status)
					.send(result.message)
			} else {
				return res
					.code(result.status)
					.send(result.message)
			}
		}
	});
}

export { authRoute };