import { db } from './database'
import { UserUpdate, User, NewUser } from './types'

export async function findUser(criteria: Partial<User>) {
	let query = db.selectFrom('user')

	if (criteria.username) {
		query = query.where('username', '=', criteria.username)
	}

	return await query.selectAll().execute()
}

export async function updateUser(id: number, updateWith: UserUpdate) {
	await db.updateTable('user').set(updateWith).where('id', '=', id).execute()
}

export async function createUser(User: NewUser) {
	return await db.insertInto('user')
		.values(User)
		.returningAll()
		.executeTakeFirstOrThrow()
}

export async function deleteUser(id: number) {
	return await db.deleteFrom('user').where('id', '=', id)
		.returningAll()
		.executeTakeFirst()
}