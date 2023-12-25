import Fastify,
{
	FastifyRequest,
	FastifyReply,
}
	from 'fastify';
import { fastifyEnv } from './plugins/env';
import { authRoute } from './modules/auth/auth.route';
import jwt, { JWT } from "@fastify/jwt";
import fastifyCookie from '@fastify/cookie';

declare module 'fastify' {
	interface FastifyRequest {
		jwt: JWT;
	}
	export interface FastifyInstance {
		checkToken: any;
	}
}

declare module "@fastify/jwt" {
	interface FastifyJWT {
		user: {
			id: string;
			email: string;
			name: string;
		};
	}
}

const app = async () => {
	const fastify = Fastify({
		logger: true
	})

	await fastify.register(fastifyEnv);

	fastify.register(jwt, {
		secret: fastify.config.JWT_SECRET,
		sign: { algorithm: 'HS512' },
		cookie: {
			cookieName: 'accessToken',
			signed: false
		}
	});

	fastify.register(fastifyCookie);

	fastify.decorate(
		"checkToken",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				await request.jwtVerify();
			} catch (e) {
				return reply.send(e);
			}
		}
	);

	// fastify.addHook("preHandler", (request, reply, next) => { // from prev version
	// 	request.jwt = fastify.jwt;
	// 	return next();
	// });

	//fastify.addHook('preHandler', (request) => request.jwtVerify()) // from fastify/jwt docs

	fastify.register(authRoute, { prefix: "api" })

	// await fastify.ready()

	fastify.listen({ port: parseInt(fastify.config.APP_PORT) }, function (err, address) {
		if (err) {
			fastify.log.error(err)
			process.exit(1)
		}
	})

	//return fastify;
};

app();