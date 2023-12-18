import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('user')
        .addColumn('id', 'varchar',
            (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('created_at', 'timestamp',
            (col) => col.defaultTo(sql`now()`).notNull()
        )
        .addColumn('email', 'varchar')
        .addColumn('username', 'varchar')
        .addColumn('password', 'varchar')
        .addColumn('salt', 'varchar')
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('user').execute()
}