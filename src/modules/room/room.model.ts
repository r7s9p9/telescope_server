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

const updateInfoModifiedDate = async (redis: FastifyRedis, roomId: RoomId) => {
  const date = Date.now().toString();
  await redis.hset(roomInfoKey(roomId), roomInfoFields.modifiedDate, date);
  return date;
};

export const model = (redis: FastifyRedis) => {
  function verifierInfoValueWrapper(
    field: keyof RoomInfoValues,
    value?: string
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
    // value is bad
    return null;
  }

  async function touchCreatedDate(roomId: RoomId) {
    const date = Number(Date.now());
    const result = await redis.hset(
      roomInfoKey(roomId),
      roomInfoFields.createdDate,
      date
    );
    if (result === 1) return { success: true as const, value: date };
    return { success: false as const };
  }

  async function createRoom(
    roomId: RoomId,
    userIdArr: UserId[],
    roomInfo: RoomInfoInternal
  ) {
    const undoChanges = async () => {
      await deleteRoom(roomId);
      return { success: false as const };
    };

    const date = await touchCreatedDate(roomId);
    if (!date.success) return await undoChanges();

    const infoResult = await updateRoomInfo(
      roomId,
      roomInfo,
      true as const // just created
    );
    if (!infoResult.success) return await undoChanges();

    const userArr = await addUsers(roomId, userIdArr);
    const usersSuccess = userArr.length > 0;
    if (!usersSuccess) return await undoChanges();

    return {
      success: true as const,
      createdDate: date.value,
      users: userArr,
    };
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
    let goodCount = 0;
    for (const field of toRead) {
      const value = await redis.hget(roomInfoKey(roomId), field);
      if (!value) continue;
      const validatedValue = verifierInfoValueWrapper(field, value);
      if (!validatedValue) continue;
      result[field] = validatedValue;
      goodCount++;
    }

    result.roomId = roomId;

    if (goodCount > 0) {
      result.success = true as const;
      return result;
    }
    result.success = false as const;
    return result;
  }

  async function updateRoomInfo(
    roomId: RoomId,
    roomInfo: RoomInfoToUpdate,
    justCreated?: boolean
  ) {
    const result: RoomInfoUpdateResult = Object.create(null);
    let isUpdated = false;
    let key: keyof RoomInfoToUpdate;
    for (key in roomInfo) {
      const value = verifierInfoValueWrapper(key, roomInfo[key]);
      if (value) {
        result[key] = await updateRoomInfoValue(
          roomId,
          roomInfoFields[key],
          value
        );
        if (result[key]) {
          isUpdated = true as const;
        }
      } else {
        result[key] = false;
      }
    }
    if (isUpdated && !justCreated) {
      result.modifiedDate = await updateInfoModifiedDate(redis, roomId);
    }
    return { success: isUpdated, roomInfo: result };
  }

  async function updateRoomInfoValue(
    roomId: RoomId,
    fieldToWrite: keyof RoomInfoUpdateResult,
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
    if (await isCreator(roomId, userId)) {
      return false as const;
    }
    return !!(await redis.sismember(roomBlockedUsersKey(roomId), userId));
  }

  async function blockUsers(roomId: RoomId, userIdArr: UserId[]) {
    await removeUsers(roomId, userIdArr);
    const blockedUsers: UserId[] = [];
    const { creatorId } = await readRoomInfo(roomId, [
      roomInfoFields.creatorId,
    ]);
    for (const userId of userIdArr) {
      if (userId !== creatorId) {
        const blocked =
          (await redis.sadd(roomBlockedUsersKey(roomId), userIdArr)) === 1;
        if (blocked) {
          // Already blocked users will not appear as added (true)
          blockedUsers.push(userId);
        }
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
