import { FastifyRedis } from "@fastify/redis";
import { RoomId, UserId } from "../types";
import {
  RoomInfoValues,
  roomBlockedUsersKey,
  roomInfoFields,
  roomInfoKey,
  roomInfoStartValues,
  roomUsersKey,
  singleRoomInfoKey,
  singleRoomKey,
  userRoomsSetKey,
} from "./room.constants";

async function createSingleRoom(
  redis: FastifyRedis,
  creatorId: UserId,
  roomId: RoomId,
  roomInfo: RoomInfoValues
) {
  await redis.hmset(
    singleRoomInfoKey(creatorId, roomId),
    roomInfoStartValues(roomInfo)
  );
  // room id in Set user:userId:rooms:all
  await redis.sadd(
    userRoomsSetKey(creatorId),
    singleRoomKey(creatorId, roomId)
  );
}

async function createRoom(
  redis: FastifyRedis,
  userSet: Set<UserId>,
  roomId: RoomId,
  roomInfo: RoomInfoValues
) {
  for (const userId of userSet) {
    addUser(redis, userId, roomId);
  }
  // Create info about room
  await redis.hmset(roomInfoKey(roomId), roomInfoStartValues(roomInfo));
}

async function isUserBlocked(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  return !!(await redis.sismember(roomBlockedUsersKey(roomId), userId));
}

export const model = (redis: FastifyRedis) => {
  async function createSingleRoom(
    creatorId: UserId,
    roomId: RoomId,
    roomInfo: RoomInfoValues
  ) {
    const infoResult = await redis.hmset(
      singleRoomInfoKey(creatorId, roomId),
      roomInfoStartValues(roomInfo)
    );
    const addToUserResult = await redis.sadd(
      userRoomsSetKey(creatorId),
      singleRoomKey(creatorId, roomId)
    );
    if (infoResult === "OK" || addToUserResult === 1) {
      return true;
    }
  }

  async function createRoom(
    userSet: Set<UserId>,
    roomId: RoomId,
    roomInfo: RoomInfoValues
  ) {
    for (const userId of userSet) {
      const addResult = await addUser(redis, userId, roomId);
    }
    // Create info about room
    const infoResult = await redis.hmset(
      roomInfoKey(roomId),
      roomInfoStartValues(roomInfo)
    );
  }
  return { createSingleRoom, createRoom };
};

async function readRoomInfo(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  const ban = isUserBlocked(redis, userId, roomId);
  if (!ban) {
    const name = await redis.hget(roomInfoKey(roomId), roomInfoFields.name);
    const creator = await redis.hget(
      roomInfoKey(roomId),
      roomInfoFields.creator
    );
    const type = await redis.hget(roomInfoKey(roomId), roomInfoFields.type);
    const about = await redis.hget(roomInfoKey(roomId), roomInfoFields.about);
    return { name, creator, type, about };
  }
}

async function addUser(redis: FastifyRedis, userId: UserId, roomId: RoomId) {
  // Add userId to Room Set containing users
  await redis.sadd(roomUsersKey(roomId), userId);
  // Add roomId to User's Set containing rooms
  await redis.sadd(userRoomsSetKey(userId), roomId);
}

async function isCreator(redis: FastifyRedis, userId: UserId, roomId: RoomId) {
  if (userId === (await redis.hget(roomInfoKey(roomId), "creator"))) {
    return true;
  }
  return false;
}

export { createSingleRoom, createRoom, addUser, isCreator };
