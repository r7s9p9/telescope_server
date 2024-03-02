import { FastifyRedis } from "@fastify/redis";
import {
  accountKey,
  accountPrivacyKey,
  accountPrivacyStartValues,
  accountStartValues,
  lastSeenMessageKey,
} from "./account.constants";
import { RoomId, UserId } from "../types";
import {
  AccountPrivacyRules,
  ReadTargetUserGeneralField,
  ReadTargetUserPrivacyField,
  WriteTargetUserField,
} from "./account.types";

export const model = (redis: FastifyRedis) => {
  async function initAccount(userId: UserId, username: string) {
    const generalResult = await redis.hmset(
      accountKey(userId),
      accountStartValues(username)
    );
    const privacyResult = await redis.hmset(
      accountPrivacyKey(userId),
      accountPrivacyStartValues
    );
    const done = generalResult === "OK" && privacyResult === "OK";
    if (done) return true as const;
    return false as const;
  }

  async function isAccountExist(userId: UserId) {
    const result = await redis.hlen(accountKey(userId));
    if (result > 0) return true as const;
    return false as const;
  }

  async function getGeneralValue(
    userId: UserId,
    field: ReadTargetUserGeneralField
  ) {
    return await redis.hget(accountKey(userId), field);
  }

  async function setGeneralValue(
    userId: UserId,
    field: WriteTargetUserField,
    value: string
  ) {
    const result = await redis.hset(accountKey(userId), field, value);
    if (result === 0 || result === 1) return true as const;
    return false as const;
  }

  async function getPrivacyValue(
    userId: UserId,
    field: ReadTargetUserPrivacyField
  ) {
    return await redis.hget(accountPrivacyKey(userId), field);
  }

  async function setPrivacyValue(
    userId: UserId,
    field: ReadTargetUserPrivacyField,
    value: AccountPrivacyRules
  ) {
    const result = await redis.hset(accountPrivacyKey(userId), field, value);
    if (result === 0 || result === 1) return true as const;
    return false as const;
  }

  async function setLastSeenMessageCreated(
    userId: UserId,
    roomId: RoomId,
    created: string
  ) {
    const result = await redis.hset(
      lastSeenMessageKey(userId),
      roomId,
      created
    );
    if (result === 1 || result === 0) return true as const;
    return false as const;
  }

  async function getLastSeenMessageCreated(userId: UserId, roomId: RoomId) {
    const result = await redis.hget(lastSeenMessageKey(userId), roomId);
    if (!result) return { success: false as const };
    return { success: true as const, created: result };
  }

  return {
    isAccountExist,
    initAccount,
    getGeneralValue,
    setGeneralValue,
    getPrivacyValue,
    setPrivacyValue,
    setLastSeenMessageCreated,
    getLastSeenMessageCreated,
  };
};
