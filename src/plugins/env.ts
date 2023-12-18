import { FastifyInstance } from "fastify";
import fp from 'fastify-plugin';
import dotenv from 'dotenv';
import z from 'zod';

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

type envConfig = z.infer<typeof envVars>

const environment = envVars.parse(config.parsed);

const fastifyEnv = fp(async (fastify: FastifyInstance, done: (err?: any) => void): Promise<void> => {
    fastify.decorate('config', environment)
}, {
    name: 'custom-env',
    fastify: '4.x',
})

export { fastifyEnv, envVars }
export type { envConfig }