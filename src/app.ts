/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */

import Fastify from 'fastify';
import { authRoute } from './modules/auth/auth.route.js'
import fastifyEnv from '@fastify/env';
import fjwt, { JWT } from "@fastify/jwt";
import z from 'zod';

const envVars = z.object({
	DB_HOST: z.string(),
	DB_USER: z.string(),
	DB_PORT: z.string(),
	DB_NAME: z.string(),
	DB_PASS: z.string(),
	JWT_SECRET: z.string()
})

//envVars.parse(process.env);

const schema = {
	type: 'object',
	properties: {
		envVars
	}
}

const options = {
	schema: schema,
	dotenv: true,
}

declare module "fastify" {
	interface FastifyRequest {
		jwt: JWT;
	}
	export interface FastifyInstance {
		authenticate: any;
		config: {
			JWT_SECRET: string
		}
	}
}

declare module "@fastify/jwt" {
	interface FastifyJWT {
		user: {
			id: number;
			email: string;
			username: string;
		};
	}
}



const fastify = Fastify({
	logger: true
})

await fastify.register(fastifyEnv, options)
	.ready((err: any) => {
		if (err) console.error(err)

		console.log(fastify.config) // or fastify[options.confKey]
		// output: { PORT: 3000 }
	})

fastify.register(fjwt, {
	secret: fastify.config.JWT_SECRET, // change this
});

fastify.register(authRoute, { prefix: "api/auth" })

fastify.listen({ port: 3000 }, function (err, address) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})