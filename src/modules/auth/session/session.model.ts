import { FastifyRedis } from "@fastify/redis";
import { sessionFields, sessionStartValues } from "./session.constants";
import { UserId } from "../../types";
import { accountKey, sessionHashKey, sessionSetKey } from "../../constants";

const model = (redis: FastifyRedis) => {
  async function getSessionCountFromSet(userId: UserId) {
    return await redis.scard(sessionSetKey(userId));
  }

  async function getAllSessionsFromSet(userId: UserId) {
    return await redis.smembers(sessionSetKey(userId));
  }

  async function isSessionExist(userId: UserId, exp: number) {
    const setValueExists =
      (await redis.sismember(sessionSetKey(userId), exp)) === 1;
    const hashKeyExists =
      (await redis.exists(sessionHashKey(userId, exp))) === 1;

    const sessionOk = setValueExists && hashKeyExists;
    const noSession = !(setValueExists || hashKeyExists);
    const damagedSession = !sessionOk && !noSession;

    if (sessionOk) return true;
    if (noSession) return false;
    if (damagedSession) {
      await removeSession(userId, exp);
      console.log(`DAMAGED SESSION -> ${sessionHashKey(userId, exp)}`);
    }

    return false;
  }

  const getSessionData = (userId: UserId, exp: number) => {
    async function ua() {
      return await redis.hget(sessionHashKey(userId, exp), sessionFields.ua);
    }
    async function ip() {
      return await redis.hget(sessionHashKey(userId, exp), sessionFields.ip);
    }
    async function ban() {
      return (
        (await redis.hget(sessionHashKey(userId, exp), sessionFields.ban)) ===
        "true"
      );
    }
    async function online() {
      return Number(
        await redis.hget(sessionHashKey(userId, exp), sessionFields.online)
      );
    }
    return { ua, ip, ban, online };
  };

  const isSessionDataEqual = (userId: UserId, exp: number) => {
    async function ua(value: string) {
      return value === (await getSessionData(userId, exp).ua());
    }
    async function ip(value: string) {
      return value === (await getSessionData(userId, exp).ip());
    }
    return { ua, ip };
  };

  const updateSessionData = (userId: UserId, exp: number) => {
    async function ua(value: string) {
      const result = await redis.hset(
        sessionHashKey(userId, exp),
        sessionFields.ua,
        value
      );
      return result === 1;
    }
    async function ip(value: string) {
      const result = await redis.hset(
        sessionHashKey(userId, exp),
        sessionFields.ip,
        value
      );
      return result === 1;
    }
    async function ban(value: boolean) {
      const result = await redis.hset(
        sessionHashKey(userId, exp),
        sessionFields.ban,
        value.toString()
      );
      return result === 1;
    }

    async function online(value: number) {
      const result = await redis.hset(
        sessionHashKey(userId, exp),
        sessionFields.online,
        value
      );
      return result === 1;
    }
    return { ua, ip, ban, online };
  };

  async function createSession(
    userId: UserId,
    exp: number,
    sessionHashValues: (string | number)[]
  ) {
    const createHashResult = await redis.hmset(
      sessionHashKey(userId, exp),
      sessionHashValues
    );
    const setupHashExpireResult = await redis.expireat(
      sessionHashKey(userId, exp),
      exp
    );

    const isSetAlreadyExists = (await getSessionCountFromSet(userId)) !== 0;

    const createSetMemberResult = await redis.sadd(sessionSetKey(userId), exp);
    let setupSetExpireResult: number;

    if (isSetAlreadyExists) {
      setupSetExpireResult = await redis.expireat(
        sessionSetKey(userId),
        exp,
        "GT"
      );
    } else {
      setupSetExpireResult = await redis.expireat(
        sessionSetKey(userId),
        exp,
        "NX"
      );
    }

    const hashDone = createHashResult === "OK" && setupHashExpireResult === 1;
    const setDone = createSetMemberResult === 1 && setupSetExpireResult === 1;

    if (hashDone && setDone) {
      return true;
    }
    return false;
  }

  async function removeSession(userId: UserId, exp: number) {
    const hashResult = await redis.del(sessionHashKey(userId, exp));
    const setResult = await redis.srem(sessionSetKey(userId), exp);
    if (hashResult === 1 && setResult === 1) {
      return true;
    }
    return false;
  }

  async function writeCode(userId: UserId, exp: number, code: number) {
    const codeLocationResult = await redis.hset(
      accountKey(userId),
      "codePassedToSession",
      exp
    );
    const codeInSessionResult = await redis.hset(
      sessionHashKey(userId, exp),
      "security-code",
      code
    );
    if (codeLocationResult === 1 && codeInSessionResult === 1) {
      return true;
    }
    return false;
  }

  async function isCodeExist(userId: UserId) {
    const sessionExp = await redis.hget(
      accountKey(userId),
      "codePassedToSession"
    );
    const storedCode = await redis.hget(
      sessionHashKey(userId, Number(sessionExp)),
      "security-code"
    );
    if (sessionExp === null || storedCode === null) {
      return false;
    }
    return true;
  }

  async function getCodeLocation(userId: UserId) {
    const result = await redis.hget(accountKey(userId), "codePassedToSession");
    if (result) {
      return Number(result);
    }
    return null;
  }

  async function readCode(userId: UserId, exp: number) {
    const result = await redis.hget(
      sessionHashKey(userId, exp),
      "security-code"
    );
    if (result) {
      return Number(result);
    }
    return null;
  }

  async function removeCode(userId: UserId, exp: number) {
    const locationResult = await redis.hdel(
      accountKey(userId),
      "codePassedToSession"
    );
    const codeResult = await redis.hdel(
      sessionHashKey(userId, exp),
      "security-code"
    );
    if (locationResult === 1 && codeResult === 1) {
      return true;
    }
    return false;
  }

  return {
    getSessionCountFromSet,
    getAllSessionsFromSet,
    isSessionExist,
    getSessionData,
    isSessionDataEqual,
    updateSessionData,
    createSession,
    removeSession,
    writeCode,
    isCodeExist,
    getCodeLocation,
    readCode,
    removeCode,
  };
};

export { model };
