import { FastifyInstance } from "fastify";
import fastifyPlugin from 'fastify-plugin';
import dotenv from 'dotenv';
import z from 'zod';

// import type Algorithm from 'fast-jwt/src/index.d.ts'
// import { hsAlgorithms, edAlgorithms, esAlgorithms, rsaAlgorithms } from 'fast-jwt/src/crypto';

// console.log(hsAlgorithms)

const jwtAlg = [ // TODO find this in modules
    'none',
    'HS256',
    'HS384',
    'HS512',
    'ES256',
    'ES384',
    'ES512',
    'RS256',
    'RS384',
    'RS512',
    'PS256',
    'PS384',
    'PS512',
    'EdDSA',
] as const;

const envVars = z.object({
    APP_PORT: z.string(),
    JWT_SECRET: z.string(),
    JWT_ALG: z.enum(jwtAlg),
    JWT_EXPIRATION: z.union([z.string(), z.number()]),
});

type envConfig = z.infer<typeof envVars>;

declare module 'fastify' {
    interface FastifyInstance {
        config: envConfig;
    }
}

const isProduction = process.env.NODE_ENV === 'production';

const config = dotenv.config({ path: isProduction ? '.env' : '.env.local' })

const environment = envVars.parse(config.parsed);

export const fastifyEnv = fastifyPlugin(async (fastify: FastifyInstance, done: (err?: any) => void): Promise<void> => {
    fastify.decorate('config', environment)
}, {
    name: 'custom-env',
    fastify: '4.x',
})