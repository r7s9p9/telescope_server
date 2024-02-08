import { FastifyRedis } from "@fastify/redis";
import {
  accountPrivacyRules,
  accountStartValues,
  blockedKey,
  friendsKey,
} from "./account.constants";
import { accountKey } from "../constants";
import { UserId } from "../types";
import {
  AccountPrivacyRules,
  ReadTargetUserGeneralField,
  ReadTargetUserPrivacyField,
  WriteTargetUserField,
} from "./account.types";

export const model = (redis: FastifyRedis) => {
  async function isFriend(userId: UserId, targetUserId: UserId) {
    return !!(await redis.sismember(friendsKey(targetUserId), userId));
  }

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

  return {
    isFriend,
    isUserBlockedByUser,
    isAccountExist,
    initAccount,
    readAccountGeneralValue,
    writeAccountGeneralValue,
    readAccountPrivacyValue,
    writeAccountPrivacyValue,
  };
};
