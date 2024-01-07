import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { fastifyEnv } from './plugins/env';
import { authRoute } from './modules/auth/auth.route';
import { sessionRoute } from './modules/session/session.route';
import jwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyRedis from '@fastify/redis';

declare module 'fastify' {
	export interface FastifyInstance {
		checkToken: any; // TODO fix type
	}
}

const app = async () => {
	const fastify = Fastify({
		logger: true
	});

	await fastify.register(fastifyEnv);

	await fastify.register(fastifyCookie);

	await fastify.register(jwt, {
		secret: fastify.config.JWT_SECRET,
		sign: {											// creating tokens
			algorithm: fastify.config.JWT_ALG,
			expiresIn: fastify.config.JWT_EXPIRATION,	// for client-side logic
			noTimestamp: true,							// disable iat inserting in token
		},
		verify: {										// checking tokens
			algorithms: [fastify.config.JWT_ALG],		// allow only this alg
			maxAge: fastify.config.JWT_EXPIRATION,
		},
		cookie: {
			cookieName: 'accessToken',
			signed: false,
		},
	});

	fastify.decorate(
		'checkToken',
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				await request.jwtVerify({ onlyCookie: true });
			} catch (e) {
				return reply.send(e);
			}
		}
	);

	await fastify.register(fastifyRedis, {
		host: 'localhost',
		//password: 'your strong password here',
		//port: 6379,
		//family: 4   // (IPv4) or 6 (IPv6)
	});

	await fastify.register(authRoute, { prefix: 'api' }); // for login / register
	await fastify.register(sessionRoute, { prefix: 'api' }); // session validation

	fastify.listen({ port: parseInt(fastify.config.APP_PORT) }, function (err, address) {
		if (err) {
			fastify.log.error(err);
			process.exit(1);
		}
	});
};

app();