import { FastifyRedis } from "@fastify/redis";
import parser from "ua-parser-js";
import { verificationCodeRequest } from "./session.security-code";
import { UserId } from "../../types";
import {
  messageAboutBadUserAgent,
  messageAboutServerError,
  messageAboutSessionOK,
  messageAboutSessionRefreshed,
  sessionHashKey,
  sessionSetKey,
} from "../../constants";
import {
  messageAboutBlockedSession,
  messageAboutNoSession,
  sessionFields,
  sessionStartValues,
} from "./session.constants";
import { messageAboutWrongToken } from "../../constants";
import { checkToken, createToken, isNeedNewToken } from "../../../utils/token";
import { JWT } from "@fastify/jwt";

export async function sessionWrapper(
  redis: FastifyRedis,
  jwt: JWT,
  daysOfTokenToBeUpdated: string | number,
  token: any,
  ip: string,
  ua?: string
) {
  if (!ua) {
    return messageAboutBadUserAgent;
  }
  const tokenData = await checkToken(token);
  if (tokenData && tokenData.id && tokenData.exp) {
    const sessionResult = await checkSession(redis, {
      id: tokenData.id,
      exp: tokenData.exp,
      ip: ip,
      ua: ua,
    });
    if ("data" in sessionResult) {
      const toUpdate = isNeedNewToken(tokenData.exp, daysOfTokenToBeUpdated);
      if (toUpdate) {
        return await refreshSession(redis, jwt, tokenData, ip, ua);
      }
      return { token: tokenData };
    }
    return sessionResult;
  }
  return messageAboutWrongToken;
}

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
        // Tracking client ip
        await updateSession(redis, sessionHashKey(client.id, client.exp), {
          online: Date.now(),
        });
      } // Tracking online status for current session
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
  id: UserId
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
      await verificationCodeRequest(redis, id, selectedExpValue);
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
      await verificationCodeRequest(redis, id, sessionExpForCodeReq);
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
  const hashResult = await redis.hmset(
    sessionHashKey(id, exp),
    sessionStartValues(ua, ip)
  );
  const hashExpireResult = await redis.expireat(sessionHashKey(id, exp), exp);

  const setAlreadyExists = (await redis.scard(sessionSetKey(id))) !== 0;
  const setResult = await redis.sadd(sessionSetKey(id), exp);

  let setExpireResult: number;
  if (setAlreadyExists) {
    setExpireResult = await redis.expireat(sessionSetKey(id), exp, "GT");
  } else {
    setExpireResult = await redis.expireat(sessionSetKey(id), exp, "NX");
  }
  if (
    hashResult === "OK" &&
    hashExpireResult === 1 &&
    setResult === 1 &&
    setExpireResult === 1
  ) {
    return true;
  }
  return false;
  // If session hash expired, but set member isnt -> session will deleted by sessionValidation()
  // Bump session set expire every session refreshing
}

export async function refreshSession(
  redis: FastifyRedis,
  jwt: JWT,
  oldToken: {
    id: any;
    exp: any;
  },
  ip: string,
  ua: string
) {
  const newToken = await createToken(jwt, oldToken.id);
  if (newToken && newToken.id && newToken.exp && newToken.raw) {
    if (oldToken.id !== newToken.id) {
      // When "old" id !== new id
      return messageAboutServerError;
    }
    const removeOldSessionResult = await removeSession(
      redis,
      sessionHashKey(oldToken.id, oldToken.exp),
      sessionSetKey(oldToken.id),
      oldToken.exp
    );
    const createNewSessionResult = await createSession(
      redis,
      newToken.id,
      newToken.exp,
      ua,
      ip
    );
    if (!removeOldSessionResult || !createNewSessionResult) {
      return messageAboutServerError;
    }
    return {
      newToken: { raw: newToken.raw, id: newToken.id, exp: newToken.exp },
    };
  }
  return messageAboutServerError;
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
  const hashResult = await redis.del(sessionHashKey);
  const setResult = await redis.srem(sessionSetKey, sessionSetMember);
  if (hashResult === 1 && setResult === 1) {
    return true;
  }
  return false;
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
