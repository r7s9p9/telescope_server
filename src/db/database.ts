import { Database } from './types'
import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import 'dotenv/config'

const dialect = new PostgresDialect({
	pool: new Pool({
		database: process.env.DB_NAME,
		host: process.env.DB_HOST,
		password: process.env.DB_PASS,
		user: process.env.DB_USER,
		// port: process.env.DB_PORT,
		max: 10,
	})
})

export const db = new Kysely<Database>({
	dialect,
})