import { db } from '../../db/database'
import { UserUpdate, NewUser } from '../../db/types'

export async function selectUserByEmail(email: string) {
	return await db
		.selectFrom('user')
		.where('email', '=', email)
		.selectAll()
		.executeTakeFirst()
}

export async function selectUserByUsername(username: string) {
	return await db
		.selectFrom('user')
		.where('username', '=', username)
		.selectAll()
		.executeTakeFirst()
}

export async function updateUser(id: number, updateWith: UserUpdate) {
	await db.updateTable('user').set(updateWith).where('id', '=', id).execute()
}

export async function createUser(User: NewUser) {
	return await db
		.insertInto('user')
		.values(User)
		.returningAll()
		.executeTakeFirstOrThrow()
}

export async function deleteUser(id: number) {
	return await db
		.deleteFrom('user').where('id', '=', id)
		.returningAll()
		.executeTakeFirst()
}