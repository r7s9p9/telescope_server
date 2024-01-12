import { Database } from './types';
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import dotenv from 'dotenv';
import z from 'zod';

const envVars = z.object({
	DB_HOST: z.string(),
	DB_USER: z.string(),
	DB_PORT: z.string(),
	DB_NAME: z.string(),
	DB_PASS: z.string(),
});

const isProduction = process.env.NODE_ENV === 'production';

const config = dotenv.config({ path: isProduction ? '.env' : '.env.local' });

const environment = envVars.parse(config.parsed);

const dialect = new PostgresDialect({
	pool: new Pool({
		database: environment.DB_NAME,
		host: environment.DB_HOST,
		password: environment.DB_PASS,
		user: environment.DB_USER,
		port: Number(environment.DB_PORT),
		max: 10,
	})
});

export const db = new Kysely<Database>({
	dialect,
});