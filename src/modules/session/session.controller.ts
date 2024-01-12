import { FastifyInstance } from 'fastify';
import parser from 'ua-parser-js';
import { verificationCodeRequest } from './session.security-code';

const messageAboutBlockedSession = {
	status: 403,
	message: 'Your session is banned',
};

const messageAboutCodeRequest = {
	status: 200,
	message: 'Enter the code sent to your other device',
};

const messageAboutNothing = {
	status: 200,
	message: ''
};

export async function checkSession(
	client: {
        id: `${string}-${string}-${string}-${string}-${string}`,
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

	const sessionFound = await sessionValidation(server, sessionHash, sessionSet, client.exp);

	if (sessionFound) {
		const sessionIsNotBlocked = await checkSessionData(server, sessionHash, { ban: 'false'});
		if (!sessionIsNotBlocked) { return messageAboutBlockedSession; }
		
		const uaIsHealthy = await checkSessionData(server, sessionHash, { ua: client.ua});
		const sameIP = await checkSessionData(server, sessionHash, { ip: client.ip });

		if (uaIsHealthy) {
			if (!sameIP) { await updateSession(server, sessionHash, { ip: client.ip }); } // Tracking client ip
			await updateSession(server, sessionHash, { online: Date.now() });
			return messageAboutNothing;
		}

		if (!uaIsHealthy) {
			if (!sameIP) { await updateSession(server, sessionHash, { ip: client.ip }); } // Tracking banned ip || TODO list of IPs
			await updateSession(server, sessionHash, { ban: 'true' });
			return 1;
		}
	}

	if (!sessionFound) {
		const numberOfAllSessions = await server.redis.scard(sessionSet);
		if (numberOfAllSessions === 0) {
			await addSession(server, sessionHash, sessionSet, client);
			return messageAboutNothing;
		}

		const allSessionsArray = await server.redis.smembers(sessionSet);
		const partialHash = client.id + ':';

		if (numberOfAllSessions === 1) {
			const selectedExpValue = Number(allSessionsArray[0]);
			const selectedHashKey = partialHash + selectedExpValue;
			const sessionGood = await sessionSelector(server, selectedHashKey, selectedExpValue, sessionSet);

			if (sessionGood) {
				const activeSessionDevice = await verificationCodeRequest(server, selectedHashKey, client);
				const result = messageAboutCodeRequest;
				result.message += ' - ' + activeSessionDevice;
				return result;
			}
			if (!sessionGood) {
				//
				// If the session is not suitable, you will have
				// to allow a new token to record a new session.
				//
				await addSession(server, sessionHash, sessionSet, client);
				return messageAboutNothing;
			}
		}

		if (numberOfAllSessions > 1) {
			//
			// We have several sessions, so let's loop through them and add
			// all suitable sessions exp and online date to the Map object.
			//
			const suitableSessions = new Map();
			let currentSession = 0;

			while (currentSession < allSessionsArray.length) {
				const selectedExpValue = Number(allSessionsArray[currentSession]);
				const selectedHashKey = partialHash + selectedExpValue;
				const sessionGood = await sessionSelector(server, selectedHashKey, selectedExpValue, sessionSet);

				if (sessionGood) {
					const sessionOnlineValue = await server.redis.hget(selectedHashKey, 'online');
					suitableSessions.set(selectedExpValue, sessionOnlineValue);
				}
				currentSession++;
			}

			//
			const noSuitableSessions = (suitableSessions.size === 0);

			if (!noSuitableSessions) {
				//
				// Now let’s select from the Map object 
				// the session with the latest online date
				//
				let sessionExpForCodeReq = 0;

				for (const [sessionExp, sessionOnline] of suitableSessions) {
					if (sessionExpForCodeReq === 0) { sessionExpForCodeReq = sessionExp; } // First run
					if (suitableSessions.get(sessionExpForCodeReq) < sessionOnline) { sessionExpForCodeReq = sessionExp; }
					console.log(suitableSessions.get(sessionExpForCodeReq));
					console.log(sessionExpForCodeReq);
				}
				const sessionHashForCodeReq = partialHash + sessionExpForCodeReq;
				const activeSessionDevice = await verificationCodeRequest(server, sessionHashForCodeReq, client);
				const result = messageAboutCodeRequest;
				result.message += ' - ' + activeSessionDevice;
				return result;
			}

			if (noSuitableSessions) {
				//
				// If there are no suitable sessions, you will have
				// to allow the new token to record a new session
				//
				await addSession(server, sessionHash, sessionSet, client);
				console.log('sessionCount > 1, other sessions bad, session added');
				return messageAboutNothing;
			}
			
		}
	}
}

async function sessionSelector(
	server: FastifyInstance,
	selectedHashKey: string,
	selectedExpValue: number,
	sessionSet: string,
) {
	
	const sessionIsValid = await sessionValidation(server, selectedHashKey, sessionSet, selectedExpValue);
	if (sessionIsValid) {
		const sessionIsNotBlocked = await checkSessionData(server, selectedHashKey, { ban: 'false'});

		if (sessionIsNotBlocked) { return true; }
		if (!sessionIsNotBlocked) { return false;}						
	}
}

async function sessionValidation(
	server: FastifyInstance,
	sessionHashKey: string,
	sessionSetKey: string,
	sessionExpValue: number	
) {
	const setMemberExists = await server.redis.sismember(sessionSetKey, sessionExpValue);

	const ua = await server.redis.hexists(sessionHashKey, 'ua');
	const ip = await server.redis.hexists(sessionHashKey, 'ip');
	const ban = await server.redis.hexists(sessionHashKey, 'ban');
	const online = await server.redis.hexists(sessionHashKey, 'online');

	const sessionOk = setMemberExists && ua && ip && ban && online;
	const noSession = !(setMemberExists || ua || ip || ban || online);
	const damagedSession = !sessionOk && !noSession;

	if (sessionOk) return true;
	if (noSession) return false;
	if (damagedSession) {
		await removeSession(server, sessionHashKey, sessionSetKey, sessionExpValue);
		return false;
	}
}

async function checkSessionData(
	server: FastifyInstance,
	sessionHashKey: string,
	client: Partial<{ 
		ua: string | undefined,
		ip: string | undefined,
		ban: string | undefined
	}>,
) {

	if (client.ua) { return await userAgentValidation(server, sessionHashKey, client.ua); }
	if (client.ip) { return await server.redis.hget(sessionHashKey, 'ip') === client.ip; }
	if (client.ban) { return await server.redis.hget(sessionHashKey, 'ban') === client.ban; }
}

async function addSession(
	server: FastifyInstance,
	sessionHashKey: string,
	sessionSetKey: string,
	client: { exp: number, ua: string, ip: string},
) {
	const setAlreadyExists = (await server.redis.scard(sessionSetKey) !== 0);
	await server.redis.hmset(
		sessionHashKey,
		'ua', client.ua,
		'ip', client.ip,
		'ban', 'false',
		'online', Date.now(),
	);
	await server.redis.sadd(sessionSetKey, client.exp);
	//
	// The lifetime of a Redis Hash is limited to one token.
	// The lifetime of a Redis Set increases every time a new fresh token appears.
	//
	await server.redis.expireat(sessionHashKey, client.exp);
	if (setAlreadyExists) { await server.redis.expireat(sessionSetKey, client.exp, 'GT'); }
	if (!setAlreadyExists) { await server.redis.expireat(sessionSetKey, client.exp, 'NX'); }
	
}

async function updateSession(
	server: FastifyInstance,
	sessionHashKey: string,
	newInfo: Partial<{ 
		ua: string | undefined,
		ip: string | undefined,
		ban: string | undefined,
		online: number | undefined
	}>,
) {
	if (newInfo.ua) { await server.redis.hset(sessionHashKey, 'ua', newInfo.ua); }
	if (newInfo.ip) { await server.redis.hset(sessionHashKey, 'ip', newInfo.ip); }
	if (newInfo.ban) { await server.redis.hset(sessionHashKey, 'ban', newInfo.ban); }
	if (newInfo.online) { await server.redis.hset(sessionHashKey, 'online', newInfo.online); }
}

async function removeSession(
	server: FastifyInstance,
	sessionHashKey: string,
	sessionSetKey: string,
	sessionSetMember: number,
) {
	await server.redis.del(sessionHashKey);
	await server.redis.srem(sessionSetKey, sessionSetMember);
}

async function userAgentValidation(
	server: FastifyInstance,
	sessionHash: string,
	clientUA: string
){	
	const redisUA = await server.redis.hget(sessionHash, 'ua');

	if (redisUA === null) { return false; }		// If redis faulted || TODO
	if (clientUA === redisUA) { return true; }
	if (userAgentComparator(clientUA, redisUA)) {
		//
		// Update the user agent if its change is not associated
		// with significant (bad) changes on the client user agent
		//
		await updateSession(server, sessionHash, { ua: clientUA });
		return true;
	}
	return false;
}

function userAgentComparator(
	clientUA: string,
	redisUA: string
) {
	const parsedClientUA = parser(clientUA);
	const parsedRedisUA = parser(redisUA);
		
	if (parsedClientUA.browser.name !== parsedRedisUA.browser.name) { return false; }
	if (parsedClientUA.browser.version === undefined || (parsedRedisUA.browser.version && parsedClientUA.browser.version < parsedRedisUA.browser.version)) { return false; }
	if (parsedClientUA.engine.name === undefined || parsedClientUA.engine.name !== parsedRedisUA.engine.name) { return false; }
	if (parsedClientUA.engine.version === undefined || (parsedRedisUA.engine.version && parsedClientUA.engine.version < parsedRedisUA.engine.version)) { return false; }
	if (parsedClientUA.os.name === undefined || parsedClientUA.os.name !== parsedRedisUA.os.name) { return false; }
	if (parsedClientUA.os.version === undefined) { return false; }
	if (parsedClientUA.device.model !== parsedRedisUA.device.model) { return false; }
	if (parsedClientUA.device.type !== parsedRedisUA.device.type) { return false; }
	if (parsedClientUA.device.vendor !== parsedRedisUA.device.vendor) { return false; }
	if (parsedClientUA.cpu.architecture === undefined || parsedClientUA.cpu.architecture !== parsedRedisUA.cpu.architecture) { return false; }
	return true;
}