import { FastifyInstance } from 'fastify';

const partialKey = 'account:';

async function accountChecker(
	server: FastifyInstance,
	uuid: string,
) {
	const key = partialKey + uuid;
	const accountExists = await accountValidation(server, key);
	if (accountExists) { return true; }
	if (!accountExists) {
		await createAccount(server, key);
	}
}

async function accountValidation(
	server: FastifyInstance,
	key: string,
) {
	const accountExists = await server.redis.exists(key);
	const usernameExists = await server.redis.hexists(key, 'username');
	const nameExists = await server.redis.hexists(key, 'name');
	const bioExists = await server.redis.hexists(key, 'bio');

	const accountOk = accountExists && usernameExists && nameExists && bioExists;
	const noAccount = !(accountExists || usernameExists || nameExists || bioExists);
	const damagedAccount = !accountOk && !noAccount;

	if (accountOk) { return true; }
	if (noAccount) { return false; }
	if (damagedAccount) { 
		console.log(`DAMAGED ACCOUNT !!! -> ${key}`);
		return false;
	}
}

export async function createAccount(
	server: FastifyInstance,
	id: string
) {
	await server.redis.hmset(
		partialKey + id,
		'username', 'empty',
		'name', 'empty',
		'bio', 'empty',
		'privacyLastSeen', 'everybody',
		'privacyName', 'everybody',
		'privacyBio', 'everybody',
		'privacyProfilePhotos', 'everybody',
	);
}

export async function updateAccount(
	server: FastifyInstance,
	id: string,
	settings: Partial<{
		username: string,
		name: string,
		bio: string,
		privacyLastSeen: string,
		privacyName: string,
		privacyBio: string,
		privacyProfilePhotos: string
	}>
) {
	const key = partialKey + id;
	if (settings.username) { await server.redis.hset(key, 'username', settings.username); }
	if (settings.name) { await server.redis.hset(key, 'name', settings.name); }
	if (settings.bio) { await server.redis.hset(key, 'bio', settings.bio); }
	if (settings.privacyLastSeen) { await server.redis.hset(key, 'privacyLastSeen', settings.privacyLastSeen); }
	if (settings.privacyName) { await server.redis.hset(key, 'privacyName', settings.privacyName); }
	if (settings.privacyBio) { await server.redis.hset(key, 'privacyBio', settings.privacyBio); }
	if (settings.privacyProfilePhotos) { await server.redis.hset(key, 'privacyProfilePhotos', settings.privacyProfilePhotos); }
}