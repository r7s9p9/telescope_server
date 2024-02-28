import { FastifyRedis } from "@fastify/redis";
import { UserId } from "../../types";
import { friendsKey } from "./friend.constants";

export const model = (redis: FastifyRedis) => {
  async function add(userId: UserId, toUserId: UserId) {
    const result = await redis.sadd(friendsKey(toUserId), userId);
    if (result === 1) {
      return { success: true as const, alreadyFriend: false as const };
    }
    if (result === 0) {
      return { success: true as const, alreadyFriend: true as const };
    }
    return { success: false as const };
  }

  async function remove(userId: UserId, fromUserId: UserId) {
    const result = await redis.srem(friendsKey(fromUserId), userId);
    if (result === 1) {
      return { success: true as const, alreadyRemoved: false as const };
    }
    if (result === 0) {
      return { success: true as const, alreadyRemoved: true as const };
    }
    return { success: false as const };
  }

  async function read(userId: UserId) {
    return await redis.smembers(friendsKey(userId));
  }

  async function isFriend(userId: UserId, forUserId: UserId) {
    return !!(await redis.sismember(friendsKey(forUserId), userId));
  }

  return { add, remove, read, isFriend };
};
