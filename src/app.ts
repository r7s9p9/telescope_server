import Fastify,
{
	FastifyRequest,
	FastifyReply,
}
	from 'fastify';
import { fastifyEnv } from './plugins/env';
import { authRoute } from './modules/auth/auth.route';
import fjwt, { JWT } from "@fastify/jwt";

declare module 'fastify' {
	interface FastifyRequest {
		jwt: JWT;
	}
	export interface FastifyInstance {
		authenticate: any;
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

	fastify.register(fjwt, {
		secret: fastify.config.JWT_SECRET,
		sign: { algorithm: 'HS512' }
	});

	fastify.decorate(
		"authenticate",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				await request.jwtVerify();
			} catch (e) {
				return reply.send(e);
			}
		}
	);

	fastify.addHook("preHandler", (req, reply, next) => {
		req.jwt = fastify.jwt;
		return next();
	});

	fastify.register(authRoute, { prefix: "api" })

	fastify.get('/', { preHandler: [fastify.authenticate] }, function (request, reply) {
		reply.send({ Server: 'online' })
	}) // TEST JWT

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