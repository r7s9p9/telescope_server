import { FastifyRedis } from "@fastify/redis";
import { RoomId, UserId } from "../types";
import {
  roomBlockedUsersKey,
  roomInfoFields,
  roomInfoKey,
  roomInfoStartValues,
  roomKey,
  roomUsersKey,
  singleRoomInfoKey,
  singleRoomKey,
  userRoomsSetKey,
} from "./room.constants";
import { RoomInfoValues } from "./room.types";

// async function createSingleRoom(
//   redis: FastifyRedis,
//   roomId: RoomId,
//   roomInfo: RoomInfoValues
// ) {
//   await redis.hmset(
//     singleRoomInfoKey(roomInfo.creatorId, roomId),
//     roomInfoStartValues(roomInfo)
//   );
//   // room id in Set user:userId:rooms:all
//   await redis.sadd(
//     userRoomsSetKey(roomInfo.creatorId),
//     singleRoomKey(roomInfo.creatorId, roomId)
//   );
// }

// async function createRoom(
//   redis: FastifyRedis,
//   userSet: Set<UserId>,
//   roomId: RoomId,
//   roomInfo: RoomInfoValues
// ) {
//   for (const userId of userSet) {
//     addUser(redis, userId, roomId);
//   }
//   // Create info about room
//   await redis.hmset(roomInfoKey(roomId), roomInfoStartValues(roomInfo));
// }

async function isUserBlocked(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  return !!(await redis.sismember(roomBlockedUsersKey(roomId), userId));
}

const model = (redis: FastifyRedis) => {
  async function addRoom(
    userId: UserId,
    roomId: RoomId,
    roomInfo: RoomInfoValues
  ) {
    const addResult = await writeRoomKey(userId, roomId, roomInfo.type);
    const infoResult = await writeRoomInfo(roomId, userId, roomInfo);
  }

  async function writeRoomKey(
    userId: UserId,
    roomId: RoomId,
    type: RoomInfoValues["type"]
  ) {
    let result: number;
    if (type === "single") {
      // Add room key (user:userId:rooms:internal:roomId) to user:userid:rooms:all
      result = await redis.sadd(
        userRoomsSetKey(userId),
        singleRoomKey(userId, roomId)
      );
    }
    if (type === "public" || type === "private") {
      // Add userId to room:users
      await redis.sadd(roomUsersKey(roomId), userId);
      // Add room key (room:roomId) to user:userid:rooms:all
      await redis.sadd(userRoomsSetKey(userId), roomKey(roomId));
    }
  }

  async function writeRoomInfo(
    roomId: RoomId,
    creatorId: UserId,
    roomInfo: RoomInfoValues
  ) {
    let result: "OK" | undefined;
    if (roomInfo.type === "single") {
      result = await redis.hmset(
        singleRoomInfoKey(creatorId, roomId),
        roomInfoStartValues(roomInfo, creatorId)
      );
    }
    if (roomInfo.type === "public" || roomInfo.type === "private") {
      result = await redis.hmset(
        roomInfoKey(roomId),
        roomInfoStartValues(roomInfo, creatorId)
      );
    }
    if (result === "OK") {
      return true;
    }
    return false;
  }
  async function readRoomInfo(userId: UserId, roomId: RoomId) {
    const ban = isUserBlocked(redis, userId, roomId);
    if (!ban) {
      const name = await redis.hget(roomInfoKey(roomId), roomInfoFields.name);
      const creator = await redis.hget(
        roomInfoKey(roomId),
        roomInfoFields.creatorId
      );
      const type = await redis.hget(roomInfoKey(roomId), roomInfoFields.type);
      const about = await redis.hget(roomInfoKey(roomId), roomInfoFields.about);
      return { name, creator, type, about };
    }
  }
  return { addRoom, readRoomInfo };
};

async function isCreator(redis: FastifyRedis, userId: UserId, roomId: RoomId) {
  if (userId === (await redis.hget(roomInfoKey(roomId), "creator"))) {
    return true;
  }
  return false;
}

export { model };
