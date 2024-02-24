import { db } from '../../db/database';
import { SelectUser, UpdateUser, CreateUser } from '../../db/types';

export async function selectUserByEmail(email: SelectUser['email']) {
	return await db
		.selectFrom('user')
		.where('email', '=', email)
		.selectAll()
		.executeTakeFirst();
}

export async function selectUserByUsername(username: SelectUser['username']) {
	return await db
		.selectFrom('user')
		.where('username', '=', username)
		.selectAll()
		.executeTakeFirst();
}

export async function createUser(User: CreateUser) {
	return await db
		.insertInto('user')
		.values(User)
		.returningAll()
		.executeTakeFirstOrThrow();
}


// Move all below to session.repository

export async function selectUserById(id: SelectUser['id']) {
	return await db
		.selectFrom('user')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst();
}

export async function updateUser(id: SelectUser['id'], updateWith: UpdateUser) {
	await db.updateTable('user').set(updateWith).where('id', '=', id).execute();
}

export async function deleteUser(id: SelectUser['id']) {
	return await db
		.deleteFrom('user').where('id', '=', id)
		.returningAll()
		.executeTakeFirst();
}