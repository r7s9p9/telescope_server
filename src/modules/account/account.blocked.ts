import { FastifyRedis } from "@fastify/redis";
import { blockedKey } from "../constants";
import { UserId } from "../types";

export async function blockedCount(redis: FastifyRedis, targetUserId: UserId) {
  return await redis.scard(blockedKey(targetUserId));
}

export async function getAllBlocked(redis: FastifyRedis, targetUserId: UserId) {
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
