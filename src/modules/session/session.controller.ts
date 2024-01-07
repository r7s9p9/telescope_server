import { FastifyInstance } from 'fastify';
import parser from 'ua-parser-js';

// interface Session {
//     exp: number,
//     ua: string,
// }

//  https://redis.io/commands/expire/
//													redis -> session = id:userID:token => values
// 	keys ->		userUUID
//	exp		 ->	expire (Date)
//				device (string)
//				online (bool)
//				ban (bool?)
//
//	Redis имеет запись по ключу id:userUUID:accessToken ->
//			В значении ban стоит true -> Отправляется ответ о bad auth
//			В значении ban стоит false -> 
//											Запись 'user-agent' совпадает с устройством -> Запрос прошел проверку
//											Запись 'user-agent' не совпадает -> ban меняется на true -> Отправляется ответ о bad auth
//
//	Redis НЕ имеет запись по ключу id:userUUID:accessToken ->
//			В Redis есть другие незабаненные сессии с этим userUUID ->
//					Отправка запроса на устройство, которое было online раньше всех ...
//					...
//					...
//			В Redis нет других сессий ->
//					Создать запись с текущим устройством, IP, и тд. -> Запрос прошел проверку 
//
//	
//							

const sessionBanned = {
	status: 403,
	message: 'Your session is banned',
};

export async function checkSession(
	client: {
        id: '${string}-${string}-${string}-${string}-${string}',
		exp: number,
        ip: string,
        ua: string,
    },
	server: FastifyInstance
) {
	// Session storage is implemented in two records:
	// 1. Redis Set for a list of all sessions of one client.
	// 2. Redis Hash for storing information about each session of one client.
	// The value in the Redis Set corresponds to the last part
	// of the key in the Redis Hash for the same session:

	const sessionHash = client.id + ':' + client.exp;
	const sessionSet = client.id + ':sessions';

	if (await sessionExists(server, sessionHash, sessionSet, client)) {
		if (await checkSessionData(server, sessionHash, { ban: 'true'})) {
			console.log('Account already banned');
			return sessionBanned;
		}
		if (await userAgentComparator(server, sessionHash, client)) {
			if (await checkSessionData(server, sessionHash, { ip: client.ip })) {
				await updateSession(server, sessionHash, { ip: client.ip });
			}
			console.log('All done, UA good');
		}
		else {
			await updateSession(server, sessionHash, { ban: 'true' });
			console.log('All done, UA bad, account banned');
			return sessionBanned;
		}
	} else {
		const otherSessionsCount = await server.redis.scard(sessionSet);
		if (otherSessionsCount === 0) {
			await addSession(server, sessionSet, sessionHash, client);
			console.log('session added');
			console.log('All Done');
		}
		if (otherSessionsCount === 1) {
			console.log('user have 1 another session');
			// TODO
			// ping old NOT BANNED Session
			await addSession(server, sessionSet, sessionHash, client);
			console.log('session added');
			console.log('All Done');
		}
		if (otherSessionsCount > 1) {
			console.log('user have 2+ another sessions');
			// TODO
			// check near online NOT BANNED session => ping that session
			await addSession(server, sessionSet, sessionHash, client);
			console.log('session added');
			console.log('All Done');
		}
	}
}

async function sessionExists(
	server: FastifyInstance,
	sessionHashKey: string,
	sessionSetKey: string,
	client: {
		exp: number,
		ip: string,
		ua: string
	},
) {
	const setMemberExists = await server.redis.sismember(sessionSetKey, client.exp);
	const hashItems = {
		ua: await server.redis.hexists(sessionHashKey, 'ua'),
		ip: await server.redis.hexists(sessionHashKey, 'ip'),
		ban: await server.redis.hexists(sessionHashKey, 'ban')
	};
	if (setMemberExists && hashItems.ua && hashItems.ip && hashItems.ban) { // Everything is correct
		return true;
	}
	else if (!setMemberExists && !hashItems.ua && !hashItems.ip && !hashItems.ban) { // No session
		return false;
	}
	else if (!hashItems.ban) {	// Session corrupted - no ban value
		await updateSession(server, sessionHashKey, { ban: 'true'});
		return true;
	}
	else { // Session corrupted
		await removeSession(server, sessionHashKey, sessionSetKey);
		return false;
	}
}

async function checkSessionData(
	server: FastifyInstance,
	sessionHashKey: string,
	value: Partial<{ 
		ua: string | undefined,
		ip: string | undefined,
		ban: string | undefined
	}>,
) {
	if (value.ua) { return await server.redis.hget(sessionHashKey, 'ua') === value.ua; }
	if (value.ip) { return await server.redis.hget(sessionHashKey, 'ip') === value.ip; }
	if (value.ban) { return await server.redis.hget(sessionHashKey, 'ban') === value.ban; }
}

async function addSession(
	server: FastifyInstance,
	sessionSetKey: string,
	sessionHashKey: string,
	client: { exp: number, ua: string, ip: string},
) {
	await server.redis.sadd(sessionSetKey, client.exp);
	await server.redis.hmset(
		sessionHashKey,
		'ua', client.ua,
		'ip', client.ip,
		'ban', 'false',
	);
}

async function updateSession(
	server: FastifyInstance,
	sessionHashKey: string,
	newInfo: Partial<{ 
		ua: string | undefined,
		ip: string | undefined,
		ban: string | undefined,
	}>,
) {
	if (newInfo.ua) { await server.redis.hset(sessionHashKey, 'ua', newInfo.ua); }
	if (newInfo.ip) { await server.redis.hset(sessionHashKey, 'ip', newInfo.ip); }
	if (newInfo.ban) { await server.redis.hset(sessionHashKey, 'ban', newInfo.ban); }
}

async function removeSession(
	server: FastifyInstance,
	sessionHashKey: string,
	sessionSetKey: string
) {
	await server.redis.del(sessionHashKey);
	await server.redis.del(sessionSetKey);
}

async function userAgentComparator(
	server: FastifyInstance,
	sessionHash: string,
	client: { ua: string }
){	
	const redisUA = await server.redis.hget(sessionHash, 'ua');
	if (redisUA === null) { return false; } // If redis faulted || TODO
	if (client.ua === redisUA) { return true; }
	else {
		const parsedClientUA = parser(client.ua);
		const parsedRedisUA = parser(redisUA);

		if (parsedClientUA.browser.name !== parsedRedisUA.browser.name)
		{ return false; }

		if (parsedClientUA.browser.version === undefined || (parsedRedisUA.browser.version && parsedClientUA.browser.version < parsedRedisUA.browser.version))
		{ return false; }

		if (parsedClientUA.engine.name === undefined || parsedClientUA.engine.name !== parsedRedisUA.engine.name)
		{ return false; }

		if (parsedClientUA.engine.version === undefined || (parsedRedisUA.engine.version && parsedClientUA.engine.version < parsedRedisUA.engine.version))
		{ return false; }

		if (parsedClientUA.os.name === undefined || parsedClientUA.os.name !== parsedRedisUA.os.name)
		{ return false; }

		if (parsedClientUA.os.version === undefined)
		{ return false; }

		if (parsedClientUA.device.model !== parsedRedisUA.device.model) { return false; }
		if (parsedClientUA.device.type !== parsedRedisUA.device.type) { return false; }
		if (parsedClientUA.device.vendor !== parsedRedisUA.device.vendor) { return false; }

		if (parsedClientUA.cpu.architecture === undefined || parsedClientUA.cpu.architecture !== parsedRedisUA.cpu.architecture)
		{ return false; }
		
		// Update the user agent if its change is not associated with significant changes on the client
		await updateSession(server, sessionHash, { ua: client.ua });
		return true;
	}
}