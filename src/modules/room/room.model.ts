import { FastifyRedis } from "@fastify/redis";
import { RoomId, UserId } from "../types";
import {
  allRoomsKey,
  roomBlockedUsersKey,
  roomInfoFields,
  roomInfoKey,
  roomUsersKey,
  userServiceRoomKey,
} from "./room.constants";
import { checkRoomId } from "../../utils/uuid";
import { userRoomsKey } from "./room.constants";
import { InfoType } from "./room.schema";
import { roomMessagesKey } from "./message/message.constants";

export const model = (redis: FastifyRedis) => {
  async function touchCreatedDate(roomId: RoomId) {
    const result = await redis.hset(
      roomInfoKey(roomId),
      roomInfoFields.created,
      Date.now()
    );
    if (result === 1) return true as const;
    return false as const;
  }

  async function createRoom(
    roomId: RoomId,
    userIds: UserId[],
    info: Omit<InfoType, "created" | "userCount">
  ) {
    const undoChanges = async () => {
      await deleteRoom(roomId);
      return false as const;
    };

    const setResult = await redis.sadd(allRoomsKey(), roomId);
    if (setResult !== 1) return await undoChanges();

    const dateSuccess = await touchCreatedDate(roomId);
    if (!dateSuccess) return await undoChanges();

    const infoSuccess = await updateRoomInfo(roomId, info);
    if (!infoSuccess) return await undoChanges();

    const userArr = await addUsers(roomId, userIds);
    if (userArr.length === 0) return await undoChanges();

    return true as const;
  }

  async function createServiceRoomId(userId: UserId, roomId: RoomId) {
    const result = await redis.set(userServiceRoomKey(userId), roomId);
    if (result !== "OK") {
      await redis.del(userServiceRoomKey(userId), roomId);
      return false as const;
    }
    return true as const;
  }

  async function readServiceRoomId(userId: UserId) {
    return await redis.get(userServiceRoomKey(userId));
  }

  async function deleteRoom(roomId: RoomId) {
    const setResult = (await redis.srem(allRoomsKey(), roomId)) === 1;
    const infoResult = (await redis.del(roomInfoKey(roomId))) === 1;
    const usersResult = (await redis.del(roomUsersKey(roomId))) === 1;
    const messagesResult = (await redis.del(roomMessagesKey(roomId))) === 1;
    //const blockedResult = (await redis.del(roomBlockedUsersKey(roomId))) === 1;
    // TODO need to know if there no blocked key (no banned users)
    return {
      set: setResult,
      info: infoResult,
      users: usersResult,
      messages: messagesResult,
      //blocked: blockedResult,
    };
  }

  async function readRoomInfo(
    roomId: RoomId,
    fields: Array<keyof Omit<InfoType, "userCount">>
  ): Promise<InfoType> {
    const result = Object.create(null);

    for (const field of fields) {
      const value = await redis.hget(roomInfoKey(roomId), field);
      if (!value) continue;
      if (field === "created") {
        result[field] = Number(value);
      } else {
        result[field] = value;
      }
    }

    return result;
  }

  async function scanRoomIds(cursor?: string) {
    return await redis.sscan(allRoomsKey(), cursor ? cursor : "0");
  }

  async function getUserCount(roomId: RoomId) {
    return await redis.scard(roomUsersKey(roomId));
  }

  async function updateRoomInfo(
    roomId: RoomId,
    info: Partial<Omit<InfoType, "created" | "userCount">>
  ) {
    let field: string;
    let value: string;
    for ([field, value] of Object.entries(info)) {
      const result = await redis.hset(roomInfoKey(roomId), field, value);
      if (result === 1 || result === 0) continue;
      return false as const;
    }
    return true as const;
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
    const roomIdArr = await redis.smembers(userRoomsKey(userId));
    const result: RoomId[] = [];
    for (const roomId of roomIdArr) {
      if (checkRoomId(roomId)) {
        result.push(roomId);
      }
    }
    return result;
  }

  async function isRoomInUserSet(roomId: RoomId, userId: UserId) {
    return (await redis.sismember(userRoomsKey(userId), roomId)) === 1;
  }

  async function addUsers(roomId: RoomId, userIds: UserId[]) {
    const addedUserIds: UserId[] = [];
    for (const userId of userIds) {
      const addToUserSet =
        (await redis.sadd(roomUsersKey(roomId), userId)) === 1;
      const addToRoomSet =
        (await redis.sadd(userRoomsKey(userId), roomId)) === 1;
      if (addToUserSet && addToRoomSet) {
        // Already added users will not appear as added (true)
        addedUserIds.push(userId);
      }
    }
    return addedUserIds;
  }

  async function removeUsers(roomId: RoomId, userIds: UserId[]) {
    const removedUserIds: UserId[] = [];
    for (const userId of userIds) {
      const remFromRoomSet =
        (await redis.srem(roomUsersKey(roomId), userIds)) === 1;
      const remFromUserSet =
        (await redis.srem(userRoomsKey(userId), roomId)) === 1;
      if (remFromRoomSet && remFromUserSet) {
        // Already removed users will not push
        removedUserIds.push(userId);
      }
    }
    return removedUserIds;
  }

  async function isUserBlocked(roomId: RoomId, userId: UserId) {
    return !!(await redis.sismember(roomBlockedUsersKey(roomId), userId));
  }

  async function blockUsers(roomId: RoomId, userIds: UserId[]) {
    const { creatorId } = await readRoomInfo(roomId, [
      roomInfoFields.creatorId,
    ]);
    const blockedUserIds: UserId[] = [];

    for (const userId of userIds) {
      if (userId === creatorId) continue;
      const success =
        (await redis.sadd(roomBlockedUsersKey(roomId), userIds)) === 1;
      if (!success) continue;
      // Already blocked users will not appear as added (true)
      blockedUserIds.push(userId);
    }
    return blockedUserIds;
  }

  async function unblockUsers(roomId: RoomId, userIds: UserId[]) {
    const unblockedUserIds: UserId[] = [];
    for (const userId of userIds) {
      const success =
        (await redis.srem(roomBlockedUsersKey(roomId), userIds)) === 1;
      if (!success) continue;
      // Already unblocked users will not appear as added (true)
      unblockedUserIds.push(userId);
    }
    return unblockedUserIds;
  }

  return {
    createRoom,
    createServiceRoomId,
    scanRoomIds,
    readServiceRoomId,
    deleteRoom,
    readRoomInfo,
    getUserCount,
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
