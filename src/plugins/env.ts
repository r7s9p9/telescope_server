import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import dotenv from "dotenv";
import z from "zod";
import { envFile, jwtAlgorithms } from "../modules/constants";

export type EnvValues = ReturnType<typeof converter>;

declare module "fastify" {
  interface FastifyInstance {
    env: EnvValues;
  }
}

const envVars = z.object({
  APP_IS_PROD: z.union([z.literal("true"), z.literal("false")]),
  APP_PORT: z.string(),
  TOKEN_SECRET: z.string(),
  TOKEN_ALG: z.enum(jwtAlgorithms),
  TOKEN_EXPIRATION: z.string().min(2),
  TOKEN_REMAINING_TIME_TO_BE_UPDATED: z.string(),
});

type EnvVarsType = z.infer<typeof envVars>;

const { parsed } = dotenv.config({ path: envFile, override: false });

const parsedEnvVars = envVars.parse(parsed);

const converter = (envVars: EnvVarsType) => {
  return {
    isProd: envVars.APP_IS_PROD === "true" ? true : false,
    appPort: envVars.APP_PORT,
    tokenSecret: envVars.TOKEN_SECRET,
    tokenAlg: envVars.TOKEN_ALG,
    tokenSecondsExpiration: dateConverter(envVars.TOKEN_EXPIRATION),
    tokenRemainingSecondsToBeUpdated: dateConverter(
      envVars.TOKEN_REMAINING_TIME_TO_BE_UPDATED
    ),
  };
};

function dateConverter(str: string) {
  const type = str.at(-1);
  const rawNumber = Number(str.slice(0, str.length - 1));
  switch (type) {
    case "s": // seconds
    case "S":
      return rawNumber;
    case "m": // seconds
    case "M":
      return rawNumber * 60;
    case "h": // hours
    case "H":
      return rawNumber * 60 * 60;
    case "d": // days
    case "D":
      return rawNumber * 60 * 60 * 24;
    case "w": // weeks
    case "W":
      return rawNumber * 60 * 60 * 24 * 7;
    default:
      throw Error("Bad date type in .env");
  }
}

export const fastifyEnv = fastifyPlugin(
  async (
    fastify: FastifyInstance,
    done: (err?: any) => void
  ): Promise<void> => {
    fastify.decorate("env", converter(parsedEnvVars));
  },
  {
    name: "custom-env",
    fastify: "4.x",
  }
);
