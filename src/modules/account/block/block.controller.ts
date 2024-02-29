import { FastifyRedis } from "@fastify/redis";
import { model } from "./block.model";
import { UserId } from "../../types";
import { userIdArrSchema } from "./block.schema";
import { AccountReadResult } from "../account.types";
import { accountFields } from "../account.constants";
import { account } from "../account.controller";
import {
  payloadAddError,
  payloadBlockedAlreadyExist,
  payloadBlockedAlreadyRemoved,
  payloadNoSelfBlock,
  payloadNobodyBlocked,
  payloadReadError,
  payloadRemoveError,
  payloadSuccessfullyAdd,
  payloadSuccessfullyRead,
  payloadSuccessfullyRemove,
} from "./block.constants";

function userIdValidator(userIdArr: string[]) {
  const result = userIdArrSchema.safeParse(userIdArr);
  if (!result.success) return { success: false as const, error: result.error };
  return {
    success: true as const,
    userIdArr: result.data as UserId[],
  };
}

export const block = (redis: FastifyRedis, isProd: boolean) => {
  const internal = () => {
    const m = model(redis);

    async function isBlocked(forUserId: UserId, userId: UserId) {
      return await m.isBlocked(userId, forUserId);
    }

    async function read(userId: UserId) {
      const blockedIdArr = await m.read(userId);
      if (blockedIdArr.length === 0) return { isEmpty: true as const };

      const verified = userIdValidator(blockedIdArr);
      if (!verified.success) {
        return { isError: true as const, error: verified.error };
      }

      const blockedInfoArr: AccountReadResult[] = [];
      for (const blockedId of verified.userIdArr) {
        const infoToRead = {
          targetUserId: blockedId,
          general: [
            accountFields.general.username,
            accountFields.general.name,
            accountFields.general.lastSeen,
          ],
        };
        const info = await account(redis, isProd)
          .internal()
          .read(userId, blockedId, infoToRead);

        blockedInfoArr.push(info);
      }

      if (blockedInfoArr.length === 0) return { isEmpty: true as const };

      return { isEmpty: false as const, blockedInfoArr: blockedInfoArr };
    }

    async function add(toUserId: UserId, userId: UserId) {
      return await m.add(userId, toUserId);
    }

    async function remove(fromUserId: UserId, toRemoveUserId: UserId) {
      return await m.remove(toRemoveUserId, fromUserId);
    }
    return { isBlocked, read, add, remove };
  };
  const external = () => {
    async function read(userId: UserId) {
      const result = await internal().read(userId);

      if (result.isEmpty) return payloadNobodyBlocked(isProd);
      if (result.isError) return payloadReadError(result.error, isProd);
      return payloadSuccessfullyRead(result.blockedInfoArr, isProd);
    }

    async function add(userId: UserId, targetUserId: UserId) {
      if (userId === targetUserId) {
        return payloadNoSelfBlock(isProd);
      }

      const { success, alreadyBlocked } = await internal().add(
        userId,
        targetUserId
      );
      if (!success) return payloadAddError(targetUserId, isProd);
      if (alreadyBlocked)
        return payloadBlockedAlreadyExist(targetUserId, isProd);
      return payloadSuccessfullyAdd(targetUserId, isProd);
    }

    async function remove(userId: UserId, toRemoveUserId: UserId) {
      const result = await internal().remove(userId, toRemoveUserId);
      if (!result.success) return payloadRemoveError(toRemoveUserId, isProd);
      if (result.alreadyRemoved) {
        return payloadBlockedAlreadyRemoved(toRemoveUserId, isProd);
      }
      return payloadSuccessfullyRemove(toRemoveUserId, isProd);
    }

    return { read, add, remove };
  };
  return { internal, external };
};
