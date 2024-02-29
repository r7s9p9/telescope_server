import { FastifyRedis } from "@fastify/redis";
import { model } from "./friend.model";
import { UserId } from "../../types";
import { account } from "../account.controller";
import { accountFields } from "../account.constants";
import {
  payloadAddError,
  payloadFriendAlreadyExist,
  payloadFriendAlreadyRemoved,
  payloadNoFriends,
  payloadNoRightToAccess,
  payloadNoRightToBeFriend,
  payloadReadError,
  payloadRemoveError,
  payloadSuccessfullyAdd,
  payloadSuccessfullyRead,
  payloadSuccessfullyRemove,
} from "./friend.constants";
import { AccountReadResult } from "../account.types";
import { userIdArrSchema } from "./friend.schema";

function userIdValidator(userIdArr: string[]) {
  const result = userIdArrSchema.safeParse(userIdArr);
  if (!result.success) return { success: false as const, error: result.error };
  return {
    success: true as const,
    userIdArr: result.data as UserId[],
  };
}

export const friend = (redis: FastifyRedis, isProd: boolean) => {
  const isCanReadFriends = async (
    userId: UserId,
    targetUserId: UserId | "self"
  ) => {
    return await account(redis, isProd)
      .internal()
      .permissionChecker(
        userId,
        targetUserId,
        accountFields.permission.isCanReadFriends
      );
  };

  const isCanBeFriend = async (userId: UserId, targetUserId: UserId) => {
    return await account(redis, isProd)
      .internal()
      .permissionChecker(
        userId,
        targetUserId,
        accountFields.permission.isCanBeFriend
      );
  };

  const internal = () => {
    const m = model(redis);

    async function isFriend(forUserId: UserId, userId: UserId) {
      return await m.isFriend(userId, forUserId);
    }

    async function isFriendOfFriends(forUserId: UserId, userId: UserId) {
      const friendIdArr = await m.read(forUserId);
      const verified = userIdValidator(friendIdArr);
      if (!verified.success) {
        return {
          isError: true as const,
          error: verified.error,
          isFriendOfFriends: false as const,
        };
      }

      // if user blocked === still friend
      for (const friendUserId of verified.userIdArr) {
        if (await isFriend(userId, friendUserId)) {
          return { isFriendOfFriends: true as const };
        }
      }
      return { isFriendOfFriends: false as const };
    }

    async function read(userId: UserId, targetUserId: UserId | "self") {
      if (targetUserId === "self") targetUserId = userId;

      const friendIdArr = await m.read(targetUserId);
      console.log(friendIdArr);
      if (friendIdArr.length === 0) return { isEmpty: true as const };

      const verified = userIdValidator(friendIdArr);
      if (!verified.success) {
        return { isError: true as const, error: verified.error };
      }

      const friendInfoArr: AccountReadResult[] = [];
      for (const friendId of verified.userIdArr) {
        const infoToRead = {
          targetUserId: friendId,
          general: [
            accountFields.general.username,
            accountFields.general.name,
            accountFields.general.lastSeen,
          ],
        };
        const info = await account(redis, isProd)
          .internal()
          .read(userId, friendId, infoToRead);

        friendInfoArr.push(info);
      }

      if (friendInfoArr.length === 0) return { isEmpty: true as const };

      return { isEmpty: false as const, friendInfoArr: friendInfoArr };
    }

    async function add(toUserId: UserId, userId: UserId) {
      return await m.add(userId, toUserId);
    }

    async function remove(fromUserId: UserId, toRemoveUserId: UserId) {
      return await m.remove(toRemoveUserId, fromUserId);
    }
    return { isFriend, isFriendOfFriends, read, add, remove };
  };

  const external = () => {
    async function read(userId: UserId, targetUserId: UserId | "self") {
      const isAllowed = isCanReadFriends(userId, targetUserId);
      if (!isAllowed) return payloadNoRightToAccess(isProd);

      const result = await internal().read(userId, targetUserId);

      if (result.isEmpty) return payloadNoFriends(isProd);
      if (result.isError) return payloadReadError(result.error, isProd);
      return payloadSuccessfullyRead(result.friendInfoArr, isProd);
    }

    async function add(userId: UserId, targetUserId: UserId) {
      if (userId === targetUserId) {
        return payloadNoRightToBeFriend(targetUserId, isProd);
      }

      const isAllowed = await isCanBeFriend(userId, targetUserId);
      if (!isAllowed) return payloadNoRightToBeFriend(targetUserId, isProd);

      const { success, alreadyFriend } = await internal().add(
        userId,
        targetUserId
      );
      if (!success) return payloadAddError(targetUserId, isProd);
      if (alreadyFriend) return payloadFriendAlreadyExist(targetUserId, isProd);
      return payloadSuccessfullyAdd(targetUserId, isProd);
    }

    async function remove(userId: UserId, toRemoveUserId: UserId) {
      const result = await internal().remove(userId, toRemoveUserId);
      if (!result.success) return payloadRemoveError(toRemoveUserId, isProd);
      if (result.alreadyRemoved) {
        return payloadFriendAlreadyRemoved(toRemoveUserId, isProd);
      }
      return payloadSuccessfullyRemove(toRemoveUserId, isProd);
    }

    return { read, add, remove };
  };

  return { internal, external };
};
