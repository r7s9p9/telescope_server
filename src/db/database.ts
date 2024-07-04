import { Database } from "./types";
import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import dotenv from "dotenv";
import z from "zod";
import { envFile } from "../modules/constants";

const envVars = z.object({
  DB_HOST: z.string(),
  DB_USER: z.string(),
  DB_PORT: z.string(),
  DB_NAME: z.string(),
  DB_PASS: z.string(),
});

const config = dotenv.config({ path: envFile });

const environment = envVars.parse(config.parsed);

const pool = new Pool({
  database: environment.DB_NAME,
  host: environment.DB_HOST,
  password: environment.DB_PASS,
  user: environment.DB_USER,
  port: Number(environment.DB_PORT),
  max: 10,
});

const migratorPool = new Pool({
  database: environment.DB_NAME,
  host: "localhost",
  password: environment.DB_PASS,
  user: environment.DB_USER,
  port: Number(environment.DB_PORT),
  max: 10,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});

export const dbMigrator = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: migratorPool,
  }),
});
