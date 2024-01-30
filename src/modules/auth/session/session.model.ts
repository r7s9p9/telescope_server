import { FastifyRedis } from "@fastify/redis";
import { sessionFields } from "./session.constants";
import { UserId } from "../../types";
import { sessionHashKey, sessionSetKey } from "../../constants";

const model = (redis: FastifyRedis, userId: UserId) => {
  const setKey = sessionSetKey(userId);

  async function getSessionCount() {
    return await redis.scard(setKey);
  }

  async function getAllSessions() {
    return await redis.smembers(setKey);
  }

  const session = (exp: number) => {
    const hashKey = sessionHashKey(userId, exp);

    async function isSessionExist() {
      const setValueExists = (await redis.sismember(setKey, exp)) === 1;
      const hashKeyExists = (await redis.exists(hashKey)) === 1;

      const sessionOk = setValueExists && hashKeyExists;
      const noSession = !(setValueExists || hashKeyExists);
      const damagedSession = !sessionOk && !noSession;

      if (sessionOk) return true;
      if (noSession) return false;
      if (damagedSession) {
        await removeSession();
        console.log(`DAMAGED SESSION -> ${sessionHashKey}`);
      }

      return false;
    }

    const getSessionData = () => {
      async function ua() {
        return await redis.hget(hashKey, sessionFields.ua);
      }
      async function ip() {
        return await redis.hget(hashKey, sessionFields.ip);
      }
      async function ban() {
        return (await redis.hget(hashKey, sessionFields.ban)) === "true";
      }
      return { ua, ip, ban };
    };

    const isSessionDataEqual = () => {
      async function ua(value: string) {
        return value === (await getSessionData().ua());
      }
      async function ip(value: string) {
        return value === (await getSessionData().ip());
      }
      return { ua, ip };
    };

    const updateSessionData = () => {
      async function ua(value: string) {
        const result = await redis.hset(hashKey, sessionFields.ua, value);
        return result === 1;
      }
      async function ip(value: string) {
        const result = await redis.hset(hashKey, sessionFields.ip, value);
        return result === 1;
      }
      async function ban(value: boolean) {
        const result = await redis.hset(
          hashKey,
          sessionFields.ban,
          value.toString
        );
        return result === 1;
      }

      async function online(value: number) {
        const result = await redis.hset(hashKey, sessionFields.online, value);
        return result === 1;
      }
      return { ua, ip, ban, online };
    };

    async function removeSession() {
      const hashResult = await redis.del(hashKey);
      const setResult = await redis.srem(setKey, exp);
      if (hashResult === 1 && setResult === 1) {
        return true;
      }
      return false;
    }
    return {
      isSessionExist,
      getSessionData,
      isSessionDataEqual,
      updateSessionData,
    };
  };

  return { getSessionCount, getAllSessions, session };
};

export { model };
