import { FastifyRedis } from "@fastify/redis";
import { UserId, RoomId } from "../types";
import {
  payloadLackOfPermissionToJoin,
  payloadLackOfPermissionToGetMembers,
  payloadLackOfPermissionToUpdate,
  payloadNoCreator,
  payloadNoOneBlocked,
  payloadNoOneInvited,
  payloadSuccessOfCreatingRoom,
  payloadSuccessOfInvite,
  payloadSuccessOfJoining,
  payloadSuccessOfLeave,
  payloadSuccessOfUpdateRoom,
  payloadSuccessfulGetMembers,
  payloadSuccessfulBlockUsers,
  payloadYouAreNoLongerInRoom,
  roomInfoFields,
  roomTypeValues,
  serviceRoomName,
  payloadSuccessfulKickUsers,
  payloadNoOneKicked,
  payloadSuccessfulDeleteRoom,
  payloadRoomNotCompletelyDeleted,
  payloadSuccessfulUnblockUsers,
  payloadNoOneUnblocked,
  payloadNoJoined,
  serviceRoomAbout,
  welcomeServiceRoomMessage,
  welcomeSingleRoomMessage,
  welcomeRegularRoomMessage,
  payloadRoomInfoNotUpdated,
  userKickedOutMessage,
  userBlockedMessage,
  userUnblockedMessage,
  userInvitedMessage,
  userJoinedMessage,
  userLeavedMessage,
  payloadNoRoomsFound,
  payloadSuccessfulReadMyRooms,
  payloadSuccessOfReadRoomInfo,
  payloadLackOfPermissionToReadRoomInfo,
  payloadNoSuccessfulReadRoomInfo,
  roomInfoUpdatedMessage,
  payloadSearchEmpty,
  payloadSearch,
  payloadNoMembers,
  payloadLackOfPermissionToGetBlockedUsers,
  payloadLackOfPermissionToSearchUsersToInvite,
  payloadNoBlockedUsers,
  payloadSuccessfulGetBlockedUsers,
  payloadNoUsersToInvite,
  payloadSearchUsersToInvite,
} from "./room.constants";
import { account } from "../account/account.controller";
import { accountFields } from "../account/account.constants";
import { model } from "./room.model";
import { randomUUID } from "crypto";
import { payloadServerError } from "../constants";
import { checkRoomId, checkUserId } from "../../utils/uuid";
import { message } from "./message/message.controller";
import { InfoType, infoSchema } from "./room.schema";
import { Message } from "./message/message.schema";
import { confirmationCodeMessage } from "../auth/auth.constants";
import { AccountReadResult } from "../account/account.types";

function infoValidator(info: object) {
  const result = infoSchema.safeParse(info);
  if (!result.success) {
    return { success: result.success, error: result.error };
  }
  return { success: result.success, data: result.data as InfoType };
}

function datesComparator(
  a: { lastMessage?: Message },
  b: { lastMessage?: Message }
) {
  const aCreated = a.lastMessage?.created;
  const bCreated = b.lastMessage?.created;
  const aExist = !!aCreated;
  const bExist = !!bCreated;
  if (aExist && bExist) {
    if (aCreated > bCreated) {
      return -1;
    } else {
      return 1;
    }
  }
  if (aExist && !bExist) return -1;
  if (!aExist && bExist) return 1;
  return 0;
}

export const room = (redis: FastifyRedis, isProd: boolean) => {
  const accountAction = account(redis, isProd).internal();
  const messageAction = message(redis, isProd).internal();
  const m = model(redis);

  const internal = () => {
    const isInviteAllowed = async (targetUserId: UserId, userId: UserId) => {
      return await accountAction.permissionChecker(
        userId,
        targetUserId,
        accountFields.permission.isCanInviteToRoom
      );
    };

    const isBlocked = async (roomId: RoomId, userId: UserId) => {
      return await m.isUserBlocked(roomId, userId);
    };

    const isMember = async (roomId: RoomId, userId: UserId) => {
      return await m.isUserInRoomSet(roomId, userId);
    };

    const isCreator = async (roomId: RoomId, userId: UserId) => {
      return await m.isCreator(roomId, userId);
    };

    const isPublicRoom = async (roomId: RoomId) => {
      const { success, data } = await readInfo(roomId, [roomInfoFields.type]);
      if (success && data.type === roomTypeValues.public) return true as const;
      return false as const;
    };

    const isAllowedBySoftRule = async (roomId: RoomId, userId: UserId) => {
      if (await isBlocked(roomId, userId)) return false as const;

      if (await isPublicRoom(roomId)) return true as const;

      if (await isMember(roomId, userId)) return true as const;

      if (await isCreator(roomId, userId)) return true as const;

      return false as const;
    };

    const isAllowedByHardRule = async (roomId: RoomId, userId: UserId) => {
      if (await isBlocked(roomId, userId)) return false as const;

      if (await isMember(roomId, userId)) return true as const;

      return false as const;
    };

    const getReadyToInviteUserIdArr = async (
      initiatorUserId: UserId,
      userIds?: UserId[]
    ) => {
      const usersExist = userIds && userIds.length > 0;
      if (!usersExist) return [];

      const result: UserId[] = [];
      for (const userId of userIds) {
        if (await isInviteAllowed(initiatorUserId, userId)) {
          result.push(userId);
        }
      }
      return result;
    };

    async function changeVisibility(roomId: RoomId, type: InfoType["type"]) {
      if (type === roomTypeValues.public) await m.addRoomId(roomId);
      if (type !== roomTypeValues.public) await m.removeRoomId(roomId);
    }

    async function handleCodeRequest(userId: UserId, code: number) {
      const { success, roomId } = await readServiceRoomId(userId);
      if (!success) return false as const;
      const isUserInRoom = await m.isUserInRoomSet(roomId, userId);
      if (!isUserInRoom) await m.addUsers(roomId, [userId]);
      return await messageAction.addByService(
        roomId,
        confirmationCodeMessage(code)
      );
    }

    async function getRoomIds() {
      const roomIds: Set<RoomId> = new Set();
      let [cursor, elements] = await m.scanRoomIds();

      // Add roomIds from first response
      for (const roomId of elements) {
        if (!checkRoomId(roomId)) continue;
        roomIds.add(roomId);
      }
      if (cursor === "0") return roomIds;
      // Until the cursor becomes 0, add roomIds
      while (cursor !== "0") {
        [cursor, elements] = await m.scanRoomIds(cursor);
        for (const roomId of elements) {
          if (!checkRoomId(roomId)) continue;
          roomIds.add(roomId);
        }
      }
      return roomIds;
    }

    async function createServiceRoom(userId: UserId) {
      const info: Omit<InfoType, "created" | "userCount"> = {
        name: serviceRoomName,
        type: roomTypeValues.service,
        about: serviceRoomAbout,
        creatorId: roomTypeValues.service,
      };
      const roomId = randomUUID();
      const success = await m.createRoom(roomId, [userId], info);
      if (!success) return false as const;

      // To find the service roomId when receiving a confirmation code:
      const roomSuccess = await m.createServiceRoomId(userId, roomId);
      if (!roomSuccess) {
        await m.deleteRoom(roomId);
        return false as const;
      }

      await messageAction.addByService(roomId, welcomeServiceRoomMessage);
      return true as const;
    }

    async function createSingleRoom(
      roomId: RoomId,
      creatorId: UserId,
      info: Omit<InfoType, "created" | "creatorId" | "userCount">
    ) {
      // creatorId will added as member
      const success = await m.createRoom(roomId, [creatorId], {
        ...info,
        creatorId,
      });
      if (!success) return false as const;
      await messageAction.addByService(roomId, welcomeSingleRoomMessage);
      return true as const;
    }

    async function readServiceRoomId(userId: UserId) {
      const roomId = await m.readServiceRoomId(userId);
      if (!checkRoomId(roomId)) {
        return { success: false as const };
      }
      return { success: true as const, roomId: roomId };
    }

    async function createRegularRoom(
      roomId: RoomId,
      creatorId: UserId,
      info: Omit<InfoType, "created" | "creatorId" | "userCount">,
      userIdArr?: UserId[]
    ) {
      const allowedUserIdArr = await internal().getReadyToInviteUserIdArr(
        creatorId,
        userIdArr
      );
      // creatorId will added as member
      allowedUserIdArr.push(creatorId);
      const success = await m.createRoom(roomId, allowedUserIdArr, {
        ...info,
        creatorId,
      });
      if (!success) return false as const;
      // add roomId to public set
      if (info.type === roomTypeValues.public) await m.addRoomId(roomId);
      await messageAction.addByService(roomId, welcomeRegularRoomMessage);
      return true as const;
    }

    async function create(
      creatorId: UserId,
      info: Omit<InfoType, "created" | "creatorId" | "userCount">,
      userIdArr?: UserId[]
    ) {
      const roomId: RoomId = randomUUID();
      const isSingle = info.type === roomTypeValues.single;

      if (isSingle) {
        const success = await createSingleRoom(roomId, creatorId, info);
        if (!success) return { success: false as const };
        return { success: true as const, roomId: roomId };
      }

      const success = await createRegularRoom(
        roomId,
        creatorId,
        info,
        userIdArr
      );
      if (!success) return { success: false as const };
      return { success: true as const, roomId: roomId };
    }

    async function search(
      userId: UserId,
      limit: number,
      offset: number,
      q: string
    ) {
      const roomIds = await getRoomIds();
      const result: InfoType[] & { roomId: RoomId }[] = [];
      let count = 0;
      for (const roomId of roomIds) {
        const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
        if (!isAllowed) continue;
        if (count < offset) {
          count++;
          continue;
        }
        const { success, data } = await readInfo(roomId, [
          roomInfoFields.name,
          roomInfoFields.userCount,
        ]);
        if (!success) continue;
        if (data.name?.includes(q)) {
          result.push({ ...data, roomId });
          count++;
        }
        if (count >= limit + offset) break;
      }
      return result;
    }

    async function searchUsersToInvite(
      roomId: RoomId,
      userId: UserId,
      limit: number,
      offset: number,
      q: string
    ) {
      const users = await accountAction.search(
        userId,
        limit,
        offset,
        q,
        {
          general: [
            accountFields.general.username,
            accountFields.general.name,
            accountFields.general.lastSeen,
          ],
        },
        accountFields.permission.isCanInviteToRoom
      );

      const result: AccountReadResult[] = [];

      for (const user of users) {
        if (await isBlocked(roomId, user.targetUserId as UserId)) {
          continue;
        }
        result.push(user);
      }

      return result;
    }

    async function invite(
      roomId: RoomId,
      initiatorUserId: UserId,
      userIds: UserId[]
    ) {
      const allowedUserIds = await getReadyToInviteUserIdArr(
        initiatorUserId,
        userIds
      );

      const notBlockedUserIds: UserId[] = [];

      for (const userId of allowedUserIds) {
        if (await isBlocked(roomId, userId as UserId)) {
          continue;
        }
        notBlockedUserIds.push(userId);
      }

      const addedUserIds = await m.addUsers(roomId, notBlockedUserIds);
      if (addedUserIds.length === 0) return { success: false as const };
      for (const userId of addedUserIds) {
        await messageAction.addByService(roomId, userInvitedMessage, userId);
      }
      return { success: true as const, userIds: addedUserIds };
    }

    async function readInfo(
      roomId: RoomId,
      toRead: Array<keyof InfoType>,
      userId?: UserId
    ) {
      const info = await m.readRoomInfo(
        roomId,
        toRead.filter((field) => field !== "userCount") as Array<
          keyof Omit<InfoType, "userCount">
        >
      );

      if (toRead.includes("userCount")) {
        info.userCount = await m.getUserCount(roomId);
      }

      if (toRead.includes("isMember") && userId) {
        info.isMember = await isMember(roomId, userId);
      }

      // Mask creatorId if user is creator
      if (userId && toRead.includes("creatorId") && info.creatorId === userId) {
        info.creatorId = "self";
      }

      return infoValidator(info);
    }

    async function updateInfo(
      roomId: RoomId,
      info: Partial<Omit<InfoType, "created" | "userCount">>
    ) {
      const success = await m.updateRoomInfo(roomId, info);
      if (success) {
        if (info.type) changeVisibility(roomId, info.type);
        await messageAction.addByService(roomId, roomInfoUpdatedMessage);
        return true as const;
      }
      return false as const;
    }

    async function kick(roomId: RoomId, userIds: UserId[]) {
      const result = await m.removeUsers(roomId, userIds);
      if (result.length === 0) return { success: false as const };
      for (const userId of userIds) {
        await messageAction.addByService(roomId, userKickedOutMessage, userId);
      }
      return { success: true as const, userIds: result };
    }

    async function getBlockedUsers(roomId: RoomId, userId: UserId) {
      const userIds = await m.getBlockedUsers(roomId);
      if (userIds.length === 0) return { isEmpty: true as const };

      const users: AccountReadResult[] = [];
      for (const targetUserId of userIds) {
        if (checkUserId(targetUserId)) {
          const info = await accountAction.read(userId, targetUserId, {
            general: [
              accountFields.general.username,
              accountFields.general.name,
              accountFields.general.lastSeen,
            ],
          });
          users.push(info);
        }
      }
      if (users.length === 0) return { isEmpty: true as const };

      return { users, isEmpty: false as const };
    }

    async function block(roomId: RoomId, userIdArr: UserId[]) {
      const kickResult = await m.removeUsers(roomId, userIdArr);
      const blockResult = await m.blockUsers(roomId, userIdArr);
      if (kickResult.length !== blockResult.length)
        return { success: false as const };
      if (blockResult.length === 0) return { success: false as const };
      for (const userId of userIdArr) {
        await messageAction.addByService(roomId, userBlockedMessage, userId);
      }
      return { success: true as const, userIdArr: blockResult };
    }

    async function unblock(roomId: RoomId, userIdArr: UserId[]) {
      const result = await m.unblockUsers(roomId, userIdArr);
      if (result.length === 0) return { success: false as const };
      for (const userId of userIdArr) {
        await messageAction.addByService(roomId, userUnblockedMessage, userId);
      }
      return { success: true as const, userIdArr: result };
    }

    async function join(roomId: RoomId, userId: UserId) {
      const [result] = await m.addUsers(roomId, [userId]);
      if (!result) return { success: false as const };
      await messageAction.addByService(roomId, userJoinedMessage, userId);
      return { success: true as const };
    }

    async function leave(roomId: RoomId, userId: UserId) {
      const [result] = await m.removeUsers(roomId, [userId]);
      if (!result) return { success: false as const };
      await messageAction.addByService(roomId, userLeavedMessage, userId);
      return { success: true as const };
    }

    async function overview(
      userId: UserId,
      range: { min: number; max: number }
    ) {
      // Find out what rooms the user has
      const roomIds = await m.readUserRooms(userId);
      if (roomIds.length === 0) return { allCount: roomIds.length };

      // Get roomId, roomInfo, lastMessage using roomIdArr
      const rooms: Array<
        InfoType & {
          roomId: RoomId;
          unreadCount: number;
          lastMessage?: Message;
        }
      > = [];
      for (const roomId of roomIds) {
        const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
        if (!isAllowed) continue;

        const info = await readInfo(
          roomId,
          [
            roomInfoFields.name,
            roomInfoFields.type,
            roomInfoFields.created,
            roomInfoFields.creatorId,
            roomInfoFields.about,
            roomInfoFields.userCount,
            roomInfoFields.isMember,
          ],
          userId
        );
        if (!info.success) continue;

        rooms.push({
          ...info.data,
          roomId,
          userCount: await m.getUserCount(roomId),
          unreadCount: await messageAction.getCountOfUnreadMessages(
            userId,
            roomId
          ),
          lastMessage: await messageAction.readLastMessage(userId, roomId),
        });
      }

      const allCount = rooms.length;
      if (allCount === 0) return { allCount };

      // Sort and slice by range
      rooms.sort(datesComparator);

      return {
        allCount,
        rooms: rooms.slice(range.min, range.max),
      };
    }

    async function getMembers(userId: UserId, roomId: RoomId) {
      const userIds = await m.readUsers(roomId);
      if (userIds.length === 0) return { isEmpty: true as const };

      const users: AccountReadResult[] = [];
      for (const targetUserId of userIds) {
        if (checkUserId(targetUserId)) {
          const info = await accountAction.read(userId, targetUserId, {
            general: [
              accountFields.general.username,
              accountFields.general.name,
              accountFields.general.lastSeen,
            ],
          });
          users.push(info);
        }
      }
      if (users.length === 0) return { isEmpty: true as const };

      return { users, isEmpty: false as const };
    }

    return {
      handleCodeRequest,
      isMember,
      isCreator,
      isAllowedBySoftRule,
      isAllowedByHardRule,
      getReadyToInviteUserIdArr,
      createSingleRoom,
      createRegularRoom,
      createServiceRoom,
      readServiceRoomId,
      search,
      create,
      invite,
      readInfo,
      updateInfo,
      kick,
      getBlockedUsers,
      block,
      unblock,
      join,
      leave,
      overview,
      getMembers,
      searchUsersToInvite,
    };
  };

  const external = () => {
    async function createRoom(
      creatorId: UserId,
      info: Omit<InfoType, "created" | "creatorId" | "userCount">,
      userIds?: UserId[]
    ) {
      const { success, roomId } = await internal().create(
        creatorId,
        info,
        userIds
      );
      if (!success) return payloadServerError(isProd);
      return payloadSuccessOfCreatingRoom(roomId, isProd);
    }

    async function deleteRoom(creatorId: UserId, roomId: RoomId) {
      const creator = await m.isCreator(roomId, creatorId);
      if (!creator) return payloadNoCreator(isProd);

      const result = await m.deleteRoom(roomId);
      // TODO remove all messages
      if (result.info && result.users) {
        return payloadSuccessfulDeleteRoom(roomId, isProd);
      }
      return payloadRoomNotCompletelyDeleted(roomId, result, isProd);
    }

    async function readRoomInfo(userId: UserId, roomId: RoomId) {
      const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
      if (!isAllowed) {
        return payloadLackOfPermissionToReadRoomInfo(roomId, isProd);
      }

      // Values Arr to read passed to internal readRoomInfo func
      const { success, data, error } = await internal().readInfo(
        roomId,
        [
          roomInfoFields.name,
          roomInfoFields.creatorId,
          roomInfoFields.created,
          roomInfoFields.type,
          roomInfoFields.about,
          roomInfoFields.userCount,
          roomInfoFields.isMember,
        ],
        userId
      );
      if (!success) {
        return payloadNoSuccessfulReadRoomInfo(roomId, error, isProd);
      }
      return payloadSuccessOfReadRoomInfo(roomId, data, isProd);
    }

    async function updateRoomInfo(
      userId: UserId,
      roomId: RoomId,
      info: Partial<Omit<InfoType, "created" | "userCount">>
    ) {
      const isCreator = await m.isCreator(roomId, userId);
      if (!isCreator) return payloadLackOfPermissionToUpdate(roomId, isProd);

      const success = await internal().updateInfo(roomId, info);
      if (!success) return payloadRoomInfoNotUpdated(roomId, isProd);
      return payloadSuccessOfUpdateRoom(roomId, isProd);
    }

    async function kickUsers(
      creatorId: UserId,
      roomId: RoomId,
      userIds: UserId[]
    ) {
      const isCreator = await m.isCreator(roomId, creatorId);
      if (!isCreator) return payloadNoCreator(isProd);

      const result = await internal().kick(roomId, userIds);
      if (!result.success) return payloadNoOneKicked(roomId, isProd);
      return payloadSuccessfulKickUsers(roomId, result.userIds, isProd);
    }

    async function blockUsers(
      creatorId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const creator = await m.isCreator(roomId, creatorId);
      if (!creator) return payloadNoCreator(isProd);

      const result = await internal().block(roomId, userIdArr);
      if (!result.success) return payloadNoOneBlocked(roomId, isProd);
      return payloadSuccessfulBlockUsers(roomId, result.userIdArr, isProd);
    }

    async function unblockUsers(
      creatorId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const creator = await m.isCreator(roomId, creatorId);
      if (!creator) return payloadNoCreator(isProd);

      const result = await internal().unblock(roomId, userIdArr);
      if (!result.success) return payloadNoOneUnblocked(roomId, isProd);
      return payloadSuccessfulUnblockUsers(roomId, result.userIdArr, isProd);
    }

    async function inviteUsers(
      userId: UserId,
      roomId: RoomId,
      userIds: UserId[]
    ) {
      const isCreator = await internal().isAllowedByHardRule(roomId, userId);
      if (!isCreator) return payloadNoCreator(isProd);

      const result = await internal().invite(roomId, userId, userIds);
      if (!result.success) return payloadNoOneInvited(roomId, isProd);
      return payloadSuccessOfInvite(roomId, result.userIds, isProd);
    }

    async function getMembers(userId: UserId, roomId: RoomId) {
      const permission = await internal().isAllowedByHardRule(roomId, userId);
      if (!permission)
        return payloadLackOfPermissionToGetMembers(roomId, isProd);

      const { isEmpty, users } = await internal().getMembers(userId, roomId);
      if (isEmpty) return payloadNoMembers(roomId, isProd);

      return payloadSuccessfulGetMembers(roomId, users, isProd);
    }

    async function getBlockedUsers(userId: UserId, roomId: RoomId) {
      const permission = await internal().isCreator(roomId, userId);
      if (!permission) return payloadLackOfPermissionToGetBlockedUsers(isProd);

      const { isEmpty, users } = await internal().getBlockedUsers(
        roomId,
        userId
      );
      if (isEmpty) return payloadNoBlockedUsers(roomId, isProd);

      return payloadSuccessfulGetBlockedUsers(roomId, users, isProd);
    }

    async function joinRoom(userId: UserId, roomId: RoomId) {
      const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
      if (!isAllowed) return payloadLackOfPermissionToJoin(roomId, isProd);

      const success = await internal().join(roomId, userId);
      if (!success) return payloadNoJoined(roomId, isProd);
      return payloadSuccessOfJoining(roomId, isProd);
    }

    async function leaveRoom(userId: UserId, roomId: RoomId) {
      const success = await internal().leave(roomId, userId);
      if (!success) return payloadYouAreNoLongerInRoom(roomId, isProd);
      return payloadSuccessOfLeave(roomId, isProd);
    }

    async function roomsOverview(
      userId: UserId,
      range: { min: number; max: number }
    ) {
      const { rooms, allCount } = await internal().overview(userId, range);
      if (allCount === 0 || !rooms) return payloadNoRoomsFound(isProd);
      return payloadSuccessfulReadMyRooms(rooms, allCount, isProd);
    }

    async function search(
      userId: UserId,
      limit: number,
      offset: number,
      q: string
    ) {
      const rooms = await internal().search(userId, limit, offset, q);
      if (rooms.length === 0 || !rooms) return payloadSearchEmpty(isProd);
      return payloadSearch(rooms, isProd);
    }

    async function searchUsersToInvite(
      userId: UserId,
      roomId: RoomId,
      limit: number,
      offset: number,
      q: string
    ) {
      const permission = await internal().isCreator(roomId, userId);
      if (!permission)
        return payloadLackOfPermissionToSearchUsersToInvite(isProd);

      const result = await internal().searchUsersToInvite(
        roomId,
        userId,
        limit,
        offset,
        q
      );
      if (result.length === 0 || !result) return payloadNoUsersToInvite(isProd);
      return payloadSearchUsersToInvite(result, isProd);
    }

    return {
      search,
      roomsOverview,
      readRoomInfo,
      searchUsersToInvite,
      inviteUsers,
      blockUsers,
      unblockUsers,
      deleteRoom,
      createRoom,
      updateRoomInfo,
      getMembers,
      getBlockedUsers,
      joinRoom,
      leaveRoom,
      kickUsers,
    };
  };

  return {
    internal,
    external,
  };
};
