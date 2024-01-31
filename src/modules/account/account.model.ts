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

const model = (redis: FastifyRedis) => {
  async function isFriend(userId: UserId, targetUserId: UserId) {
    return !!(await redis.sismember(friendsKey(targetUserId), userId));
  }

  async function isUserBlockedByUser(userId: UserId, targetUserId: UserId) {
    return !!(await redis.sismember(blockedKey(targetUserId), userId));
  }

  async function initAccount(targetUserId: UserId, username: string) {
    await redis.hmset(accountKey(targetUserId), accountStartValues(username));
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
    initAccount,
    readAccountGeneralValue,
    writeAccountGeneralValue,
    readAccountPrivacyValue,
    writeAccountPrivacyValue,
  };
};

export { model };
//////////////////////////////////////////////
// export async function getBlockedCount(
//   redis: FastifyRedis,
//   targetUserId: UserId
// ) {
//   return await redis.scard(blockedKey(targetUserId));
// }

// export async function getBlocked(redis: FastifyRedis, targetUserId: UserId) {
//   return await redis.smembers(blockedKey(targetUserId));
// }

// export async function addBlocked(
//   redis: FastifyRedis,
//   userId: UserId,
//   targetUserId: UserId
// ) {
//   await redis.sadd(blockedKey(userId), targetUserId);
// }

// export async function removeBlocked(
//   redis: FastifyRedis,
//   userId: UserId,
//   targetUserId: UserId
// ) {
//   await redis.srem(blockedKey(userId), targetUserId);
// }

// export async function getFriends(redis: FastifyRedis, targetUserId: UserId) {
//   return await redis.smembers(friendsKey(targetUserId));
// }

// export async function getFriendCount(
//   redis: FastifyRedis,
//   targetUserId: UserId
// ) {
//   return await redis.scard(friendsKey(targetUserId));
// }

// export async function addFriend(
//   redis: FastifyRedis,
//   userId: UserId,
//   targetUserId: UserId
// ) {
//   await redis.sadd(friendsKey(userId), targetUserId);
// }

// export async function removeFriend(
//   redis: FastifyRedis,
//   userId: UserId,
//   targetUserId: UserId
// ) {
//   await redis.srem(friendsKey(userId), targetUserId);
// }

// export async function getRooms(redis: FastifyRedis, targetUserId: UserId) {
//   return await redis.smembers(userRoomsSetKey(targetUserId));
// }

// export async function getRoomCount(redis: FastifyRedis, targetUserId: UserId) {
//   return await redis.scard(userRoomsSetKey(targetUserId));
// }
