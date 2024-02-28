import { FastifyRedis } from "@fastify/redis";
import { model } from "./friend.model";
import { UserId } from "../../types";
import { account } from "../account.controller";
import { accountFields } from "../account.constants";
import {
  payloadNoFriends,
  payloadNoRightToAccess,
  payloadSuccessfullyRead,
} from "./friend.constants";

export const friend = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);

  const isCanReadFriends = async (
    userId: UserId,
    targetUserId: UserId | "self"
  ) => {
    const { properties } = await account(redis, isProd)
      .internal()
      .read(userId, targetUserId, {
        properties: [accountFields.properties.isCanReadFriends],
      });
    if (properties?.isCanReadFriends) return true as const;
    return false as const;
  };

  const internal = () => {
    async function isFriends(userId: UserId, forUserId: UserId) {
      return await m.isFriend(userId, forUserId);
    }

    async function read(userId: UserId) {
      const result = await m.read(userId);
      if (result.length === 0) return { isEmpty: true as const };
      // TODO verification
      return { isEmpty: false as const, friendArr: result };
    }

    async function add(userId: UserId, toUserId: UserId) {
      const result = m.add(userId, toUserId);
      // TODO verification
      return result;
    }

    async function remove(userId: UserId, fromUserId: UserId) {
      const result = await m.remove(userId, fromUserId);
      // TODO verification
      return result;
    }
    return { isFriends, read, add, remove };
  };

  const external = () => {
    async function read(userId: UserId, targetUserId: UserId | "self") {
      const isAllowed = isCanReadFriends(userId, targetUserId);
      if (!isAllowed) return payloadNoRightToAccess(isProd);

      const result = await internal().read(userId);
      if (result.isEmpty) return payloadNoFriends(isProd);
      return payloadSuccessfullyRead(result.friendArr, isProd);
    }

    return { read };
  };

  return { internal, external };
};
