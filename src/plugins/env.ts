import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import dotenv from "dotenv";
import z from "zod";

// import type Algorithm from 'fast-jwt/src/index.d.ts'
// import { hsAlgorithms, edAlgorithms, esAlgorithms, rsaAlgorithms } from 'fast-jwt/src/crypto';

export type JWTConfig = ReturnType<typeof converter>;

declare module "fastify" {
  interface FastifyInstance {
    config: JWTConfig;
  }
}

const jwtAlg = [
  // TODO find this in modules
  "none",
  "HS256",
  "HS384",
  "HS512",
  "ES256",
  "ES384",
  "ES512",
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "EdDSA",
] as const;

const envVars = z.object({
  APP_IS_PROD: z.union([z.literal("true"), z.literal("false")]),
  APP_PORT: z.string(),
  JWT_SECRET: z.string(),
  JWT_ALG: z.enum(jwtAlg),
  JWT_EXPIRATION: z.union([z.string(), z.number()]),
  JWT_DAYS_OF_TOKEN_TO_BE_UPDATED: z.string(),
});

type EnvVarsType = z.infer<typeof envVars>;

const config = dotenv.config({ path: ".env.local", override: false });

const parsedEnvVars = envVars.parse(config.parsed);

const converter = (envVars: EnvVarsType) => {
  return {
    APP_IS_PROD: envVars.APP_IS_PROD === "true" ? true : false,
    APP_PORT: envVars.APP_PORT,
    JWT_SECRET: envVars.JWT_SECRET,
    JWT_ALG: envVars.JWT_ALG,
    JWT_EXPIRATION: envVars.JWT_EXPIRATION.toString(),
    JWT_DAYS_OF_TOKEN_TO_BE_UPDATED: envVars.JWT_DAYS_OF_TOKEN_TO_BE_UPDATED,
  };
};

export const fastifyEnv = fastifyPlugin(
  async (
    fastify: FastifyInstance,
    done: (err?: any) => void
  ): Promise<void> => {
    fastify.decorate("config", converter(parsedEnvVars));
  },
  {
    name: "custom-env",
    fastify: "4.x",
  }
);
