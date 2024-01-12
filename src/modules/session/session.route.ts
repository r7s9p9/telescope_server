import { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { checkSession } from './session.controller';
import { sessionSchema } from './session.schema';

interface Token {
    id?: `${string}-${string}-${string}-${string}-${string}`;
    exp?: number;
}

async function sessionRoute(fastify: FastifyInstance) {
	fastify.setValidatorCompiler(validatorCompiler);
	fastify.setSerializerCompiler(serializerCompiler);

	fastify.withTypeProvider<ZodTypeProvider>().route({
		method: ['GET', 'POST', 'PATCH', 'DELETE'],
		url: '/',
		schema: sessionSchema,
		preHandler: [fastify.checkToken],
		handler: async (req, res) => {
			if (req.headers['user-agent'] === undefined) { return res.code(401).send('User Agent is invalid'); }
			const jwt = await req.jwtDecode<Token>();
			if (jwt.id && jwt.exp) {
				const result = await checkSession({
					id: jwt.id,
					exp: jwt.exp,
					ip: req.ip,
					ua: req.headers['user-agent']
				}, fastify);
				if (result) {
					return res
						.code(result.status)
						.send({ data: result.message }); // Shit
				}
			}
			if (!jwt.id || !jwt.exp) { return res.code(401).send('Token is invalid'); }
	
			return res.send('Token is valid');
		}

	});

	// Add get token route
}

export { sessionRoute };