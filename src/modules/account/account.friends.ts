import { FastifyRedis } from "@fastify/redis";
import { accountKey } from "../constants";
import { UserId } from "../types";
import { friendsKey } from "../constants";

export async function friendCount(redis: FastifyRedis, targetUserId: UserId) {
  return await redis.scard(friendsKey(targetUserId));
}

export async function getAllFriends(redis: FastifyRedis, targetUserId: UserId) {
  return await redis.smembers(friendsKey(targetUserId));
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
