import { FastifyRedis } from "@fastify/redis";
import parser from "ua-parser-js";
import { verificationCodeRequest } from "./session.security-code";
import { UserId } from "../../types";
import {
  messageAboutBadUserAgent,
  messageAboutServerError,
  messageAboutSessionOK,
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
import { model } from "./session.model";

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
    const m = model(redis, token.id).session(token.exp);
    const sessionResult = await checkSession(m, {
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

type ExtractFunctionReturnType<T extends Function> = T extends (...args: infer A) => infer R ? R : never;

export async function checkSession(
  m: ExtractFunctionReturnType<typeof model>,
  client: {
    id: UserId;
    exp: number;
    ip: string;
    ua: string | undefined;
  }
) {
  // Move this to separated decorator/preValidation?
  if (!client.ua) {
    return messageAboutBadUserAgent;
  }
  const sessionFound = await m.session(client.exp).isSessionExist();

  if (sessionFound) {
    const isBlocked = await m.getSessionData().ban();
    if (isBlocked) {
      return messageAboutBlockedSession;
    }

    const isEqualIP = await m.isSessionDataEqual().ip(client.ip);
    if (!isEqualIP) await m.updateSessionData().ip(client.ip);

    const uaIsGood = await uaChecker(m, client.ua);
    if (uaIsGood) {
      await m.updateSessionData().online(Date.now());
      return messageAboutSessionOK;
    }
    if (!uaIsGood) {
      await m.updateSessionData().ban(true);
      return messageAboutBlockedSession;
    }
  }
  return messageAboutNoSession;
}

export async function isVerificationCodeRequired(
  redis: FastifyRedis,
  userId: UserId
) {
  const sessionCount = await redis.scard(sessionSetKey(userId));

  if (sessionCount === 0) {
    return false;
  }

  const allSessionsArray = await redis.smembers(sessionSetKey(userId));

  if (sessionCount === 1) {
    const selectedExpValue = Number(allSessionsArray[0]);
    const m = model(redis, userId, selectedExpValue);
    const sessionFound = await m.isSessionExist();
    const sessionIsblocked = await m.getSessionData().ban();
    const sessionGood = sessionFound && !sessionIsblocked;

    if (!sessionGood) {
      return false;
    }
    const recorded = await verificationCodeRequest(redis, userId, selectedExpValue);
    return true;
  }

  if (sessionCount > 1) {
    const suitableSessions = new Map();
    let currentSession = 0;

    for (const )

    while (currentSession < allSessionsArray.length) {
      const selectedExpValue = Number(allSessionsArray[currentSession]);
      const sessionGood = await sessionSelector(
        redis,
        sessionHashKey(userId, selectedExpValue),
        selectedExpValue,
        sessionSetKey(userId)
      );

      if (sessionGood) {
        const sessionOnlineValue = await redis.hget(
          sessionHashKey(userId, selectedExpValue),
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
  m: ReturnType<typeof model>,
  selectedHashKey: string,
  selectedExpValue: number,
  sessionSet: string
) {
  const sessionIsValid = await m.isSessionExist();
  if (sessionIsValid) {
    const sessionIsNotBlocked = await checkSessionData(m, selectedHashKey, {
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

async function checkSessionData(
  m: ReturnType<typeof model>,
  client: Partial<{
    ua: string | undefined;
    ip: string | undefined;
    ban: string | undefined;
  }>
) {
  if (client.ua) {
    return await userAgentValidation(m, sessionHashKey, client.ua);
  }
  if (client.ip) {
    return await m.isSessionDataEqual().ua(client.ip);
  }
  if (client.ban) {
    return await m.isSessionDataEqual().ban(client.ban);
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

async function uaChecker(m: ReturnType<typeof model>, clientUA: string) {
  const storedUA = await m.getSessionData().ua();

  if (storedUA === null) {
    // Change alg when data in redis is bad!
    return false;
  }
  if (clientUA === storedUA) {
    return true;
  }
  if (uaComparator(clientUA, storedUA)) {
    //
    // Update the user agent if its change is not associated
    // with significant (bad) changes on the client user agent
    //
    const recorded = await m.updateSessionData().ua(clientUA);
    if (!recorded) {
      console.log(`New UA not recorded! UA: ${clientUA}`);
    }
    return true;
  }
  return false;
}

function uaComparator(clientUA: string, storedUA: string) {
  const parsedClientUA = parser(clientUA);
  const parsedStoredUA = parser(storedUA);

  if (parsedClientUA.browser.name !== parsedStoredUA.browser.name) {
    return false;
  }
  if (
    parsedClientUA.browser.version === undefined ||
    (parsedStoredUA.browser.version &&
      parsedClientUA.browser.version < parsedStoredUA.browser.version)
  ) {
    return false;
  }
  if (
    parsedClientUA.engine.name === undefined ||
    parsedClientUA.engine.name !== parsedStoredUA.engine.name
  ) {
    return false;
  }
  if (
    parsedClientUA.engine.version === undefined ||
    (parsedStoredUA.engine.version &&
      parsedClientUA.engine.version < parsedStoredUA.engine.version)
  ) {
    return false;
  }
  if (
    parsedClientUA.os.name === undefined ||
    parsedClientUA.os.name !== parsedStoredUA.os.name
  ) {
    return false;
  }
  if (parsedClientUA.os.version === undefined) {
    return false;
  }
  if (parsedClientUA.device.model !== parsedStoredUA.device.model) {
    return false;
  }
  if (parsedClientUA.device.type !== parsedStoredUA.device.type) {
    return false;
  }
  if (parsedClientUA.device.vendor !== parsedStoredUA.device.vendor) {
    return false;
  }
  if (
    parsedClientUA.cpu.architecture === undefined ||
    parsedClientUA.cpu.architecture !== parsedStoredUA.cpu.architecture
  ) {
    return false;
  }
  return true;
}
