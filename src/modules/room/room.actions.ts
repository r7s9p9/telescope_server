import { FastifyRedis } from "@fastify/redis";
import crypto from "crypto";
import { isUserBlockedByUser } from "../account/account.actions";
import {
  UserId,
  UserIdArr,
  RoomId,
  RoomInfo,
  Message,
  MessageContent,
} from "../types";
import {
  userRoomsSetKey,
  personalRoomKey,
  serviceRoomKey,
  roomKey,
  roomInfoKey,
  roomUsersKey,
  roomBlockedUsersKey,
  serviceRoomName,
  personalRoomName,
  welcomeServiceRoomMessage,
  welcomePersonalRoomMessage,
} from "../constants";

// user:userid:rooms:all                        User rooms              (Set)
// user:userid:rooms:internal:Telescope         App messages            (Sorted Set)
// user:userid:rooms:internal:Saved Messages    Self messages           (Sorted Set)

export async function createInternalRooms(redis: FastifyRedis, userId: UserId) {
  async function createServiceRoom(redis: FastifyRedis, userId: UserId) {
    const appFirstMessage = {
      author: serviceRoomName,
      content: {
        text: welcomeServiceRoomMessage,
      },
    };

    await redis.zadd(
      serviceRoomKey(userId),
      Date.now(),
      JSON.stringify(appFirstMessage)
    );
  }

  async function createPersonalRoom(redis: FastifyRedis, userId: UserId) {
    const selfRoomFirstMessage = {
      author: personalRoomName,
      content: {
        text: welcomePersonalRoomMessage,
      },
    };

    await redis.zadd(
      personalRoomKey(userId),
      Date.now(),
      JSON.stringify(selfRoomFirstMessage)
    );
  }

  await redis.sadd(
    userRoomsSetKey(userId),
    serviceRoomKey(userId),
    personalRoomKey(userId)
  );

  await createServiceRoom(redis, userId);
  await createPersonalRoom(redis, userId);
}

export async function createRoom(
  redis: FastifyRedis,
  creatorId: UserId,
  userIdArr: UserIdArr,
  info: RoomInfo
) {
  if (!creatorId || !userIdArr[0]) {
    return false;
  }

  const roomid = crypto.randomUUID();

  await redis.hmset(
    roomInfoKey(roomid),
    "name",
    info.name,
    "creator",
    creatorId,
    "type",
    info.type,
    "about",
    info.about
  );

  for (const userId of userIdArr) {
    // Did the user ban the creator?
    if (
      userId === creatorId ||
      !(await isUserBlockedByUser(redis, creatorId, userId))
    ) {
      // room:roomid:users
      await redis.sadd(roomUsersKey(roomid), userId);

      // user:userid:rooms:all:roomid
      await redis.sadd(userRoomsSetKey(userId), roomid);
    }
  }
}

export async function deleteRoom(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  const creatorid = await redis.hget(roomInfoKey(roomId), "creator");
  if (creatorid === userId) {
    await redis.del(roomKey(roomId));
    await redis.del(roomInfoKey(roomId));
    await redis.del(roomUsersKey(roomId));
    return true;
  }
  return false;
}

export async function updateRoom(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId,
  info: RoomInfo
) {
  if (await isCreator(redis, userId, roomId)) {
    if (info.name) {
      await redis.hset(roomKey(roomId), info.name);
    }
    if (info.type) {
      await redis.hset(roomKey(roomId), info.type);
    }
    if (info.about) {
      await redis.hset(roomKey(roomId), info.about);
    }
    return true;
  }
  return false;
}

export async function readRoomInfo(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  if (await checkAccessToRoom(redis, userId, roomId)) {
    const roomInfo = await redis.hmget(
      roomInfoKey(roomId),
      "name",
      "creator",
      "type",
      "about"
    );
    return roomInfo;
  }
  return false;
}

export async function readRoomUsers(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  if (await checkAccessToRoom(redis, userId, roomId)) {
    return await redis.smembers(roomUsersKey(roomId));
  }
  return false;
}

export async function readRoomUserCount(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  if (await checkAccessToRoom(redis, userId, roomId)) {
    return false;
  }
  return await redis.scard(roomUsersKey(roomId));
}

export async function readRoomContent(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId,
  position: number,
  range: number
) {
  if (await checkAccessToRoom(redis, userId, roomId)) {
    const startIndex = position;
    const stopIndex = position + range;
    return await redis.zrevrange(roomKey(roomId), startIndex, stopIndex);
  }
}

export async function addMessage(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId,
  content: MessageContent
) {
  if (await checkAccessToPosting(redis, userId, roomId)) {
    const message: Message = {
      author: userId,
      content: content,
    };

    await redis.zadd(roomKey(roomId), Date.now(), JSON.stringify(message));
  }
}

export async function checkAccessToPosting(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  if (await checkAccessToRoom(redis, userId, roomId)) {
    return await redis.sismember(roomUsersKey(roomId), userId);
  }
}

export async function checkAccessToRoom(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  if (await isUserBlockedInRoom(redis, userId, roomId)) {
    return false;
  }
  const roomType = await redis.hget(roomInfoKey(roomId), "type");
  if (roomType === "public") {
    return true;
  }
  if (
    (await isMember(redis, userId, roomId)) ||
    (await isCreator(redis, userId, roomId))
  ) {
    return true;
  }

  return false;
}

export async function addUserToRoom(
  redis: FastifyRedis,
  userId: UserId,
  creatorId: UserId,
  roomId: RoomId
) {
  if (await isCreator(redis, creatorId, roomId)) {
    if (!(await isUserBlockedInRoom(redis, userId, roomId))) {
      // Did the user ban the creator?
      if (await isUserBlockedByUser(redis, creatorId, userId)) {
        return false;
      }
      await redis.sadd(roomUsersKey(roomId), userId);
      await redis.sadd(userRoomsSetKey(userId), roomId);
      return true;
    }
  }
  return false;
}

export async function removeUserFromRoom(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId,
  roomId: RoomId
) {
  if (userId === targetUserId || (await isCreator(redis, userId, roomId))) {
    await redis.srem(roomUsersKey(roomId), targetUserId);
    await redis.srem(userRoomsSetKey(userId), roomId);
  }
}

export async function blockUser(
  redis: FastifyRedis,
  userId: UserId,
  creatorId: UserId,
  roomId: RoomId
) {
  if (await isCreator(redis, creatorId, roomId)) {
    await redis.sadd(roomBlockedUsersKey(roomId), userId);
    await removeUserFromRoom(redis, creatorId, userId, roomId);
  }
}

export async function unblockUser(
  redis: FastifyRedis,
  userid: UserId,
  creatorId: UserId,
  roomId: RoomId
) {
  if (await isCreator(redis, creatorId, roomId)) {
    await redis.srem(roomBlockedUsersKey(roomId), userid);
  }
}

export async function isUserBlockedInRoom(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  return await redis.sismember(roomBlockedUsersKey(roomId), userId);
}

export async function isCreator(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  if (userId === (await redis.hget(roomInfoKey(roomId), "creator"))) {
    return true;
  }
  return false;
}

export async function isMember(
  redis: FastifyRedis,
  userId: UserId,
  roomId: RoomId
) {
  return await redis.sismember(roomUsersKey(roomId), userId);
}
