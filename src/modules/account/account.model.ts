import { FastifyRedis } from "@fastify/redis";
import {
  accountKey,
  accountPrivacyRules,
  accountStartValues,
  blockedKey,
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
  async function isUserBlockedByUser(userId: UserId, targetUserId: UserId) {
    return !!(await redis.sismember(blockedKey(targetUserId), userId));
  }

  async function initAccount(targetUserId: UserId, username: string) {
    const result = await redis.hmset(
      accountKey(targetUserId),
      accountStartValues(username)
    );
    if (result === "OK") {
      return true;
    }
    return false;
  }

  async function isAccountExist(userId: UserId) {
    const result = await redis.hlen(accountKey(userId));
    if (result > 0) {
      return true;
    }
    return false;
  }

  async function readAccountGeneralValue(
    targetUserId: UserId,
    fieldToRead: ReadTargetUserGeneralField
  ) {
    return await redis.hget(accountKey(targetUserId), fieldToRead);
  }

  async function writeAccountGeneralValue(
    targetUserId: UserId,
    fieldToWrite: WriteTargetUserField,
    valueToWrite?: string
  ) {
    if (valueToWrite) {
      const result = await redis.hset(
        accountKey(targetUserId),
        fieldToWrite,
        valueToWrite
      );
      if (result === 0 || result === 1) {
        // field exist, if not -> result === 1
        return true;
      }
    }
    return false;
  }

  async function readAccountPrivacyValue(
    targetUserId: UserId,
    ReadtargetUserPrivacyField: ReadTargetUserPrivacyField
  ) {
    const data = await redis.hget(
      accountKey(targetUserId), // TODO Change privacy fields location
      ReadtargetUserPrivacyField
    );
    const noData = data === null; // TODO add special error for empty data
    const correctData =
      data === accountPrivacyRules.everybody ||
      data === accountPrivacyRules.friends ||
      data === accountPrivacyRules.nobody;
    if (correctData) {
      return data;
    }
    if (noData) {
      console.log(`No data on ${accountKey(targetUserId)}`);
    }
    if (!correctData) {
      console.log(`No correct data on ${accountKey(targetUserId)}`);
    }
    return null;
  }

  async function writeAccountPrivacyValue(
    targetUserId: UserId,
    ReadtargetUserPrivacyField: ReadTargetUserPrivacyField,
    targetUserPrivacyValue?: AccountPrivacyRules
  ) {
    if (targetUserPrivacyValue) {
      const result = await redis.hset(
        accountKey(targetUserId),
        ReadtargetUserPrivacyField,
        targetUserPrivacyValue
      );
      console.log(result);
      if (result === 0 || result === 1) {
        // field exist, if not -> result === 1
        return true;
      }
    }
    return false;
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
    isUserBlockedByUser,
    isAccountExist,
    initAccount,
    readAccountGeneralValue,
    writeAccountGeneralValue,
    readAccountPrivacyValue,
    writeAccountPrivacyValue,
    setLastSeenMessageCreated,
    getLastSeenMessageCreated,
  };
};
