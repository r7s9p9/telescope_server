import { FastifyRedis } from "@fastify/redis";
import crypto from "crypto";
import { UserId, UserIdArr, RoomId, Message, MessageContent } from "../types";
import {
  RoomInfoValues,
  serviceRoomKey,
  serviceRoomName,
  welcomeServiceRoomMessage,
} from "./room.constants";
import { account } from "../account/account.controller";
import { accountFields } from "../account/account.constants";
import { model } from "./room.model";

// user:userid:rooms:allRoomsKeyPart            User rooms              (Set)
// user:userid:rooms:internal:serviceRoomName   App messages            (Sorted Set)
// user:userid:rooms:internal:personalRoomName  Self messages           (Sorted Set)
// room:roomId                                  Room messages           (Sorted Set)

export const room = (redis: FastifyRedis) => {
  const a = account(redis);

  async function createInternalRooms(redis: FastifyRedis, userId: UserId) {
    async function createServiceRoom(redis: FastifyRedis, userId: UserId) {
      const appFirstMessage = {
        author: serviceRoomName,
        content: {
          text: welcomeServiceRoomMessage,
        },
      };
      // Add message func ???????
      await redis.zadd(
        serviceRoomKey(userId),
        Date.now(),
        JSON.stringify(appFirstMessage)
      );
    }
    const roomInfo: RoomInfoValues = {
      name: serviceRoomName,
      creatorId: userId,
      type: "single",
      about: "Service notifications",
    };

    await initRoom(redis, roomInfo);
    await createServiceRoom(redis, userId);
  }

  async function initRoom(
    redis: FastifyRedis,
    roomInfo: RoomInfoValues,
    userIdArr?: UserIdArr
  ): Promise<{ userCount: number; roomId: RoomId } | { error: string }> {
    const roomId = crypto.randomUUID();

    if (roomInfo.type === "single") {
      if (!userIdArr) {
        await model(redis).addRoom(roomInfo.creatorId, roomId, roomInfo);
        return { userCount: 1, roomId: roomId };
      } else {
        return { error: "Wrong room type selected" };
      }
    } else if (roomInfo.type === "public" || roomInfo.type === "private") {
      if (!userIdArr || userIdArr.length === 0) {
        return { error: "No members provided" };
      }
      const suitableUsers = new Set<UserId>();
      for (const userId of userIdArr) {
        const account = await a.readAccount(
          { properties: [accountFields.properties.isCanAddToRoom] },
          roomInfo.creatorId,
          userId
        );
        if (account.properties && account.properties.isCanAddToRoom === true) {
          suitableUsers.add(userId);
        }
      }
      if (suitableUsers.size > 1) {
        for (const userId of suitableUsers) {
          await model(redis).addRoom(userId, roomId, roomInfo);
        }
        return { userCount: suitableUsers.size, roomId: roomId };
      } else {
        return { error: "No suitable users" };
      }
    }
    return { error: "Wrong room type selected" };
  }

  return { createInternalRooms, initRoom };
};

// export async function deleteRoom(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId
// ) {
//   const creatorid = await redis.hget(roomInfoKey(roomId), "creator");
//   if (creatorid === userId) {
//     // Bad idea to remove all at once
//     await redis.del(roomKey(roomId));
//     await redis.del(roomInfoKey(roomId));
//     await redis.del(roomUsersKey(roomId));
//     await redis.del(roomBlockedUsersKey(roomId));
//     return true;
//   }
//   return false;
// }

// export async function updateRoom(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId,
//   roomInfo: RoomInfoValues
// ) {
//   if (await model.isCreator(redis, userId, roomId)) {
//     if (roomInfo.name) {
//       await redis.hset(roomKey(roomId), roomInfo.name);
//     }
//     if (roomInfo.type) {
//       await redis.hset(roomKey(roomId), roomInfo.type);
//     }
//     if (roomInfo.about) {
//       await redis.hset(roomKey(roomId), roomInfo.about);
//     }
//     return true;
//   }
//   return false;
// }

// export async function readRoomInfo(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId
// ) {
//   if (await checkAccessToRoom(redis, userId, roomId)) {
//     const roomInfo = await redis.hmget(
//       roomInfoKey(roomId),
//       roomInfoFields.name,
//       roomInfoFields.creator,
//       roomInfoFields.type,
//       roomInfoFields.about
//     );
//     return roomInfo;
//   }
//   return false;
// }

// export async function readRoomUsers(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId
// ) {
//   if (await checkAccessToRoom(redis, userId, roomId)) {
//     return await redis.smembers(roomUsersKey(roomId));
//   }
//   return false;
// }

// export async function readRoomUserCount(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId
// ) {
//   if (await checkAccessToRoom(redis, userId, roomId)) {
//     return false;
//   }
//   return await redis.scard(roomUsersKey(roomId));
// }

// export async function readRoomContent(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId,
//   position: number,
//   range: number
// ) {
//   if (await checkAccessToRoom(redis, userId, roomId)) {
//     const startIndex = position;
//     const stopIndex = position + range;
//     return await redis.zrevrange(roomKey(roomId), startIndex, stopIndex);
//   }
// }

// export async function addMessage(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId,
//   content: MessageContent
// ) {
//   if (await checkAccessToPosting(redis, userId, roomId)) {
//     const message: Message = {
//       author: userId,
//       content: content,
//     };

//     await redis.zadd(roomKey(roomId), Date.now(), JSON.stringify(message));
//   }
// }

// export async function checkAccessToPosting(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId
// ) {
//   if (await checkAccessToRoom(redis, userId, roomId)) {
//     return await redis.sismember(roomUsersKey(roomId), userId);
//   }
// }

// export async function checkAccessToRoom(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId
// ) {
//   if (await isUserBlockedInRoom(redis, userId, roomId)) {
//     return false;
//   }
//   const roomType = await redis.hget(roomInfoKey(roomId), "type");
//   if (roomType === "public") {
//     return true;
//   }
//   if (
//     (await isMember(redis, userId, roomId)) ||
//     (await model.isCreator(redis, userId, roomId))
//   ) {
//     return true;
//   }

//   return false;
// }

// export async function addUserToRoom(
//   redis: FastifyRedis,
//   userId: UserId,
//   creatorId: UserId,
//   roomId: RoomId
// ) {
//   if (await model.isCreator(redis, creatorId, roomId)) {
//     const account = await readAccount(
//       redis,
//       { properties: [accountFields.properties.isCanAddToRoom] },
//       creatorId,
//       userId
//     );
//     if (account.get(accountFields.properties.isCanAddToRoom)) {
//       await model.addUser(redis, userId, roomId);
//       return true;
//     } else return false;
//   }
// }

// export async function removeUserFromRoom(
//   redis: FastifyRedis,
//   userId: UserId,
//   targetUserId: UserId,
//   roomId: RoomId
// ) {
//   if (userId === targetUserId || (await isCreator(redis, userId, roomId))) {
//     await redis.srem(roomUsersKey(roomId), targetUserId);
//     await redis.srem(userRoomsSetKey(userId), roomId);
//   }
// }

// export async function blockUser(
//   redis: FastifyRedis,
//   userId: UserId,
//   creatorId: UserId,
//   roomId: RoomId
// ) {
//   if (await isCreator(redis, creatorId, roomId)) {
//     await redis.sadd(roomBlockedUsersKey(roomId), userId);
//     await removeUserFromRoom(redis, creatorId, userId, roomId);
//   }
// }

// export async function unblockUser(
//   redis: FastifyRedis,
//   userid: UserId,
//   creatorId: UserId,
//   roomId: RoomId
// ) {
//   if (await isCreator(redis, creatorId, roomId)) {
//     await redis.srem(roomBlockedUsersKey(roomId), userid);
//   }
// }

// export async function isMember(
//   redis: FastifyRedis,
//   userId: UserId,
//   roomId: RoomId
// ) {
//   return await redis.sismember(roomUsersKey(roomId), userId);
// }
