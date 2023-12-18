import Fastify, { FastifyInstance, FastifyPluginCallback } from 'fastify'
import z from 'zod';
import fp from 'fastify-plugin'
import dotenv from 'dotenv'
import { authRoute } from './modules/auth/auth.route'
import fjwt, { JWT } from "@fastify/jwt";

const isProduction = process.env.NODE_ENV === 'production';

const config = dotenv.config({ path: isProduction ? '.env' : '.env.local' })

const envVars = z.object({
    APP_PORT: z.string(),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PORT: z.string(),
    DB_NAME: z.string(),
    DB_PASS: z.string(),
    JWT_SECRET: z.string()
});

const environment = envVars.parse(config.parsed);

const fastifyEnv = fp(async (fastify: FastifyInstance, done: (err?: any) => void): Promise<void> => {
    fastify.decorate('config', environment)
}, {
    name: 'custom-env',
    fastify: '4.x',
})

declare module 'fastify' {
    interface FastifyInstance {
        config: z.infer<typeof envVars>
    }
}

const app = async () => {
    const fastify = Fastify({
        logger: true
    })

    await fastify.register(fastifyEnv);

    fastify.register(fjwt, {
        secret: fastify.config.JWT_SECRET, // change this
    });

    fastify.register(authRoute, { prefix: "api/auth" })

    await fastify.ready()

    fastify.listen({ port: parseInt(fastify.config.APP_PORT) }, function (err, address) {
        if (err) {
            fastify.log.error(err)
            process.exit(1)
        }
    })

    return fastify;
};

app();