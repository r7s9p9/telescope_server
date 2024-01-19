import { FastifyRedis } from "@fastify/redis";
import parser from "ua-parser-js";
import { verificationCodeRequest } from "./session.security-code";
import { UserId } from "../types";
import {
  messageAboutServerError,
  messageAboutSessionOK,
  sessionHashKey,
  sessionSetKey,
} from "../constants";
import {
  messageAboutBadUserAgent,
  messageAboutBlockedSession,
  messageAboutNoSession,
  sessionFields,
  sessionStartValues,
} from "./session.constants";

export async function checkSession(
  redis: FastifyRedis,
  client: {
    id: UserId;
    exp: number;
    ip: string;
    ua: string | undefined;
  }
) {
  if (!client.ua) {
    return messageAboutBadUserAgent;
  }
  const sessionFound = await sessionValidation(
    redis,
    sessionHashKey(client.id, client.exp),
    sessionSetKey(client.id),
    client.exp
  );

  if (sessionFound) {
    const sessionIsNotBlocked = await checkSessionData(
      redis,
      sessionHashKey(client.id, client.exp),
      {
        ban: "false",
      }
    );
    if (!sessionIsNotBlocked) {
      return messageAboutBlockedSession;
    }

    const uaIsHealthy = await checkSessionData(
      redis,
      sessionHashKey(client.id, client.exp),
      {
        ua: client.ua,
      }
    );
    const sameIP = await checkSessionData(
      redis,
      sessionHashKey(client.id, client.exp),
      {
        ip: client.ip,
      }
    );

    if (uaIsHealthy) {
      if (!sameIP) {
        await updateSession(redis, sessionHashKey(client.id, client.exp), {
          ip: client.ip,
        });
      } // Tracking client ip
      await updateSession(redis, sessionHashKey(client.id, client.exp), {
        online: Date.now(),
      });
      return messageAboutSessionOK;
    }

    if (!uaIsHealthy) {
      if (!sameIP) {
        await updateSession(redis, sessionHashKey(client.id, client.exp), {
          ip: client.ip,
        });
      } // Tracking banned ip || TODO list of IPs
      await updateSession(redis, sessionHashKey(client.id, client.exp), {
        ban: "true",
      });
      return messageAboutBlockedSession;
    }
  }
  if (!sessionFound) {
    return messageAboutNoSession;
  }
  return messageAboutServerError;
}

export async function isVerificationCodeRequired(
  redis: FastifyRedis,
  id: UserId,
  ip: string,
  ua: string
) {
  const numberOfAllSessions = await redis.scard(sessionSetKey(id));

  if (numberOfAllSessions === 0) {
    return false;
  }

  const allSessionsArray = await redis.smembers(sessionSetKey(id));

  if (numberOfAllSessions === 1) {
    const selectedExpValue = Number(allSessionsArray[0]);
    const sessionGood = await sessionSelector(
      redis,
      sessionHashKey(id, selectedExpValue),
      selectedExpValue,
      sessionSetKey(id)
    );

    if (sessionGood) {
      await verificationCodeRequest(
        redis,
        sessionHashKey(id, selectedExpValue),
        { ip, ua }
      );
      return true;
    }
    if (!sessionGood) {
      return false;
    }
  }

  if (numberOfAllSessions > 1) {
    const suitableSessions = new Map();
    let currentSession = 0;

    while (currentSession < allSessionsArray.length) {
      const selectedExpValue = Number(allSessionsArray[currentSession]);
      const sessionGood = await sessionSelector(
        redis,
        sessionHashKey(id, selectedExpValue),
        selectedExpValue,
        sessionSetKey(id)
      );

      if (sessionGood) {
        const sessionOnlineValue = await redis.hget(
          sessionHashKey(id, selectedExpValue),
          sessionFields.online
        );
        suitableSessions.set(selectedExpValue, sessionOnlineValue);
      }
      currentSession++;
    }

    const noSuitableSessions = suitableSessions.size === 0;

    if (noSuitableSessions) {
      return false;
    }

    if (!noSuitableSessions) {
      //
      // Now let’s select from the Map object
      // the session with the latest online date
      //
      let sessionExpForCodeReq = 0;

      for (const [sessionExp, sessionOnline] of suitableSessions) {
        if (sessionExpForCodeReq === 0) {
          // First run
          sessionExpForCodeReq = sessionExp;
        }
        if (suitableSessions.get(sessionExpForCodeReq) < sessionOnline) {
          sessionExpForCodeReq = sessionExp;
        }
      }
      await verificationCodeRequest(
        redis,
        sessionHashKey(id, sessionExpForCodeReq),
        { ip, ua }
      );
      return true;
    }
  }
}

async function sessionSelector(
  redis: FastifyRedis,
  selectedHashKey: string,
  selectedExpValue: number,
  sessionSet: string
) {
  const sessionIsValid = await sessionValidation(
    redis,
    selectedHashKey,
    sessionSet,
    selectedExpValue
  );
  if (sessionIsValid) {
    const sessionIsNotBlocked = await checkSessionData(redis, selectedHashKey, {
      ban: "false",
    });

    if (sessionIsNotBlocked) {
      return true;
    }
    if (!sessionIsNotBlocked) {
      return false;
    }
  }
}

async function sessionValidation(
  redis: FastifyRedis,
  sessionHashKey: string,
  sessionSetKey: string,
  sessionExpValue: number
) {
  const setValueExists = await redis.sismember(sessionSetKey, sessionExpValue);

  const hashKeyExists = await redis.exists(sessionSetKey);

  const sessionOk = setValueExists && hashKeyExists;
  const noSession = !(setValueExists || hashKeyExists);
  const damagedSession = !sessionOk && !noSession;

  if (sessionOk) return true;
  if (noSession) return false;
  if (damagedSession) {
    await removeSession(redis, sessionHashKey, sessionSetKey, sessionExpValue);
    console.log(`DAMAGED SESSION -> ${sessionHashKey}`);
  }
  return false;
}

async function checkSessionData(
  redis: FastifyRedis,
  sessionHashKey: string,
  client: Partial<{
    ua: string | undefined;
    ip: string | undefined;
    ban: string | undefined;
  }>
) {
  if (client.ua) {
    return await userAgentValidation(redis, sessionHashKey, client.ua);
  }
  if (client.ip) {
    return (await redis.hget(sessionHashKey, sessionFields.ip)) === client.ip;
  }
  if (client.ban) {
    return (await redis.hget(sessionHashKey, sessionFields.ban)) === client.ban;
  }
  return false;
}

export async function createSession(
  redis: FastifyRedis,
  id: UserId,
  exp: number,
  ua: string,
  ip: string
) {
  await redis.hmset(sessionHashKey(id, exp), sessionStartValues(ua, ip));
  await redis.expireat(sessionSetKey(id), exp);

  const setAlreadyExists = (await redis.scard(sessionSetKey(id))) !== 0;
  await redis.sadd(sessionSetKey(id), exp);
  if (setAlreadyExists) {
    await redis.expireat(sessionSetKey(id), exp, "GT");
  }
  if (!setAlreadyExists) {
    await redis.expireat(sessionSetKey(id), exp, "NX");
  }
  // If session hash expired, but set member isnt -> session will deleted by sessionValidation()
}

export async function refreshSession(
  redis: FastifyRedis,
  id: UserId,
  oldExp: number, // from old token
  newExp: number, // from new token
  ua: string | undefined,
  ip: string
) {
  if (!ua) {
    return messageAboutBadUserAgent;
  }
  await removeSession(
    redis,
    sessionHashKey(id, oldExp),
    sessionSetKey(id),
    oldExp
  );
  await createSession(redis, id, newExp, ua, ip);
}

async function updateSession(
  redis: FastifyRedis,
  sessionHashKey: string,
  newInfo: Partial<{
    ua: string | undefined;
    ip: string | undefined;
    ban: string | undefined;
    online: number | undefined;
  }>
) {
  if (newInfo.ua) {
    await redis.hset(sessionHashKey, sessionFields.ua, newInfo.ua);
  }
  if (newInfo.ip) {
    await redis.hset(sessionHashKey, sessionFields.ip, newInfo.ip);
  }
  if (newInfo.ban) {
    await redis.hset(sessionHashKey, sessionFields.ban, newInfo.ban);
  }
  if (newInfo.online) {
    await redis.hset(sessionHashKey, sessionFields.online, newInfo.online);
  }
}

async function removeSession(
  redis: FastifyRedis,
  sessionHashKey: string,
  sessionSetKey: string,
  sessionSetMember: number
) {
  await redis.del(sessionHashKey);
  await redis.srem(sessionSetKey, sessionSetMember);
}

async function userAgentValidation(
  redis: FastifyRedis,
  sessionHash: string,
  clientUA: string
) {
  const redisUA = await redis.hget(sessionHash, sessionFields.ua);

  if (redisUA === null) {
    return false;
  } // If redis faulted || TODO
  if (clientUA === redisUA) {
    return true;
  }
  if (userAgentComparator(clientUA, redisUA)) {
    //
    // Update the user agent if its change is not associated
    // with significant (bad) changes on the client user agent
    //
    await updateSession(redis, sessionHash, { ua: clientUA });
    return true;
  }
  return false;
}

function userAgentComparator(clientUA: string, redisUA: string) {
  const parsedClientUA = parser(clientUA);
  const parsedRedisUA = parser(redisUA);

  if (parsedClientUA.browser.name !== parsedRedisUA.browser.name) {
    return false;
  }
  if (
    parsedClientUA.browser.version === undefined ||
    (parsedRedisUA.browser.version &&
      parsedClientUA.browser.version < parsedRedisUA.browser.version)
  ) {
    return false;
  }
  if (
    parsedClientUA.engine.name === undefined ||
    parsedClientUA.engine.name !== parsedRedisUA.engine.name
  ) {
    return false;
  }
  if (
    parsedClientUA.engine.version === undefined ||
    (parsedRedisUA.engine.version &&
      parsedClientUA.engine.version < parsedRedisUA.engine.version)
  ) {
    return false;
  }
  if (
    parsedClientUA.os.name === undefined ||
    parsedClientUA.os.name !== parsedRedisUA.os.name
  ) {
    return false;
  }
  if (parsedClientUA.os.version === undefined) {
    return false;
  }
  if (parsedClientUA.device.model !== parsedRedisUA.device.model) {
    return false;
  }
  if (parsedClientUA.device.type !== parsedRedisUA.device.type) {
    return false;
  }
  if (parsedClientUA.device.vendor !== parsedRedisUA.device.vendor) {
    return false;
  }
  if (
    parsedClientUA.cpu.architecture === undefined ||
    parsedClientUA.cpu.architecture !== parsedRedisUA.cpu.architecture
  ) {
    return false;
  }
  return true;
}
