import { FastifyRedis } from "@fastify/redis";
import {
  sessionFields,
  sessionHashKey,
  sessionSetKey,
} from "./session.constants";
import { UserId } from "../../types";

const model = (redis: FastifyRedis) => {
  async function getSessionsCount(userId: UserId) {
    return await redis.scard(sessionSetKey(userId));
  }

  async function getSessionIdArr(userId: UserId) {
    return await redis.smembers(sessionSetKey(userId));
  }

  async function isSessionExist(userId: UserId, sessionId: string) {
    const setValueExists =
      (await redis.sismember(sessionSetKey(userId), sessionId)) === 1;
    const hashKeyExists =
      (await redis.exists(sessionHashKey(userId, sessionId))) === 1;

    const sessionOk = setValueExists && hashKeyExists;
    if (sessionOk) return true as const;

    return false as const;
  }

  async function getDeviceName(userId: UserId, sessionId: string) {
    return await redis.hget(
      sessionHashKey(userId, sessionId),
      sessionFields.deviceName
    );
  }

  async function setDeviceName(
    userId: UserId,
    sessionId: string,
    deviceName: string
  ) {
    return await redis.hset(
      sessionHashKey(userId, sessionId),
      sessionFields.deviceName,
      deviceName
    );
  }

  async function getUserAgent(userId: UserId, sessionId: string) {
    return await redis.hget(
      sessionHashKey(userId, sessionId),
      sessionFields.userAgent
    );
  }

  async function setUserAgent(
    userId: UserId,
    sessionId: string,
    value: string
  ) {
    const result = await redis.hset(
      sessionHashKey(userId, sessionId),
      sessionFields.userAgent,
      value
    );
    return result === 1;
  }

  async function getIp(userId: UserId, sessionId: string) {
    return await redis.hget(
      sessionHashKey(userId, sessionId),
      sessionFields.deviceIp
    );
  }

  async function setIp(userId: UserId, sessionId: string, value: string) {
    const result = await redis.hset(
      sessionHashKey(userId, sessionId),
      sessionFields.deviceIp,
      value
    );
    return result === 1;
  }

  async function setFrozen(
    userId: UserId,
    sessionId: string,
    value: boolean | "true" | "false"
  ) {
    const result = await redis.hset(
      sessionHashKey(userId, sessionId),
      sessionFields.frozen,
      value.toString()
    );
    const done = result === 0 || result === 1;
    return done;
  }

  async function isFrozen(userId: UserId, sessionId: string) {
    return (
      (await redis.hget(
        sessionHashKey(userId, sessionId),
        sessionFields.frozen
      )) !== ("false" as const)
    );
  }

  async function getLastSeen(userId: UserId, sessionId: string) {
    return Number(
      await redis.hget(sessionHashKey(userId, sessionId), sessionFields.online)
    );
  }

  async function setLastSeen(
    userId: UserId,
    sessionId: string,
    value: string | number
  ) {
    const result = await redis.hset(
      sessionHashKey(userId, sessionId),
      sessionFields.online,
      value
    );
    return result === 1;
  }

  async function createSession(
    userId: UserId,
    sessionId: string,
    exp: number,
    sessionHashValues: (string | number)[]
  ) {
    const hashResult = await redis.hmset(
      sessionHashKey(userId, sessionId),
      sessionHashValues
    );
    const hashExpireResult = await redis.expireat(
      sessionHashKey(userId, sessionId),
      exp
    );

    const isSetExist = (await getSessionsCount(userId)) !== 0;

    const setMemberResult = await redis.sadd(sessionSetKey(userId), sessionId);
    let setExpireResult: number;

    if (isSetExist) {
      setExpireResult = await redis.expireat(sessionSetKey(userId), exp, "GT");
    } else {
      setExpireResult = await redis.expireat(sessionSetKey(userId), exp, "NX");
    }

    const hashDone = hashResult === "OK" && hashExpireResult === 1;
    const setDone = setMemberResult === 1 && setExpireResult === 1;

    if (hashDone && setDone) return true as const;
    return false as const;
  }

  async function removeSession(userId: UserId, sessionId: string) {
    const hash = await redis.del(sessionHashKey(userId, sessionId));
    const set = await redis.srem(sessionSetKey(userId), sessionId);
    if (hash === 1 && set === 1) return true as const;
    return false as const;
  }

  return {
    getSessionsCount,
    getSessionIdArr,
    getDeviceName,
    setDeviceName,
    isSessionExist,
    getUserAgent,
    getIp,
    isFrozen,
    getLastSeen,
    setLastSeen,
    setUserAgent,
    setIp,
    setFrozen,
    createSession,
    removeSession,
  };
};

export { model };
