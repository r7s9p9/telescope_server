import { FastifyRedis } from "@fastify/redis";
import { RoomId, UserId } from "../types";
import {
  roomBlockedUsersKey,
  roomInfoFields,
  roomInfoKey,
  roomTypeValues,
  roomUsersKey,
  userRoomsSetKey,
} from "./room.constants";
import {
  CreateRoomInfo,
  ReadRoomInfoResult,
  ReadRoomInfoValues,
  RoomInfoValues,
  WriteRoomInfo,
  WriteRoomResult,
} from "./room.types";
import { checkUserId } from "../../utils/uuid";

export const model = (redis: FastifyRedis) => {
  function verifierInfoValueWrapper(
    field: keyof typeof roomInfoFields,
    value?: string | null
  ) {
    if (field === roomInfoFields.type) {
      if (
        value === roomTypeValues.private ||
        value === roomTypeValues.public ||
        value === roomTypeValues.single
      ) {
        return value;
      }
    }
    if (field === roomInfoFields.creatorId) {
      const correct = checkUserId(value);
      if (correct) {
        return value;
      }
    }
    if (
      (field === roomInfoFields.name || field === roomInfoFields.about) &&
      value
    ) {
      return value;
    }
    return null;
  }

  async function createRoom(
    roomId: RoomId,
    userIdArr: UserId[],
    roomInfo: CreateRoomInfo
  ) {
    const { name, creatorId, type, about } = await updateRoomInfo(
      roomId,
      roomInfo
    );
    const user = await addUsers(roomId, userIdArr);
    if (name && creatorId && type && about && user) {
      return true;
    }
    await deleteRoom(roomId);
    return false;
  }

  async function deleteRoom(roomId: RoomId) {
    await redis.del(roomInfoKey(roomId));
    await redis.del(roomUsersKey(roomId));
    await redis.del(roomBlockedUsersKey(roomId));
  }

  async function readRoomInfo(
    roomId: RoomId,
    toRead: Array<ReadRoomInfoValues>
  ): Promise<ReadRoomInfoResult> {
    const result = Object.create(null);
    for (const fieldToRead of toRead) {
      const value = await redis.hget(roomInfoKey(roomId), fieldToRead);
      result[fieldToRead] = verifierInfoValueWrapper(fieldToRead, value);
    }
    return result;
  }

  async function updateRoomInfo(roomId: RoomId, roomInfo: WriteRoomInfo) {
    const result: WriteRoomResult = Object.create(null);
    let key: keyof WriteRoomInfo;
    for (key in roomInfo) {
      const value = verifierInfoValueWrapper(roomInfoFields[key], key);
      if (value) {
        result[key] = await updateRoomInfoValue(
          roomId,
          roomInfoFields.name,
          value
        );
      } else {
        result[key] = false;
      }
    }
    return result;
  }

  async function updateRoomInfoValue(
    roomId: RoomId,
    fieldToWrite: keyof WriteRoomInfo,
    value: string
  ) {
    const result = await redis.hset(roomInfoKey(roomId), fieldToWrite, value);
    if (result === 0 || result === 1) {
      return true;
    }
    return false;
  }

  async function isCreator(roomId: RoomId, userId: UserId) {
    return (
      userId ===
      (await redis.hget(roomInfoKey(roomId), roomInfoFields.creatorId))
    );
  }

  async function readUsers(roomId: RoomId) {
    return await redis.smembers(roomUsersKey(roomId));
  }

  async function isUserInRoomSet(roomId: RoomId, userId: UserId) {
    return (await redis.sismember(roomUsersKey(roomId), userId)) === 1;
  }

  async function readUserRooms(userId: UserId) {
    return await redis.smembers(userRoomsSetKey(userId));
  }

  async function isRoomInUserSet(roomId: RoomId, userId: UserId) {
    return (await redis.sismember(userRoomsSetKey(userId), roomId)) === 1;
  }

  async function addUsers(roomId: RoomId, userIdArr: UserId[]) {
    const addedUsers: UserId[] = [];
    for (const userId of userIdArr) {
      const addToUserSet =
        (await redis.sadd(roomUsersKey(roomId), userId)) === 1;
      const addToRoomSet =
        (await redis.sadd(userRoomsSetKey(userId), roomId)) === 1;
      if (addToUserSet && addToRoomSet) {
        // Already added users will not appear as added (true)
        addedUsers.push(userId);
      }
    }
    return addedUsers;
  }

  async function removeUsers(roomId: RoomId, userIdArr: UserId[]) {
    const removedUsers: UserId[] = [];
    for (const userId of userIdArr) {
      const removedFromRoomSet =
        (await redis.srem(roomUsersKey(roomId), userIdArr)) === 1;
      const removedFromUserSet =
        (await redis.srem(userRoomsSetKey(userId), roomId)) === 1;
      if (removedFromRoomSet && removedFromUserSet) {
        // Already removed users will not appear as added (true)
        removedUsers.push(userId);
      }
    }
    return removedUsers;
  }

  async function isUserBlocked(roomId: RoomId, userId: UserId) {
    return !!(await redis.sismember(roomBlockedUsersKey(roomId), userId));
  }

  async function blockUsers(roomId: RoomId, userIdArr: UserId[]) {
    const blockedUsers: UserId[] = [];
    for (const userId of userIdArr) {
      const blocked =
        (await redis.sadd(roomBlockedUsersKey(roomId), userIdArr)) === 1;
      if (blocked) {
        // Already blocked users will not appear as added (true)
        blockedUsers.push(userId);
      }
    }
    return blockedUsers;
  }

  async function unblockUsers(roomId: RoomId, userIdArr: UserId[]) {
    const unblockedUsers: UserId[] = [];
    for (const userId of userIdArr) {
      const unblocked =
        (await redis.srem(roomBlockedUsersKey(roomId), userIdArr)) === 1;
      if (unblocked) {
        // Already unblocked users will not appear as added (true)
        unblockedUsers.push(userId);
      }
    }
    return unblockedUsers;
  }

  return {
    createRoom,
    deleteRoom,
    readRoomInfo,
    updateRoomInfo,
    isCreator,
    readUsers,
    isUserInRoomSet,
    readUserRooms,
    isRoomInUserSet,
    addUsers,
    removeUsers,
    isUserBlocked,
    blockUsers,
    unblockUsers,
  };
};
