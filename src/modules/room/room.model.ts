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
  RoomInfoInternal,
  ReadRoomInfoResult,
  ReadRoomInfoValues,
  RoomInfoValues,
  RoomInfoToUpdate,
  RoomInfoUpdateResult,
} from "./room.types";
import { checkRoomId, checkUserId } from "../../utils/uuid";

export const model = (redis: FastifyRedis) => {
  async function touchCreatedDate(roomId: RoomId) {
    const created = Number(Date.now());
    const result = await redis.hset(
      roomInfoKey(roomId),
      roomInfoFields.created,
      created
    );
    if (result === 1) return true as const;
    return false as const;
  }

  async function createRoom(
    roomId: RoomId,
    userIdArr: UserId[],
    roomInfo: RoomInfoInternal
  ) {
    const undoChanges = async () => {
      await deleteRoom(roomId);
      return false as const;
    };

    const dateSuccess = await touchCreatedDate(roomId);
    if (!dateSuccess) return await undoChanges();

    const infoSuccess = await updateRoomInfo(roomId, roomInfo);
    if (!infoSuccess) return await undoChanges();

    const userArr = await addUsers(roomId, userIdArr);
    if (userArr.length === 0) return await undoChanges();

    return true as const;
  }

  async function deleteRoom(roomId: RoomId) {
    const infoResult = (await redis.del(roomInfoKey(roomId))) === 1;
    const usersResult = (await redis.del(roomUsersKey(roomId))) === 1;
    //const blockedResult = (await redis.del(roomBlockedUsersKey(roomId))) === 1;
    // TODO need to know if there no blocked key (no banned users)
    return {
      info: infoResult,
      users: usersResult,
      //blocked: blockedResult,
    };
  }

  async function readRoomInfo(
    roomId: RoomId,
    toRead: Array<ReadRoomInfoValues>
  ): Promise<ReadRoomInfoResult> {
    const result = Object.create(null);
    for (const field of toRead) {
      const value = await redis.hget(roomInfoKey(roomId), field);
      if (!value) continue;
      result[field] = value;
    }
    result.roomId = roomId;
    return result;
  }

  async function updateRoomInfo(roomId: RoomId, roomInfo: RoomInfoToUpdate) {
    let success = true;
    let key: string;
    let value: keyof RoomInfoToUpdate;
    for ([key, value] of Object.entries(roomInfo)) {
      const result = await redis.hset(roomInfoKey(roomId), key, value);
      if (result === 1 || result === 0) continue;
      success = false;
      break;
    }
    return success;
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
    const roomIdArr = await redis.smembers(userRoomsSetKey(userId));
    const result: RoomId[] = [];
    for (const roomId of roomIdArr) {
      if (checkRoomId(roomId)) {
        result.push(roomId);
      }
    }
    return result;
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
      const remFromRoomSet =
        (await redis.srem(roomUsersKey(roomId), userIdArr)) === 1;
      const remFromUserSet =
        (await redis.srem(userRoomsSetKey(userId), roomId)) === 1;
      if (remFromRoomSet && remFromUserSet) {
        // Already removed users will not push
        removedUsers.push(userId);
      }
    }
    return removedUsers;
  }

  async function isUserBlocked(roomId: RoomId, userId: UserId) {
    return !!(await redis.sismember(roomBlockedUsersKey(roomId), userId));
  }

  async function blockUsers(roomId: RoomId, userIdArr: UserId[]) {
    const { creatorId } = await readRoomInfo(roomId, [
      roomInfoFields.creatorId,
    ]);
    const blockedUsers: UserId[] = [];

    for (const userId of userIdArr) {
      if (userId === creatorId) continue;
      const success =
        (await redis.sadd(roomBlockedUsersKey(roomId), userIdArr)) === 1;
      if (!success) continue;
      // Already blocked users will not appear as added (true)
      blockedUsers.push(userId);
    }
    return blockedUsers;
  }

  async function unblockUsers(roomId: RoomId, userIdArr: UserId[]) {
    const unblockedUsers: UserId[] = [];
    for (const userId of userIdArr) {
      const success =
        (await redis.srem(roomBlockedUsersKey(roomId), userIdArr)) === 1;
      if (!success) continue;
      // Already unblocked users will not appear as added (true)
      unblockedUsers.push(userId);
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
