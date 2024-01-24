import { FastifyRedis } from "@fastify/redis";
import {
  accountFields,
  accountKey,
  accountPrivacyRules,
  accountStartValues,
  blockedKey,
  friendsKey,
} from "./account.constants";
import { userRoomsSetKey } from "../room/room.constants";
import { UserId } from "../types";
import { TargetUserPrivacyField } from "./account.types";

export async function initAccount(
  redis: FastifyRedis,
  targetUserId: UserId,
  username: string
) {
  await redis.hmset(accountKey(targetUserId), accountStartValues(username));
}

export async function getGeneralInfo(
  redis: FastifyRedis,
  targetUserId: UserId,
  fieldToRead: (typeof accountFields)["general"][
    | "username"
    | "name"
    | "bio"
    | "lastSeen"]
) {
  return await redis.hget(accountKey(targetUserId), fieldToRead);
}

export async function readAccountPrivacyValue(
  redis: FastifyRedis,
  targetUserId: UserId,
  targetUserPrivacyField: TargetUserPrivacyField
) {
  const data = await redis.hget(
    accountKey(targetUserId), // TODO Change privacy fields location
    targetUserPrivacyField
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

export async function isUserBlockedByUser(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  return !!(await redis.sismember(blockedKey(targetUserId), userId));
}

export async function getBlockedCount(
  redis: FastifyRedis,
  targetUserId: UserId
) {
  return await redis.scard(blockedKey(targetUserId));
}

export async function getBlocked(redis: FastifyRedis, targetUserId: UserId) {
  return await redis.smembers(blockedKey(targetUserId));
}

export async function addBlocked(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  await redis.sadd(blockedKey(userId), targetUserId);
}

export async function removeBlocked(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  await redis.srem(blockedKey(userId), targetUserId);
}

export async function isFriend(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  return !!(await redis.sismember(friendsKey(targetUserId), userId));
}

export async function getFriends(redis: FastifyRedis, targetUserId: UserId) {
  return await redis.smembers(friendsKey(targetUserId));
}

export async function getFriendCount(
  redis: FastifyRedis,
  targetUserId: UserId
) {
  return await redis.scard(friendsKey(targetUserId));
}

export async function addFriend(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  await redis.sadd(friendsKey(userId), targetUserId);
}

export async function removeFriend(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  await redis.srem(friendsKey(userId), targetUserId);
}

export async function getRooms(redis: FastifyRedis, targetUserId: UserId) {
  return await redis.smembers(userRoomsSetKey(targetUserId));
}

export async function getRoomCount(redis: FastifyRedis, targetUserId: UserId) {
  return await redis.scard(userRoomsSetKey(targetUserId));
}
