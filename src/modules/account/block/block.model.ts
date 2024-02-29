import { FastifyRedis } from "@fastify/redis";
import { UserId } from "../../types";
import { blockKey } from "./block.constants";

export const model = (redis: FastifyRedis) => {
  async function add(userId: UserId, toUserId: UserId) {
    const result = await redis.sadd(blockKey(toUserId), userId);
    console.log(result);
    if (result === 1) {
      return { success: true as const, alreadyBlocked: false as const };
    }
    if (result === 0) {
      return { success: true as const, alreadyBlocked: true as const };
    }
    return { success: false as const };
  }

  async function remove(userId: UserId, fromUserId: UserId) {
    const result = await redis.srem(blockKey(fromUserId), userId);
    if (result === 1) {
      return { success: true as const, alreadyRemoved: false as const };
    }
    if (result === 0) {
      return { success: true as const, alreadyRemoved: true as const };
    }
    return { success: false as const };
  }

  async function read(userId: UserId) {
    return await redis.smembers(blockKey(userId));
  }

  async function isBlocked(userId: UserId, forUserId: UserId) {
    return !!(await redis.sismember(blockKey(forUserId), userId));
  }

  return { add, remove, read, isBlocked };
};
